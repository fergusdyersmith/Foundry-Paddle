// Where a phone message goes after the receptionist takes it.
//
// Two jobs, deliberately separated:
//   1. The RECORD. Every message is logged in structured form before we try to
//      deliver it anywhere, so a notifier being down or muted can never lose a
//      caller's callback request.
//   2. The NOTIFICATION. Slack today, via an incoming webhook. Kept behind this
//      adapter so adding WhatsApp or email later is a new function, not a
//      redesign of the voice endpoints.
//
// Delivery is awaited rather than fire-and-forget. If we cannot get the message
// to the team, the agent must NOT tell the caller someone will ring them back —
// it offers a transfer instead. Promising a callback we did not record is the
// one failure mode that actually damages the club.

const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;
const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;
const SLACK_CHANNEL = process.env.SLACK_CHANNEL || "#front-desk";
const SLACK_TIMEOUT_MS = 4000;

/** Slack mrkdwn treats &, < and > as markup. Escaping them is also what stops a
 *  caller from saying their name is "<!channel>" and paging everyone. */
export function escapeSlack(text) {
  return String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Strip control, zero-width and bidi characters from anything a caller said.
 *  Same discipline as asData() in server/chat.js. */
export function sanitize(text, max = 500) {
  return String(text ?? "")
    // Control, zero-width and bidi-override characters, written as escapes so
    // the source stays readable and cannot be mangled by an editor.
    .replace(
      /[\u0000-\u001F\u007F-\u009F\u200B-\u200F\u202A-\u202E\u2060-\u2064\uFEFF]/g,
      " ",
    )
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

// Callers say "five four one, two seven zero...". Speech-to-text hands us ten
// bare digits far more often than an E.164 string, and a tel: link without a
// country code does not dial.
const DEFAULT_COUNTRY_CODE = process.env.CLUB_COUNTRY_CODE || "1";

/** Normalize to E.164, or null if it cannot be made dialable. Null is the right
 *  answer for a half-heard number: better to ask the caller again than to post
 *  a number nobody can ring back. */
export function normalizePhone(input) {
  const cleaned = String(input ?? "").replace(/[^\d+]/g, "");
  if (!cleaned) return null;

  if (cleaned.startsWith("+")) {
    // A plus in front of exactly ten digits is not a country code and a
    // number: it is a North American number with a plus bolted on. The voice
    // agent does this, having been told the tool wants E.164. On 10 Aug it
    // sent "+5412704585", which Twilio read as Argentina and refused, so a
    // caller who had spelled out their number twice got nothing.
    const digits = cleaned.slice(1);
    if (digits.length === 10) return `+${DEFAULT_COUNTRY_CODE}${digits}`;
    return /^\+\d{8,15}$/.test(cleaned) ? cleaned : null;
  }
  const digits = cleaned.replace(/\D/g, "");
  // Ten digits is a bare North American number: 541 270 4585.
  if (digits.length === 10) return `+${DEFAULT_COUNTRY_CODE}${digits}`;
  // Eleven starting with 1 is the same number with the country code spoken.
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  // Anything else is a misheard number, not a number from another country: an
  // international caller would have to say "plus" for us to get here.
  return null;
}

/** Pretty, tappable Slack message. Pure, so the formatting is testable without
 *  posting anything. */
export function buildSlackMessage(record) {
  const name = escapeSlack(record.name || "Someone");
  const phone = record.phone ? escapeSlack(record.phone) : null;
  const reason = escapeSlack(record.reason || "(no reason given)");
  const heading = record.urgent
    ? ":rotating_light: Urgent message"
    : record.transferring
      ? ":twisted_rightwards_arrows: Caller being put through now"
      : record.messageTaken
        ? ":telephone_receiver: Message taken, call finished"
        : record.callSummary
          ? (record.needsCallback ? ":phone: Call finished, wants a callback" : ":phone: Call finished")
          : ":telephone_receiver: New message";

  const fields = [{ type: "mrkdwn", text: `*From*\n${name}` }];
  if (phone) {
    // tel: makes it one tap to call back from the Slack mobile app.
    fields.push({ type: "mrkdwn", text: `*Number*\n<tel:${phone}|${phone}>` });
  }

  const blocks = [
    { type: "header", text: { type: "plain_text", text: heading, emoji: true } },
    { type: "section", fields },
    {
      type: "section",
      text: { type: "mrkdwn", text: `*${record.callSummary ? "What they wanted" : "Reason"}*\n${reason}` },
    },
  ];

  // The transcript, folded away. Enough to see what was said without anyone
  // having to open the recording.
  if (record.transcript?.length) {
    const convo = record.transcript.slice(0, 14).map(escapeSlack).join("\n");
    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: "```" + convo.slice(0, 2600) + "```" },
    });
  }

  const context = [];
  // Whether the text the agent promised on the call actually went out.
  if (record.texted) context.push(escapeSlack(record.texted));
  if (record.durationMin) context.push(`${record.durationMin.toFixed(1)} min`);
  if (record.recordingUrl) context.push(`<${escapeSlack(record.recordingUrl)}|recording>`);
  if (record.transferring) {
    // Taken BEFORE the transfer was attempted, because a failed transfer drops
    // the caller into someone's personal voicemail and the message never gets
    // here. If a human picked up, this row is just context; if nobody did, it
    // is the only record that the call happened.
    context.push("Taken before transfer, so it may already be handled");
  }
  if (record.receivedAt) context.push(`Taken ${escapeSlack(record.receivedAt)}`);
  if (record.callId) context.push(`Call \`${escapeSlack(record.callId)}\``);
  context.push(
    record.callSummary
      ? "React with :white_check_mark: if this needs nothing further"
      : "React with :white_check_mark: to claim it",
  );
  blocks.push({
    type: "context",
    elements: [{ type: "mrkdwn", text: context.join("  •  ") }],
  });

  return {
    // Fallback text is what shows in the notification banner, so it has to
    // carry the useful part on its own.
    text: `${record.urgent ? "URGENT: " : record.transferring ? "Transferring: " : ""}${name}${phone ? ` (${phone})` : ""}: ${reason}`,
    blocks,
  };
}

