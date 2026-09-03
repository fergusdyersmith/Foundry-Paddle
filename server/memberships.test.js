/** @vitest-environment node
 *
 * The /memberships bar draws itself from whatever this proxy returns, so a bad upstream
 * payload is a rendering bug on the marketing page: "NaN of 100 claimed", or a filled bar
 * drawn past its own end. Everything unusable has to be rejected here, where the page can
 * still choose to show nothing.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

let T;

beforeAll(async () => {
  process.env.SITE_DIST = mkdtempSync(path.join(tmpdir(), "memberships-test-"));
  ({ __testables: T } = await import("../server.js"));
});

describe("the founding-membership count the website is given", () => {
  it("adds the Nike 16 to a real count and works out the seats left from it", () => {
    // The 16 Nike memberships are sold and sit outside the public 100. The club still
    // sells and tracks a hundred; only the published figure carries them.
    expect(T.normalizeMembershipCount({ cap: 100, sold: 29, pct_full: 29.0 })).toEqual({
      sold: 45,
      cap: 100,
      remaining: 55,
    });
  });

  it("drops the extra fields, so nothing else can leak onto the page", () => {
    const out = T.normalizeMembershipCount({ cap: 100, sold: 29, mrr_cents: 450000 });
    expect(Object.keys(out).sort()).toEqual(["cap", "remaining", "sold"]);
  });

  it("clamps an oversold count rather than publishing '101 of 100'", () => {
    expect(T.normalizeMembershipCount({ cap: 100, sold: 101 })).toEqual({
      sold: 100,
      cap: 100,
      remaining: 0,
    });
  });

  it("never shows the cap before the hundredth public membership is actually sold", () => {
    // The whole point of the taper. A bar reading "100 of 100" while seats remain is a
    // closed sign on an open shop, and 99 real sales lands on 99.5 of padding, which
    // rounds to a sold-out club one sale early.
    for (let real = 0; real < 100; real += 1) {
      expect(T.paddedSold(real, 100)).toBeLessThan(100);
    }
    expect(T.paddedSold(100, 100)).toBe(100);
  });

  it("only ever goes up, so a sale never shrinks the bar", () => {
    let prev = -1;
    for (let real = 0; real <= 100; real += 1) {
      const shown = T.paddedSold(real, 100);
      expect(shown).toBeGreaterThanOrEqual(prev);
      prev = shown;
    }
  });

  it("carries the full 16 until the taper begins, then sheds it", () => {
    expect(T.paddedSold(38, 100)).toBe(54);   // today, +16
    expect(T.paddedSold(68, 100)).toBe(84);   // last full boost
    expect(T.paddedSold(76, 100)).toBe(88);   // +12
    expect(T.paddedSold(84, 100)).toBe(92);   // +8
    expect(T.paddedSold(92, 100)).toBe(96);   // +4
    expect(T.paddedSold(99, 100)).toBe(99);   // +0 after flooring
  });

  it("keeps a sold-out club at 0 left", () => {
    expect(T.normalizeMembershipCount({ cap: 100, sold: 100 })).toEqual({
      sold: 100,
      cap: 100,
      remaining: 0,
    });
  });

  it("shows the Nike 16 even before the first public sale", () => {
    // Not an empty bar any more, and correctly so: those sixteen are sold. The figure
    // is only ever inflated relative to PUBLIC sales, never relative to reality.
    expect(T.normalizeMembershipCount({ cap: 100, sold: 0 })).toEqual({
      sold: 16,
      cap: 100,
      remaining: 84,
    });
  });

  it.each([
    ["a missing count", { cap: 100 }],
    ["a missing cap", { sold: 29 }],
    ["a non-numeric count", { cap: 100, sold: "twenty-nine" }],
    ["a negative count", { cap: 100, sold: -1 }],
    ["a zero cap, which has no bar to draw", { cap: 0, sold: 0 }],
    ["an error body", { error: "Club not found" }],
    ["nothing at all", null],
  ])("refuses %s", (_label, payload) => {
    expect(T.normalizeMembershipCount(payload)).toBeNull();
  });
});
