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

// Which calls a human actually accepted, keyed by the parent call sid.
//
// Twilio cannot tell a person from a carrier voicemail: both "answer". On the
// first real test Jake did not pick up, his voicemail did, Twilio bridged to it
// and cancelled Monica's leg, and the caller left a message on Jake's personal
// phone that nobody else can see. That is precisely the failure the ring group
// exists to prevent.
//
// So whoever answers has to press a key. Voicemail never does. Nothing is
// treated as answered until a keypress lands here.
//
// Bounded and short-lived: an entry only has to outlive the call it belongs to.
const accepted = new Set();
const MAX_TRACKED = 200;

// Spoken words that mean "put them through".
//
// Deliberately a WORD LIST rather than "say anything". The thing being screened
// out is a machine that talks: a voicemail greeting is speech, so accepting any
// sound would let "hi, you've reached Jake, leave a message" answer for him,
// which is the whole failure this exists to prevent. Greetings essentially
// never say yes.
const ACCEPT_WORDS = /\b(yes|yep|yeah|accept|connect|hello|hi|speaking|go ahead|put them through)\b/i;

export function acceptedBySpeech(speech) {
  return ACCEPT_WORDS.test(String(speech || ""));
}
function markAccepted(parentSid) {
  if (!parentSid) return;
  accepted.add(parentSid);
  while (accepted.size > MAX_TRACKED) accepted.delete(accepted.values().next().value);
}

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
  // What the owners' phones show. Set to the club's own line so a call is
  // identifiable on the lock screen: saved once as a contact, every club call
  // then arrives as "Foundry Padel" rather than an unknown number.
  //
  // The cost is real and deliberate: the caller's own number no longer reaches
  // the handset, so every call is posted to Slack with it instead.
  callerId = null,
  // Under a carrier's voicemail pickup, which is usually 20 to 25 seconds. The
  // keypress already stops voicemail swallowing a call; this stops it competing
  // for one in the first place.
  ringSeconds = 18,
  // The same buffer /api/voice/_recent serves. Ring group calls belong there
  // too: without it, checking whether a call worked means reading Railway logs.
  recentLog = null,
}) {
  const router = express.Router();

  function observe(path, body) {
    if (!recentLog) return;
    recentLog.unshift({ at: new Date().toISOString(), path, auth: "twilio", body });
    recentLog.length = Math.min(recentLog.length, 20);
  }
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
    const inbound = {
      from: req.body?.From,
      to: req.body?.To,
      src: req.query?.src || "direct",
      callSid: req.body?.CallSid,
    };
    console.log("[transfer] inbound %s", JSON.stringify(inbound));
    observe("/transfer", { ...inbound, ringing: ringTo.length });

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
    const parent = req.body?.CallSid || "";
    accepted.delete(parent);
    // The parent sid travels in the URL rather than being read off the screening
    // request, which is a different call with its own sid.
    const q = `?parent=${encodeURIComponent(parent)}${fromAgent(req) ? "&src=agent" : ""}`;
    const whisper = `${publicUrl}/api/voice/transfer/whisper${q}`;
    const numbers = ringTo
      .map((n) => `<Number url="${escapeXml(whisper)}">${escapeXml(n)}</Number>`)
      .join("");
    const after = `${publicUrl}/api/voice/transfer/after${q}`;

    res
      .type("text/xml")
      .send(
        `<Response><Dial timeout="${ringSeconds}" answerOnBridge="true"${callerId ? ` callerId="${escapeXml(callerId)}"` : ""} action="${escapeXml(after)}" method="POST">${numbers}</Dial></Response>`,
      );
  });

  // Played to whoever picks up, before the caller is bridged in. The caller
  // hears ringing throughout and none of this.
  //
  // The keypress is the whole point. Answering is not enough, because a carrier
  // voicemail answers too, and until a key is pressed this call has not reached
  // a person.
  router.post("/api/voice/transfer/whisper", form, (req, res) => {
    if (!authorize(req, res)) return;
    // Short on purpose. Caller ID already shows the club's line, so naming the
    // club again is telling them what is on their own screen. All that is left
    // is the one thing the screen cannot say: press a key so we know a person,
    // and not a voicemail, is on the line.
    const what = fromAgent(req)
      ? "Front desk transfer."
      : "";
    const accept = `${publicUrl}/api/voice/transfer/accept?parent=${encodeURIComponent(req.query?.parent || "")}`;
    res.type("text/xml").send(
      `<Response>` +
        // Both, because an owner may be driving or mid-rally with no hand free
        // for the keypad. speechTimeout auto so a one word answer connects
        // without waiting out a fixed pause.
        `<Gather input="dtmf speech" numDigits="1" timeout="8" speechTimeout="auto"` +
        ` hints="yes, yeah, accept, connect, speaking, go ahead" action="${escapeXml(accept)}" method="POST">` +
        `<Say ${VOICE}>${what ? `${what} ` : ""}Say yes, or press any key, to connect.</Say>` +
        `</Gather>` +
        // No key: hang this leg up rather than bridging a caller to somebody's
        // voicemail greeting.
        `<Hangup/>` +
        `</Response>`,
    );
  });

  // A key was pressed, so a person is on the line. Returning TwiML with nothing
  // in it lets the screening finish, and Twilio bridges the caller straight in.
  router.post("/api/voice/transfer/accept", form, (req, res) => {
    if (!authorize(req, res)) return;
    const parent = req.query?.parent || "";
    const digits = req.body?.Digits || "";
    const speech = req.body?.SpeechResult || "";
    // A keypress is unambiguous. Speech has to be a word a person would say,
    // because a voicemail greeting is also speech and would otherwise answer
    // on their behalf.
    const ok = Boolean(digits) || acceptedBySpeech(speech);

    console.log(
      "[transfer] screening %s",
      JSON.stringify({ parent, leg: req.body?.CallSid, digits: Boolean(digits), speech, accepted: ok }),
    );
    observe("/transfer/accept", { parent, digits, speech, accepted: ok });

    if (!ok) {
      // Something answered and made a noise that was not an accept. Almost
      // always a voicemail greeting, so drop this leg rather than bridge a
      // caller into it.
      return res.type("text/xml").send("<Response><Hangup/></Response>");
    }
    markAccepted(parent);
    // Empty TwiML ends the screening, and Twilio bridges the caller in.
    res.type("text/xml").send("<Response></Response>");
  });

  router.post("/api/voice/transfer/after", form, (req, res) => {
    if (!authorize(req, res)) return;
    const status = req.body?.DialCallStatus;
    const tookIt = accepted.has(req.query?.parent || "");
    const outcome = {
      status,
      answeredByPerson: tookIt,
      src: req.query?.src || "direct",
      callSid: req.body?.CallSid,
    };
    console.log("[transfer] outcome %s", JSON.stringify(outcome));

    // The caller's number no longer reaches the handsets, because caller ID now
    // shows the club line instead. So every call goes to Slack: without this,
    // an answered call would leave no record of who rang.
    if (!fromAgent(req) && notifier?.configured()) {
      notifier
        .notifyMessage({
          name: req.body?.From ? `Caller ${req.body.From}` : "Caller",
          phone: req.body?.From || null,
          reason: tookIt
            ? "Answered on the club line."
            : "Nobody answered. The caller is being asked to leave a message.",
          needsCallback: !tookIt,
          callSummary: true,
          callId: req.query?.parent || req.body?.CallSid || "",
          receivedAt: new Date().toISOString(),
        })
        .catch((e) => console.error("[transfer] Slack card failed:", e.message));
    }
    observe("/transfer/after", outcome);

    // A PERSON took it, and the conversation is over. Deliberately not
    // DialCallStatus: a voicemail that swallowed the call also reports
    // "completed", and trusting that is what sent the first real caller to
    // Jake's personal voicemail. Only a keypress counts.
    if (accepted.has(req.query?.parent || "")) {
      accepted.delete(req.query?.parent || "");
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
        // Say who they have reached. A caller who hears a generic "sorry we
        // missed you" has no idea whether they even dialled the right number,
        // and a club greeting is the whole reason for having a club line.
        `<Say ${VOICE}>Thanks for calling Foundry Padel in Saint Johns. Sorry we missed you.</Say>` +
        // "dot com", spelled out, because Polly reads "foundrypadel.com" as a
        // URL and a caller writing it down needs to hear the words.
        `<Say ${VOICE}>Leave your name, number and what you're calling about, and we'll get back to you. Find our schedule and book a court at foundry padel dot com.</Say>` +
        // The beep runs straight into the end of the sentence before it without
        // this, and on the first real voicemail the caller never heard one and
        // did not know when to start.
        `<Pause length="1"/>` +
        `<Record maxLength="120" playBeep="true" trim="do-not-trim" timeout="5"` +
        ` transcribe="true" transcribeCallback="${escapeXml(done)}" action="${escapeXml(done)}" method="POST"/>` +
        `<Say ${VOICE}>We didn't catch that. Please call again, or book online at foundry padel dot com. Goodbye.</Say>` +
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
    const vm = {
      from: req.body?.From,
      callSid: req.body?.CallSid,
      seconds: req.body?.RecordingDuration,
      transcribed: Boolean(text),
    };
    console.log("[voicemail] %s", JSON.stringify(vm));
    observe("/transfer/voicemail", vm);

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
