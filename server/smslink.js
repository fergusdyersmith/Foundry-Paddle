// Texting a caller a link, by asking Kumi to do it.
//
// This server does not hold Twilio credentials and should not start. Kumi already owns
// the club's Twilio account, the 10DLC registration, the emergency kill switch and the
// VIP hard do-not-contact list, and enforces the last two inside its send primitive. So
// the phone receptionist asks Kumi to send, rather than growing a second SMS stack here
// with its own copy of rules that must never drift.
//
// The contract that matters: this reports whether a message ACTUALLY went out. The agent
// must never tell a caller "just texted you" when nothing did. Every failure mode below,
// including Kumi being unreachable, resolves to sent:false rather than throwing.

const KUMI_VOICE_SMS_URL =
  process.env.KUMI_VOICE_SMS_URL || "https://padelmaps.org/api/voice/send-link";
const VOICE_SMS_SECRET = process.env.VOICE_SMS_SECRET;
const CLUB_SLUG = process.env.CLUB_SLUG || "foundry-padel";

// Must match the template names Kumi will accept. Kept here too so a mistyped template
// costs a rejected request rather than a round trip mid-call.
export const TEMPLATES = new Set(["booking", "membership", "directions", "app"]);

/** Which Playtomic page an event lives on, read back out of the deep link the
 *  events feed already builds. Saves inventing a second mapping that could
 *  disagree with the one the website uses. */
export function deepLinkFromEvent(event) {
  const url = String(event?.book_url || "");
  const m = url.match(/\/(tournaments|lesson_class|matches)\/([0-9a-fA-F-]{36})/);
  if (!m) return null;
  const kind = { tournaments: "tournament", lesson_class: "class", matches: "match" }[m[1]];
  return kind ? { kind, id: m[2] } : null;
}

// Short on purpose: this runs while a caller is on the line. Kumi has to reach Twilio
// inside this budget, so it is not as tight as the cache-only endpoints.
const TIMEOUT_MS = 6000;

/**
 * @param {object}   [deps]
 * @param {string}   [deps.url]
 * @param {string}   [deps.secret]
 * @param {string}   [deps.slug]
 * @param {Function} [deps.fetchImpl]
 * @param {number}   [deps.timeoutMs]
 */
export function createLinkSender({
  url = KUMI_VOICE_SMS_URL,
  secret = VOICE_SMS_SECRET,
  slug = CLUB_SLUG,
  fetchImpl = (...args) => fetch(...args),
  timeoutMs = TIMEOUT_MS,
} = {}) {
  return {
    configured: () => Boolean(secret),

    /** Resolves {sent, reason}. Never throws and never reports a send it is unsure of. */
    async sendLink({ phone, template, callId, deepLink = null, itemId = null, label = null }) {
      if (!secret) return { sent: false, reason: "not_configured" };
      if (!deepLink && !TEMPLATES.has(template)) return { sent: false, reason: "unknown_template" };
      if (!phone) return { sent: false, reason: "no_number" };

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const res = await fetchImpl(url, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-voice-token": secret,
          },
          body: JSON.stringify({
            slug,
            to: phone,
            template: deepLink ? "" : template,
            deep_link: deepLink,
            item_id: itemId,
            label,
            call_id: callId || null,
          }),
          signal: controller.signal,
        });

        if (!res.ok) {
          // 401/503 here means the secret is wrong or unset on Kumi's side. Loud, because
          // it is silent from the caller's point of view and would otherwise look like
          // "Twilio is flaky" for as long as nobody checks.
          console.error("[smslink] Kumi refused the send", { status: res.status });
          return { sent: false, reason: "upstream_error" };
        }

        const body = await res.json().catch(() => ({}));
        return { sent: body.sent === true, reason: body.sent === true ? null : body.reason || "not_sent" };
      } catch (error) {
        console.error("[smslink] send failed:", error.message);
        return { sent: false, reason: "unreachable" };
      } finally {
        clearTimeout(timer);
      }
    },
  };
}

// Read aloud, so no URL punctuation. TTS says "foundrypadel.com/book" poorly.
const SPOKEN_LINKS = {
  app: "the Playtomic app, on the App Store or Google Play",
  booking: "foundry padel dot com slash book",
  membership: "foundry padel dot com slash memberships",
  directions: "we're at 8613 North Crawford Street, in Saint Johns",
};

/** What the agent says. The rule running through all of it: only the first line claims a
 *  text was sent, and it is the only branch reached when one actually was. */
export function linkSpeech(template, { sent, reason }) {
  if (sent) return "Sent. You should have that in a moment.";

  const fallback = SPOKEN_LINKS[template] || SPOKEN_LINKS.booking;
  switch (reason) {
    case "cooldown":
      return "I've already sent that to you in the last few minutes, so it should be there. Have a look for it.";
    case "per_call":
      // Three in one conversation. Almost certainly the agent looping rather
      // than a caller who genuinely wants a fourth link.
      return `That's a few I've sent you now, so I'll leave it there. Everything else is at ${fallback}.`;
    case "not_domestic":
      // Kumi deliberately never sends international SMS.
      return `I can't text that number, but you'll find it at ${fallback}.`;
    case "no_number":
      return `I don't have a number to text. You'll find it at ${fallback}.`;
    default:
      // Everything else, including Kumi being down: do not claim a text.
      return `I can't get a text out right now, but you'll find it at ${fallback}.`;
  }
}
