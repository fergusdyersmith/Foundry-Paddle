/** @vitest-environment node */
import { describe, it, expect } from "vitest";
import express from "express";
import crypto from "node:crypto";
import { createTransferRouter, validSignature, acceptedBySpeech } from "./transfer.js";

const TOKEN = "twilio-auth-token-for-tests";
const PUBLIC = "https://www.foundrypadel.com";
const JAKE = "+15035550101";
const MONICA = "+15035550202";

function sign(url, params) {
  const data = Object.keys(params)
    .sort()
    .reduce((acc, k) => acc + k + params[k], url);
  return crypto.createHmac("sha1", TOKEN).update(Buffer.from(data, "utf-8")).digest("base64");
}

async function boot({ ringTo = [JAKE, MONICA], notifier, callerId, aiFallbackUrl } = {}) {
  const app = express();
  app.use(express.json());
  app.use(
    createTransferRouter({ authToken: TOKEN, ringTo, notifier, callerId, aiFallbackUrl, publicUrl: PUBLIC }),
  );
  const listener = app.listen(0);
  await new Promise((r) => listener.once("listening", r));
  return {
    base: `http://127.0.0.1:${listener.address().port}`,
    close: () => new Promise((r) => listener.close(r)),
  };
}

/** Twilio signs against the PUBLIC url, not the localhost one the test hits. */
function post(ctx, path, params = {}, { signed = true } = {}) {
  return fetch(`${ctx.base}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      ...(signed ? { "x-twilio-signature": sign(`${PUBLIC}${path}`, params) } : {}),
    },
    body: new URLSearchParams(params).toString(),
  });
}

describe("only Twilio can ask where the call goes", () => {
  it("refuses an unsigned request rather than printing the owners' numbers", async () => {
    // The XML contains Jake's and Monica's personal mobiles. Anyone who can GET
    // or POST this endpoint has them, which is the exact leak that took an
    // owner's number out of the knowledge base.
    const ctx = await boot();
    const res = await post(ctx, "/api/voice/transfer", { CallSid: "CA1" }, { signed: false });
    expect(res.status).toBe(403);
    expect(await res.text()).not.toContain(JAKE);
    await ctx.close();
  });

  it("refuses a signature computed over different parameters", async () => {
    const ctx = await boot();
    const res = await fetch(`${ctx.base}/api/voice/transfer`, {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        "x-twilio-signature": sign(`${PUBLIC}/api/voice/transfer`, { CallSid: "CA1" }),
      },
      body: new URLSearchParams({ CallSid: "CA-tampered" }).toString(),
    });
    expect(res.status).toBe(403);
    await ctx.close();
  });

  it("accepts a properly signed request", async () => {
    const ctx = await boot();
    const res = await post(ctx, "/api/voice/transfer", { CallSid: "CA1", From: "+15417770000" });
    expect(res.status).toBe(200);
    await ctx.close();
  });

  it("does not fall for an empty signature when the token is unset", () => {
    expect(validSignature({ authToken: "", url: PUBLIC, params: {}, signature: "" })).toBe(false);
    expect(validSignature({ authToken: TOKEN, url: PUBLIC, params: {}, signature: "" })).toBe(false);
  });
});

describe("both phones ring at once", () => {
  it("dials every number in one Dial, so whoever is free answers first", async () => {
    const ctx = await boot();
    const xml = await (await post(ctx, "/api/voice/transfer", { CallSid: "CA1" })).text();
    expect(xml).toContain(JAKE);
    expect(xml).toContain(MONICA);
    // One Dial with two Numbers is simultaneous. Two Dials would be sequential
    // and would double the time a caller waits.
    expect(xml.match(/<Dial/g)).toHaveLength(1);
    await ctx.close();
  });

  it("lets the caller hear ringing rather than silence", async () => {
    const ctx = await boot();
    const xml = await (await post(ctx, "/api/voice/transfer", { CallSid: "CA1" })).text();
    expect(xml).toContain('answerOnBridge="true"');
    await ctx.close();
  });

  it("whispers to the owner so it is not just an unknown Portland number", async () => {
    const ctx = await boot();
    const xml = await (await post(ctx, "/api/voice/transfer", { CallSid: "CA1" })).text();
    expect(xml).toContain("/api/voice/transfer/whisper");

    // The club line and an agent transfer are different situations, and the
    // owner deserves to know which one is on the other end.
    // Caller ID already names the club, so the whisper does not repeat it. An
    // agent transfer still says so, because that is the one thing the screen
    // cannot tell them: somebody has already spoken to this caller.
    const direct = await (await post(ctx, "/api/voice/transfer/whisper", { CallSid: "CA1" })).text();
    // Caller ID already names the club, so the first prompt is one short line.
    expect(direct).toContain("Say yes to connect the call");
    expect(direct).not.toContain("Foundry Padel call");
    const agent = await (
      await post(ctx, "/api/voice/transfer/whisper?src=agent", { CallSid: "CA1" })
    ).text();
    expect(agent).toContain("Front desk transfer");
    await ctx.close();
  });

  it("says something rather than dropping the caller when nobody is configured", async () => {
    // They have already been told they are being put through.
    const ctx = await boot({ ringTo: [] });
    const xml = await (await post(ctx, "/api/voice/transfer", { CallSid: "CA1" })).text();
    expect(xml).toContain("<Say");
    expect(xml).toContain("<Hangup/>");
    await ctx.close();
  });
});

describe("when nobody picks up", () => {
  it("does not ask an agent-transferred caller for a message twice", async () => {
    // The receptionist took one before transferring. Asking again says nobody
    // was listening the first time.
    const ctx = await boot();
    const xml = await (
      await post(ctx, "/api/voice/transfer/after?src=agent", {
        CallSid: "CA1",
        DialCallStatus: "no-answer",
      })
    ).text();
    expect(xml).toContain("We have your message");
    expect(xml).not.toContain("<Record");
    await ctx.close();
  });

  it("takes a voicemail when the club line rings out, since nobody took a message", async () => {
    const ctx = await boot();
    const xml = await (
      await post(ctx, "/api/voice/transfer/after", { CallSid: "CA1", DialCallStatus: "no-answer" })
    ).text();
    expect(xml).toContain("<Record");
    // Say who they reached. A generic apology leaves a caller unsure they even
    // dialled the right club.
    expect(xml).toContain("Foundry Padel");
    // A beep the caller can actually hear, not one clipped by the sentence
    // before it.
    expect(xml).toContain('playBeep="true"');
    expect(xml).toContain("<Pause");
    await ctx.close();
  });

  it.each([["busy"], ["failed"], ["canceled"]])(
    "treats %s the same as no answer",
    async (status) => {
      const ctx = await boot();
      const xml = await (
        await post(ctx, "/api/voice/transfer/after", { CallSid: "CA1", DialCallStatus: status })
      ).text();
      expect(xml).toContain("<Record");
      await ctx.close();
    },
  );

  it("sends a completed call to voicemail when no PERSON took it", async () => {
    // The bug that lost a real caller. Jake did not answer, his carrier
    // voicemail did, and Twilio reported "completed" because it cannot tell the
    // two apart. Trusting that status hung up on the caller and left the
    // message on one owner's personal phone.
    const ctx = await boot();
    const xml = await (
      await post(ctx, "/api/voice/transfer/after?parent=CA-vm", {
        CallSid: "CA1",
        DialCallStatus: "completed",
      })
    ).text();
    expect(xml).toContain("<Record");
    await ctx.close();
  });

  it("stays quiet after a call a person actually accepted", async () => {
    // Otherwise the apology plays at the caller the moment a real conversation
    // ends.
    const ctx = await boot();
    await post(ctx, "/api/voice/transfer/accept?parent=CA-live", { CallSid: "CA-leg", Digits: "1" });
    const xml = await (
      await post(ctx, "/api/voice/transfer/after?parent=CA-live", {
        CallSid: "CA1",
        DialCallStatus: "completed",
      })
    ).text();
    expect(xml).toContain("<Hangup/>");
    expect(xml).not.toContain("<Record");
    await ctx.close();
  });
});

describe("a voicemail nobody listens to is a lost customer", () => {
  function spyNotifier() {
    const calls = [];
    return {
      calls,
      configured: () => true,
      notifyMessage: async (r) => {
        calls.push(r);
        return { delivered: true, channel: "slack" };
      },
    };
  }

  it("posts the recording to Slack the moment it exists, not when the transcript does", async () => {
    // Twilio's transcript can be a minute behind. Waiting for it would leave a
    // caller unanswered for that minute with nothing in the channel to show it.
    const notifier = spyNotifier();
    const ctx = await boot({ notifier });
    await post(ctx, "/api/voice/transfer/voicemail", {
      CallSid: "CA-vm",
      From: "+15417770000",
      RecordingUrl: "https://api.twilio.com/rec/RE123",
      RecordingDuration: "18",
    });
    await new Promise((r) => setTimeout(r, 20));

    expect(notifier.calls).toHaveLength(1);
    expect(notifier.calls[0].recordingUrl).toBe("https://api.twilio.com/rec/RE123.mp3");
    expect(notifier.calls[0].reason).toContain("Listen to the recording");
    expect(notifier.calls[0].phone).toBe("+15417770000");
    await ctx.close();
  });

  it("carries the same call id both times, so the transcript edits the card", async () => {
    const notifier = spyNotifier();
    const ctx = await boot({ notifier });
    const body = { CallSid: "CA-vm", From: "+15417770000", RecordingUrl: "https://x/RE1" };
    await post(ctx, "/api/voice/transfer/voicemail", body);
    await post(ctx, "/api/voice/transfer/voicemail", {
      ...body,
      TranscriptionText: "Hi, it's Dana, wondering about court hire Saturday.",
    });
    await new Promise((r) => setTimeout(r, 20));

    expect(notifier.calls.map((c) => c.callId)).toEqual(["CA-vm", "CA-vm"]);
    expect(notifier.calls[1].reason).toContain("Dana");
    await ctx.close();
  });

  it("hangs up straight away rather than making the caller wait on Slack", async () => {
    const ctx = await boot({ notifier: spyNotifier() });
    const xml = await (
      await post(ctx, "/api/voice/transfer/voicemail", { CallSid: "CA-vm" })
    ).text();
    expect(xml).toContain("<Hangup/>");
    await ctx.close();
  });

  it("still refuses an unsigned voicemail callback", async () => {
    const notifier = spyNotifier();
    const ctx = await boot({ notifier });
    const res = await post(ctx, "/api/voice/transfer/voicemail", { CallSid: "CA-vm" }, { signed: false });
    expect(res.status).toBe(403);
    expect(notifier.calls).toHaveLength(0);
    await ctx.close();
  });
});

describe("checking whether a call worked should be one request", () => {
  it("records ring group calls where /api/voice/_recent can see them", async () => {
    // Two real calls landed and _recent showed nothing, because only the AI
    // tool endpoints wrote to it. Confirming the ring group worked meant
    // reading Railway logs, which is the detour _recent exists to remove.
    const recentLog = [];
    const app = express();
    app.use(express.json());
    app.use(createTransferRouter({ authToken: TOKEN, ringTo: [JAKE, MONICA], publicUrl: PUBLIC, recentLog }));
    const listener = app.listen(0);
    await new Promise((r) => listener.once("listening", r));
    const ctx = { base: `http://127.0.0.1:${listener.address().port}` };

    await post(ctx, "/api/voice/transfer", { CallSid: "CA1", From: "+15417770000" });
    await post(ctx, "/api/voice/transfer/after", { CallSid: "CA1", DialCallStatus: "no-answer" });

    expect(recentLog.map((r) => r.path)).toEqual(["/transfer/after", "/transfer"]);
    expect(recentLog[0].body.answeredByPerson).toBe(false);
    expect(recentLog[1].body.from).toBe("+15417770000");
    await new Promise((r) => listener.close(r));
  });
});

