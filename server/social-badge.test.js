/** @vitest-environment node */
/** The club's weekly socials are badged Open Play, not Tournament.
 *
 * "Midday Social 1.5+" read "Tournament" on the public schedule, which is the most
 * off-putting word the site could stamp on its most welcoming session.
 *
 * Playtomic cannot tell the two apart. The structural signal used to work, because
 * socials arrived typed UNKNOWN and were promoted (see effectiveBookingType), so "was
 * promoted" meant "is a social". A sweep of 499 live bookings on 2026-09-14 found no
 * UNKNOWN rows at all: the KOCs, the Americano and the four weekly socials now arrive
 * identically, as TOURNAMENT with a tournament_id. Hence a name rule, and hence this
 * file, which pins it against the real names in that sweep.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

let T;

beforeAll(async () => {
  process.env.SITE_DIST = mkdtempSync(path.join(tmpdir(), "social-test-"));
  ({ __testables: T } = await import("../server.js"));
});

const ev = (title, booking_type = "TOURNAMENT") => ({ title, booking_type });

describe("isSocialEvent", () => {
  // Every social on the club's calendar in the September sweep.
  it.each([
    "Midday Social 1.5+",
    "Afternoon Social 1.5+",
    "Evening Social 0 - 1.75",
    "Morning Social 0 - 1.75",
  ])("treats %s as open play", (title) => {
    expect(T.isSocialEvent(ev(title))).toBe(true);
  });

  // Every real tournament from the same sweep. These must keep the tournament badge.
  it.each([
    "Advanced KOC 3+",
    "High Intermediate KOC 2.5 - 3.5",
    "Intermediate KOC 1.75 - 2.75",
    "Intermediate Tournament",
    "Queen of the Court - Women Only",
    "Tournament 1.5 - 2.75",
    "Tournament 2.5 - 3.75",
    "Tournament 2.5+",
    "Tournament 2.75+",
  ])("leaves %s as a tournament", (title) => {
    expect(T.isSocialEvent(ev(title))).toBe(false);
  });

  it("leaves the Americano alone", () => {
    // Arguably open play too, but it is named for its format rather than called a
    // social. Guessing at that is Monica's call, not the renderer's.
    expect(T.isSocialEvent(ev("Beginner Friendly Americano 0 - 2"))).toBe(false);
  });

  it("matches on a whole word, so a championship is not a social", () => {
    expect(T.isSocialEvent(ev("Social Club Championship"))).toBe(true);
    expect(T.isSocialEvent(ev("Antisocial Doubles"))).toBe(false);
    expect(T.isSocialEvent(ev("Socialite Cup"))).toBe(false);
  });

  it("only ever reclassifies a tournament", () => {
    // The rule must not reach into clinics, courses or open matches, whatever they
    // happen to be called.
    for (const t of ["PUBLIC_CLASS", "COURSE_CLASS", "PRIVATE_CLASS", "OPEN_MATCH"]) {
      expect(T.isSocialEvent(ev("Saturday Social Clinic", t))).toBe(false);
    }
  });

  it("survives an event with no title", () => {
    expect(T.isSocialEvent({ booking_type: "TOURNAMENT" })).toBe(false);
    expect(T.isSocialEvent(ev(null))).toBe(false);
  });
});
