// Where a transferred call actually goes.
//
// Bland cannot ring two people. `transfer_list` is keyed by department, so the
// agent picks a route by topic, and there is no ring timeout, no no-answer
// fallback, and no way back to the agent once the handoff happens. Transfer
// straight to a mobile and an unanswered call lands in that person's personal
// voicemail, where the other owner never sees it.
//
// So the transfer goes to a Twilio number we own, and Twilio does the ringing:
// both phones at once, first to answer gets the caller, and if neither picks up
// the caller hears the club rather than an individual's voicemail greeting.
//
// The one thing this cannot do is hand the caller back to the agent. Nothing
// can. That is why the receptionist takes the message BEFORE transferring: the
// Slack card is the only record that survives a transfer nobody answers.

import express from "express";
import crypto from "node:crypto";

/** Twilio signs every request with your auth token: HMAC-SHA1 over the full URL
 *  with the POST fields appended in sorted order. Without this the endpoint
 *  hands Jake's and Monica's mobile numbers to anyone who asks for the XML,
 *  which is the leak we spent an afternoon removing from the knowledge base. */
export function validSignature({ authToken, url, params, signature }) {
  if (!authToken || !signature) return false;
  const data = Object.keys(params || {})
    .sort()
    .reduce((acc, key) => acc + key + params[key], url);
  const expected = crypto.createHmac("sha1", authToken).update(Buffer.from(data, "utf-8")).digest("base64");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function escapeXml(text) {
  return String(text ?? "").replace(/[<>&'"]/g, (c) =>
    ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c],
  );
}

/**
 * @param {object} deps
 * @param {string}   deps.authToken   Twilio auth token, for signature checks
 * @param {string[]} deps.ringTo      E.164 numbers to ring together
 * @param {string}   [deps.publicUrl] this server's public origin
 * @param {number}   [deps.ringSeconds]
 */
export function createTransferRouter({
  authToken,
  ringTo = [],
  publicUrl = "https://www.foundrypadel.com",
  ringSeconds = 25,
}) {
  const router = express.Router();
  // Twilio posts a form, and express.json() upstream will not touch it.
  const form = express.urlencoded({ extended: false });

  function authorize(req, res) {
    const url = `${publicUrl}${req.originalUrl}`;
    if (!validSignature({
      authToken,
      url,
      params: req.body,
      signature: req.get("x-twilio-signature"),
    })) {
      res.status(403).type("text/xml").send("<Response><Reject/></Response>");
      return false;
    }
    return true;
  }

  router.post("/api/voice/transfer", form, (req, res) => {
    if (!authorize(req, res)) return;

    // Logged because we do not yet know what caller ID Bland presents on a
    // transfer. Once we do, this endpoint can refuse anything else, and a
    // stranger dialling the club's SMS number will stop ringing the owners.
    console.log("[transfer] inbound %s", JSON.stringify({
      from: req.body?.From, to: req.body?.To, callSid: req.body?.CallSid,
    }));

    if (!ringTo.length) {
      // Never silently drop a caller who has already been told they are being
      // put through.
      console.error("[transfer] no numbers configured, nobody will ring");
      return res.type("text/xml").send(
        `<Response><Say voice="Polly.Joanna">Sorry, we can't put you through right now. Please try the club again shortly.</Say><Hangup/></Response>`,
      );
    }

    // answerOnBridge: the caller hears a real ringing tone rather than silence
    // while both phones ring, so a slow answer does not sound like a dead line.
    //
    // The whisper matters more than it looks. Without it an owner sees an
    // unknown Portland number, and the call is indistinguishable from a
    // robocall at the moment they decide whether to answer.
    const numbers = ringTo
      .map((n) => `<Number url="${publicUrl}/api/voice/transfer/whisper">${escapeXml(n)}</Number>`)
      .join("");

    res.type("text/xml").send(
      `<Response><Dial timeout="${ringSeconds}" answerOnBridge="true" action="${publicUrl}/api/voice/transfer/after" method="POST">${numbers}</Dial></Response>`,
    );
  });

  // Played to whoever picks up, before the caller is bridged in. The caller
  // hears none of it.
  router.post("/api/voice/transfer/whisper", form, (req, res) => {
    if (!authorize(req, res)) return;
    res.type("text/xml").send(
      `<Response><Say voice="Polly.Joanna">Call from the Foundry Padel front desk.</Say></Response>`,
    );
  });

  router.post("/api/voice/transfer/after", form, (req, res) => {
    if (!authorize(req, res)) return;
    const status = req.body?.DialCallStatus;
    console.log("[transfer] outcome %s", JSON.stringify({ status, callSid: req.body?.CallSid }));

    // A completed call means someone answered and the conversation is over.
    // Without this check Twilio would fall through and read the apology at the
    // caller after a perfectly good conversation.
    if (status === "completed") {
      return res.type("text/xml").send("<Response><Hangup/></Response>");
    }

    // Nobody answered. Say so as the club, not as somebody's voicemail, and
    // tell them the thing that is actually true: the message is already with
    // the team, because the receptionist took it before transferring.
    res.type("text/xml").send(
      `<Response><Say voice="Polly.Joanna">Sorry, nobody's free to take your call right now. We have your message and someone will get back to you as soon as they can.</Say><Hangup/></Response>`,
    );
  });

  return router;
}