describe("voicemail must not be able to answer for a person", () => {
  it("asks whoever picks up to press a key, since voicemail never will", async () => {
    const ctx = await boot();
    const xml = await (await post(ctx, "/api/voice/transfer", { CallSid: "CA-p" })).text();
    const whisper = await (
      await post(ctx, "/api/voice/transfer/whisper?parent=CA-p", { CallSid: "CA-leg" })
    ).text();

    expect(xml).toContain("parent=CA-p");
    expect(whisper).toContain("<Gather");
    expect(whisper).toContain("Say yes to connect");
    // No key, no bridge. Better a caller hears our voicemail than someone's
    // personal greeting.
    expect(whisper).toContain("<Hangup/>");
    await ctx.close();
  });

  it("bridges as soon as a key is pressed", async () => {
    const ctx = await boot();
    const xml = await (
      await post(ctx, "/api/voice/transfer/accept?parent=CA-p", { CallSid: "CA-leg", Digits: "5" })
    ).text();
    // Tells the owner the caller is now on the line, then ends, which bridges.
    expect(xml).toContain("Connecting you now");
    await ctx.close();
  });

  it("does not carry an acceptance over into the next call", async () => {
    const ctx = await boot();
    await post(ctx, "/api/voice/transfer/accept?parent=CA-first", { CallSid: "L1", Digits: "1" });
    // A second call on the same parent id would otherwise inherit it and skip
    // voicemail for a call nobody picked up.
    await post(ctx, "/api/voice/transfer", { CallSid: "CA-first" });
    const xml = await (
      await post(ctx, "/api/voice/transfer/after?parent=CA-first", {
        CallSid: "L2",
        DialCallStatus: "completed",
      })
    ).text();
    expect(xml).toContain("<Record");
    await ctx.close();
  });

  it("rings for less time than a carrier waits before answering", async () => {
    // Carrier voicemail picks up around twenty to twenty five seconds. The
    // keypress stops it swallowing a call; this stops it competing for one.
    const ctx = await boot();
    const xml = await (await post(ctx, "/api/voice/transfer", { CallSid: "CA-p" })).text();
    const timeout = Number(xml.match(/timeout="(\d+)"/)[1]);
    expect(timeout).toBeLessThan(20);
    await ctx.close();
  });
});

