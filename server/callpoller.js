// Find out about finished calls by asking, rather than waiting to be told.
//
// Three things configured on the Bland number have now silently failed to
// apply to live calls: custom tools (confirmed by Bland's own server-side log
// inspection: no tool definition is ever injected into the inference context),
// the post-call webhook (set on the number, reads back as set, and the call
// record shows webhook: None), and persona_id/persona_version_id (accepted with
// 200, stored as null).
//
// Everything those were meant to do still has to happen: the club needs every
// call in Slack, and a caller promised a text needs to receive one. So we poll
// GET /v1/calls, which works, instead of relying on Bland to call us.
//
// Deliberately conservative about duplicates. On startup it marks every
// existing call as seen WITHOUT processing, so a redeploy cannot re-post a
// morning's calls to Slack. The cost is that a call finishing during a deploy
// is missed, which is the better failure: a missing Slack card is noticed, a
// duplicate one teaches people to ignore the channel.

import {
  promisedText,
  textDestination,
  linkAlreadySent,
  soundsUrgent,
  wantsCallback,
  matchEvent,
  templateFromText,
  spoken,
  spokenDate,
} from "./voice.js";
import { deepLinkFromEvent } from "./smslink.js";
import { sanitize, normalizePhone } from "./notify.js";

const POLL_MS = 60_000;
const LOOKBACK = 10;

/**
 * @param {object} deps
 * @param {string} deps.apiKey       Bland API key
 * @param {string} deps.number       our inbound number, E.164
 * @param {object} deps.notifier     from server/notify.js
 * @param {object} deps.linkSender   from server/smslink.js
 * @param {Function} deps.cachedEvents
 * @param {Function} [deps.fetchImpl]
 */
export function createCallPoller({
  apiKey,
  number,
  notifier,
  linkSender,
  cachedEvents,
  timezone = "America/Los_Angeles",
  fetchImpl = (...args) => fetch(...args),
  intervalMs = POLL_MS,
}) {
  const seen = new Set();
  let primed = false;

  async function bland(path) {
    const res = await fetchImpl(`https://api.bland.ai${path}`, {
      headers: { authorization: apiKey },
    });
    if (!res.ok) throw new Error(`Bland ${path} -> ${res.status}`);
    return res.json();
  }

  /** Everything that should happen when a call ends. */
  async function report(call) {
    const detail = await bland(`/v1/calls/${call.call_id}`);
    const from = normalizePhone(detail.from) || null;
    const lines = (detail.transcripts || [])
      .filter((t) => t.user !== "auto-generated")
      .map((t) => `${t.user === "assistant" ? "Agent" : "Caller"}: ${sanitize(t.text, 200)}`)
      .filter((l) => l.length > 8);

    // Keep the promise the agent made, when it did not keep it itself. The tool
    // fires mid-call now, so sending again a minute later would be a second
    // identical text rather than a rescue.
    let texted = null;
    if (linkAlreadySent(detail.call_id)) {
      texted = "link sent during the call";
    } else if (promisedText(lines) && from && linkSender?.configured()) {
      const said = lines.join(" ");
      const today = new Date().toLocaleDateString("en-CA", { timeZone: timezone });
      const events = cachedEvents?.();
      const matched = events ? matchEvent(said, events.events, today) : null;
      const deep = matched ? deepLinkFromEvent(matched) : null;
      const result = await linkSender.sendLink({
        // A caller who reads out a different number wants it there, not on the
        // phone they happen to be holding.
        phone: normalizePhone(textDestination(lines)) || from,
        template: templateFromText(said) || "booking",
        deepLink: deep?.kind || null,
        itemId: deep?.id || null,
        label: matched
          ? `${matched.title}, ${spokenDate(matched.date, today)} at ${spoken(matched.start_time)}`
          : null,
        callId: detail.call_id,
      });
      texted = result.sent
        ? `Texted ${matched ? matched.title : "the booking link"}`
        : `Could NOT text them (${result.reason}). The agent said it would.`;
    }

    if (!notifier?.configured()) return;
    await notifier.notifyMessage({
      name: from ? `Caller ${from}` : "Caller",
      phone: from,
      reason: sanitize(detail.summary, 600) || lines.slice(0, 6).join(" / ") || "(no summary)",
      // The agent's own urgent flag never arrives, so read it off the call.
      urgent: soundsUrgent(lines),
      needsCallback: wantsCallback(lines),
      callSummary: true,
      durationMin: Number(detail.call_length) || null,
      recordingUrl: detail.recording_url || null,
      transcript: lines,
      texted,
      callId: detail.call_id,
      receivedAt: new Date().toISOString(),
    });
  }

  async function poll() {
    const data = await bland(`/v1/calls?limit=${LOOKBACK}`);
    // A call is reportable once Bland says it finished, OR once it is older
    // than any call could possibly be.
    //
    // The second clause exists because the first one silently stopped being
    // true. Calls handed to the agent by Redirect never got marked complete,
    // since blanking Twilio's status callback took away how Bland learns a call
    // ended, so completed stayed false and call_length null forever and the
    // club saw nothing in Slack for them. That is fixed at the source, but a
    // filter that drops records on a flag somebody else sets should not be the
    // only thing standing between a caller and being called back.
    //
    // max_duration is 15 minutes, so anything older cannot still be running.
    const tooOldToBeRunning = 20 * 60 * 1000;
    const now = Date.now();
    const calls = (data.calls || data.data || []).filter((c) => {
      if (c.to !== number) return false;
      if (c.completed || c.status === "completed") return true;
      const started = Date.parse(c.created_at || "");
      if (!started || now - started < tooOldToBeRunning) return false;
      console.warn("[calls] %s never completed on Bland's side, reporting anyway", c.call_id);
      return true;
    });

    // First pass after a restart: remember them, report none.
    if (!primed) {
      for (const c of calls) seen.add(c.call_id);
      primed = true;
      console.log("[calls] poller primed with %d existing call(s)", seen.size);
      return;
    }

    // Oldest first, so Slack reads in the order the calls happened.
    for (const c of [...calls].reverse()) {
      if (seen.has(c.call_id)) continue;
      seen.add(c.call_id);
      try {
        await report(c);
        console.log("[calls] reported %s", c.call_id);
      } catch (error) {
        console.error("[calls] failed to report %s: %s", c.call_id, error.message);
      }
    }
    // The set only needs to cover the poll window.
    if (seen.size > 200) seen.clear();
  }

  return {
    poll,
    start() {
      if (!apiKey) {
        console.log("[calls] BLAND_API_KEY not set; call poller not started");
        return null;
      }
      poll().catch((e) => console.error("[calls] first poll failed:", e.message));
      const timer = setInterval(
        () => poll().catch((e) => console.error("[calls] poll failed:", e.message)),
        intervalMs,
      );
      timer.unref();
      console.log("[calls] polling every %ds for finished calls to %s", intervalMs / 1000, number);
      return timer;
    },
  };
}
