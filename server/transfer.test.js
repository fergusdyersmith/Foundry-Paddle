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

async function boot({ ringTo = [JAKE, MONICA] } = {}) {
  const app = express();
  app.use(express.json());
  app.use(createTransferRouter({ authToken: TOKEN, ringTo, publicUrl: PUBLIC }));
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

    const whisper = await (await post(ctx, "/api/voice/transfer/whisper", { CallSid: "CA1" })).text();
    expect(whisper).toContain("Foundry Padel front desk");
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
  it("answers as the club, not as somebody's personal voicemail", async () => {
    const ctx = await boot();
    const xml = await (
      await post(ctx, "/api/voice/transfer/after", { CallSid: "CA1", DialCallStatus: "no-answer" })
    ).text();
    expect(xml).toContain("nobody's free");
    expect(xml).toContain("someone will get back to you");
    await ctx.close();
  });

  it.each([["busy"], ["failed"], ["canceled"]])(
    "treats %s the same as no answer",
    async (status) => {
      const ctx = await boot();
      const xml = await (
        await post(ctx, "/api/voice/transfer/after", { CallSid: "CA1", DialCallStatus: status })
      ).text();
      expect(xml).toContain("someone will get back to you");
      await ctx.close();
    },
  );

  it("stays quiet after a call that actually happened", async () => {
    // Without this the apology plays at the caller the moment a real, finished
    // conversation ends.
    const ctx = await boot();
    const xml = await (
      await post(ctx, "/api/voice/transfer/after", { CallSid: "CA1", DialCallStatus: "completed" })
    ).text();
    expect(xml).toContain("<Hangup/>");
    expect(xml).not.toContain("<Say");
    await ctx.close();
  });
});