describe("what the owners' phones show", () => {
  it("shows the club line, so it can be saved as a contact and named", async () => {
    const ctx = await boot({ callerId: "+19715217887" });
    const xml = await (await post(ctx, "/api/voice/transfer", { CallSid: "CA-p" })).text();
    expect(xml).toContain('callerId="+19715217887"');
    await ctx.close();
  });

  it("posts every club call to Slack, since the caller's number no longer reaches the handset", async () => {
    const calls = [];
    const notifier = {
      configured: () => true,
      notifyMessage: async (r) => {
        calls.push(r);
        return { delivered: true, channel: "slack" };
      },
    };
    const ctx = await boot({ notifier, callerId: "+19715217887" });
    await post(ctx, "/api/voice/transfer/after?parent=CA-p", {
      CallSid: "CA1",
      From: "+15417770000",
      DialCallStatus: "no-answer",
    });
    await new Promise((r) => setTimeout(r, 20));

    expect(calls[0].phone).toBe("+15417770000");
    expect(calls[0].needsCallback).toBe(true);
    await ctx.close();
  });
});

describe("answering hands free", () => {
  it("connects on a spoken yes as well as a keypress", async () => {
    const ctx = await boot();
    const spoken = await (
      await post(ctx, "/api/voice/transfer/accept?parent=CA-s", { CallSid: "L", SpeechResult: "Yeah hello" })
    ).text();
    expect(spoken).toContain("Connecting you now");

    const xml = await (
      await post(ctx, "/api/voice/transfer/after?parent=CA-s", { CallSid: "P", DialCallStatus: "completed" })
    ).text();
    expect(xml).toContain("<Hangup/>");
    expect(xml).not.toContain("<Record");
    await ctx.close();
  });

  it.each([
    ["Hi, this is Jake, leave a message after the tone"],
    ["Hello, you have reached Monica"],
    ["Hi this is Jake I cant take your call right now"],
    ["Please leave your message after the beep"],
    ["Hi its Monica from Foundry Padel please leave a message"],
  ])("does not treat %s as a person answering", (greeting) => {
    // The trap: the most natural way to answer a phone is "hello", and the most
    // common way to open a voicemail greeting is also "hello". A word list
    // alone waves "Hi, this is Jake" straight through.
    expect(acceptedBySpeech(greeting)).toBe(false);
  });

  it.each([["yes"], ["Hello"], ["hi"], ["yeah hello"], ["speaking"], ["go ahead"]])(
    "treats %s as a person answering",
    (said) => {
      expect(acceptedBySpeech(said)).toBe(true);
    },
  );

  it("asks again before hanging up on something it could not classify", async () => {
    // Strict costs an owner who answered oddly their call; lenient hands the
    // caller to a voicemail. A second prompt tells them apart: a person answers
    // it, a greeting talks straight past it.
    const ctx = await boot();
    const first = await (
      await post(ctx, "/api/voice/transfer/accept?parent=CA-x", { CallSid: "L", SpeechResult: "uh" })
    ).text();
    expect(first).toContain("<Gather");
    expect(first).toContain("Sorry");

    const second = await (
      await post(ctx, "/api/voice/transfer/accept?parent=CA-x&retry=1", {
        CallSid: "L",
        SpeechResult: "uh",
      })
    ).text();
    expect(second).toContain("<Hangup/>");
    expect(second).not.toContain("<Gather");
    await ctx.close();
  });

  it("is not fooled by a voicemail greeting, which is also speech", async () => {
    // "Say anything to connect" would hand every call to whichever voicemail
    // answered first, which is the exact bug the screening exists to stop.
    const ctx = await boot();
    const greeting = await (
      await post(ctx, "/api/voice/transfer/accept?parent=CA-vm", {
        CallSid: "L",
        SpeechResult: "You have reached the voicemail of Jake. Please leave a message after the tone.",
      })
    ).text();
    // First response is a re-prompt; the greeting will not answer it either.
    expect(greeting).toContain("<Gather");

    const xml = await (
      await post(ctx, "/api/voice/transfer/after?parent=CA-vm", {
        CallSid: "P",
        DialCallStatus: "completed",
      })
    ).text();
    expect(xml).toContain("<Record");
    await ctx.close();
  });

  it("offers both routes in the prompt", async () => {
    const ctx = await boot();
    const xml = await (
      await post(ctx, "/api/voice/transfer/whisper?parent=CA-p", { CallSid: "L" })
    ).text();
    expect(xml).toContain('input="dtmf speech"');
    // A keypress still works; the second prompt is where it gets mentioned,
    // because by then speech has already failed once.
    expect(xml).toContain("Say yes to connect the call");
    expect(xml).toContain("press any key");
    await ctx.close();
  });
});

