// The club's phone: ring both owners at once, take a message if neither answers.
//
// Used two ways, told apart by ?src=agent on the webhook URL rather than by
// guesswork about caller ID:
//
//   1. RING GROUP (no src). A caller dials the club, both owners' phones ring
//      together, and nobody who misses a call loses it: the caller records a
//      message and it lands in Slack with the recording.
//
//   2. AGENT TRANSFER (?src=agent). The Bland receptionist hands off. Identical
//      ringing, but no voicemail prompt, because the agent already took the
//      message before transferring and asking twice is insulting.
//
// Twilio rather than Bland, because Bland cannot do this at all: transfer_list
// routes by department instead of falling back, there is no ring timeout, and a
// transfer never returns to the agent. Handing off straight to a mobile drops
// an unanswered caller into one owner's personal voicemail, which the other
// owner never sees.

import express from "express";
import crypto from "node:crypto";

/** Twilio signs every request with your auth token: HMAC-SHA1 over the full URL
 *  with the POST fields appended in sorted order. Without this the endpoint
 *  hands the owners' mobile numbers to anyone who asks for the XML, which is
 *  the leak we spent an afternoon removing from the knowledge base. */
export function validSignature({ authToken, url, params, signature }) {
  if (!authToken || !signature) return false;
  const data = Object.keys(params || {})
    .sort()
    .reduce((acc, key) => acc + key + params[key], url);
  const expected = crypto
    .createHmac("sha1", authToken)
    .update(Buffer.from(data, "utf-8"))
    .digest("base64");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function escapeXml(text) {
  return String(text ?? "").replace(/[<>&'"]/g, (c) =>
    ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c],
  );
}

const VOICE = 'voice="Polly.Joanna"';

/**
 * @param {object} deps
 * @param {string}   deps.authToken   Twilio auth token, for signature checks
 * @param {string[]} deps.ringTo      E.164 numbers to ring together
 * @param {object}   [deps.notifier]  from server/notify.js, for the Slack card
 * @param {string}   [deps.publicUrl]
 * @param {number}   [deps.ringSeconds]
 */
export function createTransferRouter({
  authToken,
  ringTo = [],
  notifier = null,
  publicUrl = "https://www.foundrypadel.com",
  ringSeconds = 25,
}) {
  const router = express.Router();
  // Twilio posts a form, and express.json() upstream will not touch it.
  const form = express.urlencoded({ extended: false });

  function authorize(req, res) {
    const url = `${publicUrl}${req.originalUrl}`;
    if (
      !validSignature({
        authToken,
        url,
        params: req.body,
        signature: req.get("x-twilio-signature"),
      })
    ) {
      res.status(403).type("text/xml").send("<Response><Reject/></Response>");
      return false;
    }
    return true;
  }

  const fromAgent = (req) => req.query?.src === "agent";

  router.post("/api/voice/transfer", form, (req, res) => {
    if (!authorize(req, res)) return;
    console.log(
      "[transfer] inbound %s",
      JSON.stringify({
        from: req.body?.From,
        to: req.body?.To,
        src: req.query?.src || "direct",
        callSid: req.body?.CallSid,
      }),
    );

    if (!ringTo.length) {
      // Never drop a caller in silence. In the agent's case they have just been
      // told they are being put through.
      console.error("[transfer] no numbers configured, nobody will ring");
      return res
        .type("text/xml")
        .send(
          `<Response><Say ${VOICE}>Sorry, we can't put you through right now. Please try the club again shortly.</Say><Hangup/></Response>`,
        );
    }

    // answerOnBridge: the caller hears a real ringing tone rather than silence
    // while both phones ring, so a slow answer does not sound like a dead line.
    //
    // The whisper matters more than it looks. Without it an owner sees an
    // unknown Portland number, and at the moment they decide whether to answer
    // the call is indistinguishable from a robocall.
    const whisper = `${publicUrl}/api/voice/transfer/whisper${fromAgent(req) ? "?src=agent" : ""}`;
    const numbers = ringTo
      .map((n) => `<Number url="${escapeXml(whisper)}">${escapeXml(n)}</Number>`)
      .join("");
    const after = `${publicUrl}/api/voice/transfer/after${fromAgent(req) ? "?src=agent" : ""}`;

    res
      .type("text/xml")
      .send(
        `<Response><Dial timeout="${ringSeconds}" answerOnBridge="true" action="${escapeXml(after)}" method="POST">${numbers}</Dial></Response>`,
      );
  });

  // Played to whoever picks up, before the caller is bridged in. The caller
  // hears none of it.
  router.post("/api/voice/transfer/whisper", form, (req, res) => {
    if (!authorize(req, res)) return;
    const what = fromAgent(req)
      ? "Call from the Foundry Padel front desk."
      : "Call to the Foundry Padel club line.";
    res.type("text/xml").send(`<Response><Say ${VOICE}>${what}</Say></Response>`);
  });

  router.post("/api/voice/transfer/after", form, (req, res) => {
    if (!authorize(req, res)) return;
    const status = req.body?.DialCallStatus;
    console.log(
      "[transfer] outcome %s",
      JSON.stringify({ status, src: req.query?.src || "direct", callSid: req.body?.CallSid }),
    );

    // Someone answered and the conversation is over. Without this check Twilio
    // falls through and reads an apology at the caller after a perfectly good
    // call.
    if (status === "completed") {
      return res.type("text/xml").send("<Response><Hangup/></Response>");
    }

    // The receptionist already took a message before transferring, so asking
    // for another one would be asking twice.
    if (fromAgent(req)) {
      return res
        .type("text/xml")
        .send(
          `<Response><Say ${VOICE}>Sorry, nobody's free to take your call right now. We have your message and someone will get back to you as soon as they can.</Say><Hangup/></Response>`,
        );
    }

    // Nobody answered and nobody has taken a message, so this is the club's
    // only chance to keep the call. Recording, rather than an owner's personal
    // voicemail, because this one reaches both of them and lands in Slack.
    const done = `${publicUrl}/api/voice/transfer/voicemail`;
    res.type("text/xml").send(
      `<Response>` +
        `<Say ${VOICE}>Sorry we missed you. Leave your name, number and a message after the tone, and we'll get back to you.</Say>` +
        `<Record maxLength="120" playBeep="true" trim="trim-silence" timeout="4"` +
        ` transcribe="true" transcribeCallback="${escapeXml(done)}" action="${escapeXml(done)}" method="POST"/>` +
        `<Say ${VOICE}>We didn't catch that. Please call again or message us. Goodbye.</Say>` +
        `</Response>`,
    );
  });

  // Twilio calls this TWICE for one voicemail: once when the recording is done
  // (action) and again when the transcript is ready (transcribeCallback), which
  // can be a minute later. The Slack notifier merges on call_id, so the second
  // one edits the first card rather than posting a duplicate, and the message
  // reaches Slack immediately with the words filled in when they arrive.
  router.post("/api/voice/transfer/voicemail", form, async (req, res) => {
    if (!authorize(req, res)) return;
    // Answer immediately. A slow reply here would leave the caller listening to
    // nothing after the beep.
    res.type("text/xml").send("<Response><Hangup/></Response>");

    const recording = req.body?.RecordingUrl;
    const text = req.body?.TranscriptionText;
    console.log(
      "[voicemail] %s",
      JSON.stringify({
        from: req.body?.From,
        callSid: req.body?.CallSid,
        seconds: req.body?.RecordingDuration,
        transcribed: Boolean(text),
      }),
    );

    if (!notifier?.configured()) {
      console.error("[voicemail] NOT DELIVERED, no notifier configured");
      return;
    }
    await notifier.notifyMessage({
      name: req.body?.From ? `Caller ${req.body.From}` : "Caller",
      phone: req.body?.From || null,
      // Before the transcript arrives this is all anyone gets, so it has to say
      // plainly that there is audio to listen to.
      reason: text || "Voicemail, no transcript yet. Listen to the recording.",
      needsCallback: true,
      callSummary: true,
      recordingUrl: recording ? `${recording}.mp3` : null,
      durationMin: Number(req.body?.RecordingDuration)
        ? Number(req.body.RecordingDuration) / 60
        : null,
      callId: req.body?.CallSid || "",
      receivedAt: new Date().toISOString(),
    });
  });

  return router;
}