/**
 * Two transports, because which one is available depends on how the Slack app
 * was installed:
 *   - bot token + channel -> chat.postMessage. What we use. Also leaves room
 *     for threads and reactions later without reinstalling the app.
 *   - incoming webhook    -> a plain POST to a URL, no token handling.
 *
 * @param {object}   [deps]
 * @param {string}   [deps.botToken]    xoxb-… bot token with chat:write
 * @param {string}   [deps.channel]     channel name or id for chat.postMessage
 * @param {string}   [deps.webhookUrl]  incoming webhook, used only without a token
 * @param {Function} [deps.fetchImpl]
 * @param {number}   [deps.timeoutMs]
 */
export function createNotifier({
  botToken = SLACK_BOT_TOKEN,
  channel = SLACK_CHANNEL,
  webhookUrl = SLACK_WEBHOOK_URL,
  fetchImpl = (...args) => fetch(...args),
  timeoutMs = SLACK_TIMEOUT_MS,
} = {}) {
  const useBotToken = Boolean(botToken && channel);

  async function withTimeout(fn) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fn(controller.signal);
    } finally {
      clearTimeout(timer);
    }
  }

  async function postViaApi(record, prior = null) {
    const updateTs = prior?.ts || null;
    const message = buildSlackMessage(record);
    const res = await withTimeout((signal) =>
      fetchImpl(`https://slack.com/api/${updateTs ? "chat.update" : "chat.postMessage"}`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${botToken}`,
          "content-type": "application/json; charset=utf-8",
        },
        body: JSON.stringify({
          // The ID Slack gave us when it accepted the original, because an edit
          // cannot be addressed by channel name.
          channel: prior?.channel || channel,
          ...(updateTs ? { ts: updateTs } : {}),
          ...message,
          // @channel only for genuinely urgent calls. It is the one thing that
          // still reaches someone whose notifications are set to mentions only,
          // which is Slack's default and the likeliest way a message gets
          // missed. Any more liberal use and the club learns to mute us.
          ...(record.urgent
            ? { text: `<!channel> ${message.text}` }
            : {}),
        }),
        signal,
      }),
    );
    // The Slack Web API answers 200 with {ok:false} on failure, so the HTTP
    // status alone would report every error as a success.
    const body = await res.json().catch(() => ({}));
    if (!body.ok) {
      console.error("[notify] Slack rejected the message", {
        status: res.status,
        error: body.error,
        update: Boolean(updateTs),
      });
      return false;
    }
    // chat.postMessage takes a channel NAME. chat.update does NOT: it needs the
    // channel ID, and answers channel_not_found for "#front-desk". Every edit
    // failed that way, silently, so a voicemail recording and its transcript
    // were both rejected while the original card sat there looking fine.
    return { ts: body.ts || updateTs, channel: body.channel || channel };
  }

  async function postViaWebhook(record) {
    const res = await withTimeout((signal) =>
      fetchImpl(webhookUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(buildSlackMessage(record)),
        signal,
      }),
    );
    if (!res.ok) {
      console.error("[notify] Slack rejected the message", { status: res.status });
      return false;
    }
    return true;
  }

  async function postToSlack(record, prior = null) {
    if (!useBotToken && !webhookUrl) return false;
    try {
      return useBotToken ? await postViaApi(record, prior) : await postViaWebhook(record);
    } catch (error) {
      console.error("[notify] Slack delivery failed:", error.message);
      return false;
    }
  }

  // One card per phone call, edited in place.
  //
  // The agent can reach take_message more than once in a conversation. It did
  // on 10 Aug: a caller said "can you take a message", it took one immediately
  // with a reason it made up from the conversation so far, then took the real
  // one thirty seconds later. Two cards for one call, the first meaningless,
  // and nothing on either saying which was current.
  //
  // The prompt now waits for the caller to actually say the message, which is
  // the real fix. This is the backstop: the second take edits the first card
  // and appends, so nothing is invented and nothing is lost. Bot token only;
  // an incoming webhook cannot edit what it posted.
  const cardByCall = new Map(); // call_id -> { ts, channel, record }
  const MAX_TRACKED_CALLS = 200;

  function remember(callId, ts, channelId, record) {
    if (!callId || typeof ts !== "string") return;
    cardByCall.set(callId, { ts, channel: channelId, record });
    // Bounded, and a call is only ever revisited within its own few minutes.
    while (cardByCall.size > MAX_TRACKED_CALLS) {
      cardByCall.delete(cardByCall.keys().next().value);
    }
  }

  /** Merge a repeat take into the card already posted for this call. */
  function mergeRecord(prior, next) {
    const seen = prior.reason ? prior.reason.split("\n") : [];
    return {
      ...prior,
      ...next,
      // Keep the name we already had if this take did not carry one.
      name: next.name || prior.name,
      phone: next.phone || prior.phone,
      // Urgent is sticky: a later, calmer take must not downgrade a card that
      // already pinged the channel.
      urgent: Boolean(prior.urgent || next.urgent),
      // Twilio's transcript callback arrives without the recording fields, so a
      // plain spread would blank the link to the audio at the exact moment the
      // card became most useful.
      recordingUrl: next.recordingUrl || prior.recordingUrl || null,
      durationMin: next.durationMin || prior.durationMin || null,
      // The post-call summary lands on this same card a minute later. Without
      // this the heading would flip to a plain "Call finished" and the fact
      // that somebody is waiting on a callback would stop being the first
      // thing you see.
      messageTaken: Boolean(prior.messageTaken || !prior.callSummary),
      reason: seen.includes(next.reason) ? prior.reason : [...seen, next.reason].join("\n"),
    };
  }

  return {
    configured: () => useBotToken || Boolean(webhookUrl),

    /** Record first, then deliver. Resolves with whether a human will actually
     *  see this, which is what decides what the agent says next. */
    async notifyMessage(record) {
      // The durable half. Logged before any network call, and deliberately
      // structured so it can be grepped out of Railway logs after the fact.
      // Logged per take, not per card, so a merge is still visible here.
      console.log(
        "[message] %s",
        JSON.stringify({
          at: record.receivedAt,
          urgent: Boolean(record.urgent),
          name: record.name,
          phone: record.phone,
          reason: record.reason,
          transferring: Boolean(record.transferring),
          call_id: record.callId,
        }),
      );

      const prior = record.callId ? cardByCall.get(record.callId) : null;

      // Some reports only make sense as an edit to a card that already exists.
      // Twilio's voicemail transcript is one: it arrives a couple of minutes
      // after the recording, and on its own it is a card saying "The." with no
      // caller, no recording and no context.
      //
      // The map is in memory, so any restart in that window loses the link. A
      // deploy landed in exactly that gap and Slack got two cards for one
      // voicemail. Dropping a late transcript is the better failure: the
      // recording is already on the first card, which is the thing anyone
      // actually listens to.
      if (record.updateOnly && !prior) {
        console.warn("[message] no card to update, dropping late report", {
          call_id: record.callId,
        });
        return { delivered: false, channel: null, reason: "no_card" };
      }
      const toPost = prior ? mergeRecord(prior.record, record) : record;
      const result = await postToSlack(toPost, prior);
      const delivered = Boolean(result);
      if (!delivered) {
        console.error("[message] NOT DELIVERED to any notifier", {
          call_id: record.callId,
        });
      } else {
        remember(record.callId, prior?.ts || result?.ts, result?.channel || channel, toPost);
      }
      return { delivered, channel: delivered ? "slack" : null };
    },
  };
}
