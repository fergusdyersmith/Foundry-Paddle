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
  it("passes the published count through with the seats left worked out", () => {
    // The figure arrives already carrying the 16 Nike memberships: Kumi applies that at
    // source, in membership_metrics.published_sold, so the bar and the chatbot answer
    // from one formula. This end only has to not mangle it.
    expect(T.normalizeMembershipCount({ cap: 100, sold: 54, pct_full: 54.0 })).toEqual({
      sold: 54,
      cap: 100,
      remaining: 46,
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

  it("still renders an empty bar if upstream ever reports zero", () => {
    expect(T.normalizeMembershipCount({ cap: 100, sold: 0 })).toEqual({
      sold: 0,
      cap: 100,
      remaining: 100,
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
