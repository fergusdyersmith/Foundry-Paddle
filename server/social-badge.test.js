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

// A row as Playtomic sends it for a session the club published as OPEN PLAY.
const openPlayRow = (activity_name) => ({
  booking_id: "b1",
  activity_id: "a1",
  tournament_id: "6f79829c-d2a7-4ea8-ac60-c27746187545",
  booking_type: "OPEN_PLAY",
  activity_name,
  booking_start_date: "2026-10-01T18:00:00",
  booking_end_date: "2026-10-01T19:30:00",
  resource_name: "Court 1",
});

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

  // The structural signal, which arrived when the club stopped publishing its socials
  // as competitions. It outranks the name, so a social does not have to be CALLED one.
  it("trusts the Playtomic type over the name", () => {
    expect(
      T.isSocialEvent({
        title: "Thursday Round Robin",
        booking_type: "TOURNAMENT",
        playtomic_type: "OPEN_PLAY",
      }),
    ).toBe(true);
  });

  it("does not promote a real competition that happens to carry the type", () => {
    // TOURNAMENT in, TOURNAMENT out. Only OPEN_PLAY means open play.
    expect(
      T.isSocialEvent({
        title: "Advanced KOC 3+",
        booking_type: "TOURNAMENT",
        playtomic_type: "TOURNAMENT",
      }),
    ).toBe(false);
  });
});

/** The half that decides whether a session reaches the site at all.
 *
 *  EVENT_BOOKING_TYPES is an allowlist and OPEN_PLAY is not a member of it, so the
 *  normalisation below is the only reason a republished social still appears. Without
 *  it the club's two weekly socials drop off the public schedule silently, with no
 *  error anywhere, the day the programmes are rebuilt. */
describe("effectiveBookingType", () => {
  it("folds OPEN_PLAY into TOURNAMENT so the allowlist still publishes it", () => {
    expect(T.effectiveBookingType({ booking_type: "OPEN_PLAY" })).toBe("TOURNAMENT");
  });

  it("still promotes an UNKNOWN row that carries a tournament_id", () => {
    expect(
      T.effectiveBookingType({ booking_type: "UNKNOWN", tournament_id: "t1" }),
    ).toBe("TOURNAMENT");
  });

  it("leaves an UNKNOWN row with no tournament_id alone", () => {
    // A private booking must never be promoted onto the public schedule.
    expect(T.effectiveBookingType({ booking_type: "UNKNOWN" })).toBe("UNKNOWN");
  });

  it("passes every other type through untouched", () => {
    for (const bt of ["TOURNAMENT", "PUBLIC_CLASS", "COURSE_CLASS", "OPEN_MATCH"]) {
      expect(T.effectiveBookingType({ booking_type: bt })).toBe(bt);
    }
  });
});

/** End to end over the two steps, because the bug this guards against lives in the
 *  SEAM between them: fold the type too early and the badge is lost, too late and the
 *  event never reaches the page. */
describe("an open play session, from Playtomic row to badge", () => {
  it("is published as a tournament and badged as a social", () => {
    const e = T.mapBookingGroup([openPlayRow("Midday Social 1.5+")]);
    expect(e.booking_type).toBe("TOURNAMENT"); // survives the allowlist
    expect(e.playtomic_type).toBe("OPEN_PLAY"); // and still knows what it is
    expect(T.isSocialEvent(e)).toBe(true); // so it badges Open Play
  });

  it("keeps the deep link pointing at the event, not the club page", () => {
    // The OPEN_PLAY row has no case of its own in bookingDeepLink; it reaches the
    // tournament branch only because the type was folded first.
    expect(T.bookingDeepLink(openPlayRow("Midday Social 1.5+"))).toContain(
      "/tournaments/6f79829c-d2a7-4ea8-ac60-c27746187545",
    );
  });
});
