/**
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";
import { clientIp, rateLimit } from "./abuse.js";

const req = (xff, extra = {}) => ({ headers: xff ? { "x-forwarded-for": xff } : {}, socket: { remoteAddress: "10.0.0.9" }, ...extra });
const res = () => {
  const r = { statusCode: 200, headers: {}, body: null };
  r.setHeader = (k, v) => (r.headers[k] = v);
  r.status = (c) => ((r.statusCode = c), r);
  r.json = (b) => ((r.body = b), r);
  return r;
};

describe("clientIp", () => {
  it("takes the address Railway appended, not the one the client wrote", () => {
    expect(clientIp(req("6.6.6.6, 203.0.113.7"))).toBe("203.0.113.7");
    expect(clientIp(req("203.0.113.7"))).toBe("203.0.113.7");
  });

  it("falls back to the socket when there is no proxy header", () => {
    expect(clientIp(req(""))).toBe("10.0.0.9");
  });
});

describe("rateLimit", () => {
  it("lets `max` through per window, then answers 429 with a Retry-After", () => {
    const over = rateLimit({ name: "t", max: 2, windowMs: 60_000 });
    expect(over(req("1.1.1.1"), res())).toBe(false);
    expect(over(req("1.1.1.1"), res())).toBe(false);
    const third = res();
    expect(over(req("1.1.1.1"), third)).toBe(true);
    expect(third.statusCode).toBe(429);
    expect(third.body.error).toMatch(/try again/i);
    expect(Number(third.headers["Retry-After"])).toBeGreaterThan(0);
  });

  it("counts each client separately, and a forged first hop does not make a new client", () => {
    const over = rateLimit({ name: "t", max: 1, windowMs: 60_000 });
    expect(over(req("1.1.1.1"), res())).toBe(false);
    expect(over(req("2.2.2.2"), res())).toBe(false);
    expect(over(req("9.9.9.9, 1.1.1.1"), res())).toBe(true);
  });

  it("can key on something other than the address", () => {
    const over = rateLimit({ name: "t", max: 1, windowMs: 60_000, key: (r) => r.body.email });
    expect(over(req("1.1.1.1", { body: { email: "a@x" } }), res())).toBe(false);
    expect(over(req("2.2.2.2", { body: { email: "a@x" } }), res())).toBe(true);
  });
});

import { sheetCell, sheetSafe } from "./abuse.js";

describe("sheetCell", () => {
  it.each([
    ["=IMPORTXML(\"http://x\",\"//a\")", "'=IMPORTXML(\"http://x\",\"//a\")"],
    ["@SUM(A1)", "'@SUM(A1)"],
    ["+cmd|' /C calc'!A0", "'+cmd|' /C calc'!A0"],
    ["-HYPERLINK(\"x\")", "'-HYPERLINK(\"x\")"],
  ])("makes %s inert", (input, out) => {
    expect(sheetCell(input)).toBe(out);
  });

  it.each(["+1 503 555 0100", "+15035550100", "-5", "Jane O'Neil", "", "jane@example.com"])(
    "leaves %s alone",
    (input) => expect(sheetCell(input)).toBe(input),
  );

  it("walks a payload, skipping the keys it is told to", () => {
    const out = sheetSafe({ parent: { name: "=x" }, children: [{ name: "@y", html: "=keep" }], secret: "=s" }, new Set(["html", "secret"]));
    expect(out).toEqual({ parent: { name: "'=x" }, children: [{ name: "'@y", html: "=keep" }], secret: "=s" });
  });
});