describe("what Jake actually hears when he answers", () => {
  it("prompts twice, because people say hello before the first prompt lands", async () => {
    // The reflexive "hello" happens the instant they answer, before Twilio is
    // listening. One gather plus a hangup would drop the caller while an owner
    // stood there holding a silent phone.
    const ctx = await boot();
    const xml = await (
      await post(ctx, "/api/voice/transfer/whisper?parent=CA-p", { CallSid: "L" })
    ).text();
    expect(xml.match(/<Gather/g)).toHaveLength(2);
    expect(xml).toContain("retry=1");
    // Only after both go unanswered.
    expect(xml.indexOf("<Hangup/>")).toBeGreaterThan(xml.lastIndexOf("</Gather>"));
    await ctx.close();
  });

  it("keeps the first prompt to one line, since caller ID names the club", async () => {
    const ctx = await boot();
    const xml = await (
      await post(ctx, "/api/voice/transfer/whisper?parent=CA-p", { CallSid: "L" })
    ).text();
    const first = xml.slice(xml.indexOf("<Say"), xml.indexOf("</Say>"));
    expect(first).toContain("Say yes to connect the call");
    expect(first.length).toBeLessThan(70);
    await ctx.close();
  });

  it("tells them the caller is on the line rather than bridging in silence", async () => {
    const ctx = await boot();
    const xml = await (
      await post(ctx, "/api/voice/transfer/accept?parent=CA-p", { CallSid: "L", Digits: "1" })
    ).text();
    expect(xml).toContain("Connecting you now");
    await ctx.close();
  });
});

