/** @vitest-environment node */
import { describe, it, expect } from "vitest";
import express from "express";
import crypto from "node:crypto";
import { createTransferRouter, validSignature } from "./transfer.js";

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

async function boot({ ringTo = [JAKE, MONICA], notifier, callerId } = {}) {
  const app = express();
  app.use(express.json());
  app.use(createTransferRouter({ authToken: TOKEN, ringTo, notifier, callerId, publicUrl: PUBLIC }));
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
    expect(direct).toContain("Press any key");
    expect(direct).not.toContain("Foundry");
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
    expect(whisper).toContain("Press any key");
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
    // Empty TwiML ends the screening, and Twilio connects the caller.
    expect(xml).toBe("<Response></Response>");
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
