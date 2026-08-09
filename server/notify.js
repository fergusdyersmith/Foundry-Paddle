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

  async function postViaApi(record) {
    const message = buildSlackMessage(record);
    const res = await withTimeout((signal) =>
      fetchImpl("https://slack.com/api/chat.postMessage", {
        method: "POST",
        headers: {
          authorization: `Bearer ${botToken}`,
          "content-type": "application/json; charset=utf-8",
        },
        body: JSON.stringify({
          channel,
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
      });
      return false;
    }
    return true;
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

  async function postToSlack(record) {
    if (!useBotToken && !webhookUrl) return false;
    try {
      return useBotToken ? await postViaApi(record) : await postViaWebhook(record);
    } catch (error) {
      console.error("[notify] Slack delivery failed:", error.message);
      return false;
    }
  }

  return {
    configured: () => useBotToken || Boolean(webhookUrl),

    /** Record first, then deliver. Resolves with whether a human will actually
     *  see this, which is what decides what the agent says next. */
    async notifyMessage(record) {
      // The durable half. Logged before any network call, and deliberately
      // structured so it can be grepped out of Railway logs after the fact.
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

      const delivered = await postToSlack(record);
      if (!delivered) {
        console.error("[message] NOT DELIVERED to any notifier", {
          call_id: record.callId,
        });
      }
      return { delivered, channel: delivered ? "slack" : null };
    },
  };
}