describe("when nobody answers, the receptionist picks up", () => {
  const BLAND = "https://server.aws.dc8.bland.ai/incoming?encrypted_key=k&user_id=u";

  it("hands the live call over rather than dialling a second one", async () => {
    // Redirect reuses the call that already exists: no second leg, no second
    // number, no second per-minute charge, and the caller does not hear it ring
    // again.
    const ctx = await boot({ aiFallbackUrl: BLAND });
    const xml = await (
      await post(ctx, "/api/voice/transfer/after?parent=CA-ai1", {
        CallSid: "CA1",
        DialCallStatus: "no-answer",
      })
    ).text();
    expect(xml).toContain("<Redirect");
    expect(xml).toContain("encrypted_key=k");
    expect(xml).not.toContain("<Dial");
    expect(xml).not.toContain("<Record");
    await ctx.close();
  });

  it("still hangs up quietly when a person took the call", async () => {
    const ctx = await boot({ aiFallbackUrl: BLAND });
    await post(ctx, "/api/voice/transfer/accept?parent=CA-live", { CallSid: "L", Digits: "1" });
    const xml = await (
      await post(ctx, "/api/voice/transfer/after?parent=CA-live", {
        CallSid: "CA1",
        DialCallStatus: "completed",
      })
    ).text();
    expect(xml).toContain("<Hangup/>");
    expect(xml).not.toContain("<Redirect");
    await ctx.close();
  });

  it("does not post a missed-call card the agent is about to improve on", async () => {
    // The agent's own summary says what the caller wanted. "Nobody answered"
    // beside it is just a second row to work through.
    const calls = [];
    const notifier = {
      configured: () => true,
      notifyMessage: async (r) => {
        calls.push(r);
        return { delivered: true, channel: "slack" };
      },
    };
    const ctx = await boot({ aiFallbackUrl: BLAND, notifier });
    await post(ctx, "/api/voice/transfer/after?parent=CA-ai2", {
      CallSid: "CA1",
      From: "+15417770000",
      DialCallStatus: "no-answer",
    });
    await new Promise((r) => setTimeout(r, 20));
    expect(calls).toHaveLength(0);
    await ctx.close();
  });

  it("falls back to voicemail when no AI is configured", async () => {
    const ctx = await boot();
    const xml = await (
      await post(ctx, "/api/voice/transfer/after?parent=CA-ai3", {
        CallSid: "CA1",
        DialCallStatus: "no-answer",
      })
    ).text();
    expect(xml).toContain("<Record");
    await ctx.close();
  });
});

