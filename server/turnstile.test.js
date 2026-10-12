/** @vitest-environment node */
import { describe, expect, it, vi } from "vitest";
import { turnstileCheck } from "./turnstile.js";

function run(check, token) {
  const req = { path: "/api/juniors/waiver", headers: {}, socket: {}, get: (h) => (h.toLowerCase() === "cf-turnstile-response" ? token : undefined) };
  const res = { code: 200, body: null, status(c) { this.code = c; return this; }, json(b) { this.body = b; return this; } };
  const next = vi.fn();
  return check(req, res, next).then(() => ({ res, passed: next.mock.calls.length === 1 }));
}

const cloudflare = (answer) => vi.fn(async () => ({ json: async () => answer }));

describe("the Turnstile check", () => {
  it("does nothing until BOTH keys are set", async () => {
    const fetchImpl = cloudflare({ success: false });
    for (const keys of [{}, { secret: "s" }, { siteKey: "k" }]) {
      const check = turnstileCheck({ secret: undefined, siteKey: undefined, ...keys, fetchImpl });
      expect(check.enabled).toBe(false);
      expect((await run(check, "")).passed).toBe(true);
    }
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("refuses a request with no token once it is on", async () => {
    const out = await run(turnstileCheck({ secret: "s", siteKey: "k", fetchImpl: cloudflare({ success: true }) }), "");
    expect(out.passed).toBe(false);
    expect(out.res.code).toBe(400);
  });

  it("lets a token Cloudflare accepts through, and refuses one it does not", async () => {
    const ok = await run(turnstileCheck({ secret: "s", siteKey: "k", fetchImpl: cloudflare({ success: true }) }), "tok");
    expect(ok.passed).toBe(true);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const bad = await run(turnstileCheck({ secret: "s", siteKey: "k", fetchImpl: cloudflare({ success: false, "error-codes": ["invalid-input-response"] }) }), "tok");
    expect(bad.passed).toBe(false);
    expect(warn.mock.calls[0][0]).toContain("invalid-input-response");
    warn.mockRestore();
  });

  it("sends the secret and the token to Cloudflare", async () => {
    const fetchImpl = cloudflare({ success: true });
    await run(turnstileCheck({ secret: "s3", siteKey: "k", fetchImpl }), "tok");
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe("https://challenges.cloudflare.com/turnstile/v0/siteverify");
    expect(init.body.get("secret")).toBe("s3");
    expect(init.body.get("response")).toBe("tok");
  });

  it("lets the request through when Cloudflare cannot be reached", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const down = vi.fn(async () => { throw new Error("ETIMEDOUT"); });
    expect((await run(turnstileCheck({ secret: "s", siteKey: "k", fetchImpl: down }), "tok")).passed).toBe(true);
    warn.mockRestore();
  });
});
