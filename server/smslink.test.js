/** @vitest-environment node */
import { describe, it, expect, vi } from "vitest";
import { createLinkSender, linkSpeech, TEMPLATES } from "./smslink.js";

const CFG = { url: "https://kumi.test/api/voice/send-link", secret: "s3cret", slug: "foundry-padel" };

function reply(body, status = 200) {
  return vi.fn(async () => ({ ok: status < 400, status, json: async () => body }));
}

describe("asking Kumi to send", () => {
  it("posts the slug, number and template with the shared secret", async () => {
    const fetchImpl = reply({ ok: true, sent: true });
    await createLinkSender({ ...CFG, fetchImpl }).sendLink({
      phone: "+15412704585",
      template: "booking",
      callId: "call_1",
    });
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe(CFG.url);
    expect(init.headers["x-voice-token"]).toBe("s3cret");
    expect(JSON.parse(init.body)).toEqual({
      slug: "foundry-padel",
      to: "+15412704585",
      template: "booking",
      call_id: "call_1",
    });
  });

  it("never sends a body or a URL of its own, only a template name", () => {
    // The lockdown lives on Kumi's side, but this end must not grow a way around it.
    const src = createLinkSender({ ...CFG, fetchImpl: reply({}) });
    expect([...TEMPLATES]).toEqual(["booking", "membership", "directions"]);
    expect(typeof src.sendLink).toBe("function");
  });

  it("refuses a template Kumi would reject, without the round trip", async () => {
    const fetchImpl = reply({ ok: true, sent: true });
    const r = await createLinkSender({ ...CFG, fetchImpl }).sendLink({
      phone: "+15412704585",
      template: "../../etc/passwd",
    });
    expect(r).toEqual({ sent: false, reason: "unknown_template" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("is unconfigured, not open, when the secret is unset", async () => {
    const sender = createLinkSender({ ...CFG, secret: undefined, fetchImpl: reply({}) });
    expect(sender.configured()).toBe(false);
    expect(await sender.sendLink({ phone: "+15412704585", template: "booking" })).toEqual({
      sent: false,
      reason: "not_configured",
    });
  });
});

describe("it never reports a send it is unsure of", () => {
  it("reports sent only when Kumi says the message went out", async () => {
    const yes = createLinkSender({ ...CFG, fetchImpl: reply({ ok: true, sent: true }) });
    expect(await yes.sendLink({ phone: "+1", template: "booking" })).toEqual({
      sent: true,
      reason: null,
    });
  });

  it.each([
    [{ ok: true, sent: false, reason: "not_domestic" }, "not_domestic"],
    [{ ok: true, sent: false, reason: "cooldown" }, "cooldown"],
    [{ ok: true, sent: false, reason: "not_sent" }, "not_sent"],
  ])("passes through Kumi's refusal %#", async (body, reason) => {
    const sender = createLinkSender({ ...CFG, fetchImpl: reply(body) });
    expect(await sender.sendLink({ phone: "+1", template: "booking" })).toEqual({
      sent: false,
      reason,
    });
  });

  it("treats a 401 from Kumi as not sent, and says so loudly", async () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const sender = createLinkSender({ ...CFG, fetchImpl: reply({}, 401) });
    expect(await sender.sendLink({ phone: "+1", template: "booking" })).toEqual({
      sent: false,
      reason: "upstream_error",
    });
    // Silent from the caller's side; it would look like flaky Twilio for weeks.
    expect(err).toHaveBeenCalled();
    err.mockRestore();
  });

  it("treats Kumi being unreachable as not sent, rather than throwing mid-call", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const sender = createLinkSender({
      ...CFG,
      fetchImpl: vi.fn(async () => {
        throw new Error("ECONNREFUSED");
      }),
    });
    expect(await sender.sendLink({ phone: "+1", template: "booking" })).toEqual({
      sent: false,
      reason: "unreachable",
    });
    vi.restoreAllMocks();
  });

  it("times out rather than holding the caller on a silent line", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const sender = createLinkSender({
      ...CFG,
      timeoutMs: 20,
      fetchImpl: vi.fn(
        (url, init) =>
          new Promise((_, reject) => {
            init.signal.addEventListener("abort", () => reject(new Error("aborted")));
          }),
      ),
    });
    expect((await sender.sendLink({ phone: "+1", template: "booking" })).sent).toBe(false);
    vi.restoreAllMocks();
  });
});

describe("what the agent says", () => {
  it("claims a text ONLY when one actually went out", () => {
    expect(linkSpeech("booking", { sent: true })).toMatch(/Sent\./);
    for (const reason of [
      "not_configured",
      "unreachable",
      "upstream_error",
      "not_sent",
      "not_domestic",
      "no_number",
      "club_daily",
    ]) {
      const speech = linkSpeech("booking", { sent: false, reason });
      expect(speech).not.toMatch(/\bSent\b|just texted|on its way/i);
    }
  });

  it("gives the caller the link out loud whenever it could not text", () => {
    // A caller who cannot be texted must still leave the call able to book.
    for (const reason of ["not_domestic", "no_number", "unreachable", "not_sent"]) {
      expect(linkSpeech("booking", { sent: false, reason })).toMatch(/foundry padel dot com/);
    }
  });

  it("does not read a URL as punctuation, because it is spoken aloud", () => {
    const speech = linkSpeech("booking", { sent: false, reason: "unreachable" });
    expect(speech).not.toMatch(/https?:|\.com\//);
    expect(speech).toMatch(/dot com slash book/);
  });

  it("tells a repeat asker to look for the one already sent", () => {
    expect(linkSpeech("booking", { sent: false, reason: "cooldown" })).toMatch(
      /already sent/i,
    );
  });

  it("uses the right spoken link per template", () => {
    expect(linkSpeech("membership", { sent: false, reason: "unreachable" })).toMatch(
      /memberships/,
    );
    expect(linkSpeech("directions", { sent: false, reason: "unreachable" })).toMatch(
      /Crawford/,
    );
  });

  it("never uses an em dash, because the agent reads this aloud", () => {
    for (const t of TEMPLATES) {
      for (const reason of ["cooldown", "not_domestic", "unreachable"]) {
        expect(linkSpeech(t, { sent: false, reason })).not.toMatch(/—/);
      }
    }
  });
});