describe("who answered", () => {
  it("names the owner who took the call, not just the club line", async () => {
    // "Answered on the club line" leaves the other owner wondering whether to
    // call back. "Jake answered" closes the card.
    const calls = [];
    const notifier = {
      configured: () => true,
      notifyMessage: async (r) => {
        calls.push(r);
        return { delivered: true, channel: "slack" };
      },
    };
    const ctx = await boot({ ringTo: ["Jake:+15035550101", "Monica:+15035550202"], notifier });

    await post(ctx, "/api/voice/transfer/accept?parent=CA-who", {
      CallSid: "leg",
      Digits: "1",
      // On the answering leg this is the number that picked up.
      To: "+15035550202",
    });
    await post(ctx, "/api/voice/transfer/after?parent=CA-who", {
      CallSid: "CA-who",
      From: "+15417770000",
      DialCallStatus: "completed",
    });
    await new Promise((r) => setTimeout(r, 20));

    expect(calls[0].reason).toContain("Monica");
    await ctx.close();
  });

  it("dials a labelled number without the label reaching the caller", async () => {
    const ctx = await boot({ ringTo: ["Jake:+15035550101"] });
    const xml = await (await post(ctx, "/api/voice/transfer", { CallSid: "CA-lbl" })).text();
    expect(xml).toContain("+15035550101");
    expect(xml).not.toContain("Jake");
    await ctx.close();
  });

  it("still works for a bare number with no label", async () => {
    const calls = [];
    const notifier = {
      configured: () => true,
      notifyMessage: async (r) => {
        calls.push(r);
        return { delivered: true, channel: "slack" };
      },
    };
    const ctx = await boot({ ringTo: ["+15035550101"], notifier });
    await post(ctx, "/api/voice/transfer/accept?parent=CA-bare", {
      CallSid: "leg",
      Digits: "1",
      To: "+15035550101",
    });
    await post(ctx, "/api/voice/transfer/after?parent=CA-bare", {
      CallSid: "CA-bare",
      DialCallStatus: "completed",
    });
    await new Promise((r) => setTimeout(r, 20));
    expect(calls[0].reason).toContain("Someone answered");
    await ctx.close();
  });
});
