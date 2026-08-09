/** @vitest-environment node */
import { describe, it, expect, beforeAll } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

let T;

beforeAll(async () => {
  // server.js serves a prerendered dist/; point it at an empty temp dir so the
  // import is side-effect free (same trick as server/routing.test.js).
  process.env.SITE_DIST = mkdtempSync(path.join(tmpdir(), "events-test-"));
  ({ __testables: T } = await import("../server.js"));
});

// A real Midday Social, as Playtomic returns it: one row per court, sharing an
// activity_id and start time, typed UNKNOWN rather than TOURNAMENT. Note the
// trailing space on "Padel 4 " — that is what the API actually sends.
function socialRow(overrides = {}) {
  return {
    booking_id: "cb9eec20-1630-4b1d-8b16-30ec665de456",
    object_id: "11fb08f8-88f8-4e0c-9868-9b98804fd1fd",
    resource_id: "42889ff7-0de3-4ffa-9047-290536e823b3",
    resource_name: "Padel 4 ",
    booking_start_date: "2026-08-13T18:00:00",
    booking_end_date: "2026-08-13T20:00:00",
    duration: 7200000,
    origin: "MANAGER",
    price: "20 USD",
    booking_type: "UNKNOWN",
    tournament_id: "0feaf364-f7cf-460c-9801-16367bc76c89",
    activity_id: "0feaf364-f7cf-460c-9801-16367bc76c89",
    activity_name: "Midday Social: Intermediate & Up",
    participant_info: { owner_id: null, participants: [] },
    is_canceled: false,
    status: "PENDING",
    ...overrides,
  };
}

describe("manager-created socials reach the public schedule", () => {
  it("promotes an UNKNOWN booking that carries a tournament_id", () => {
    expect(T.effectiveBookingType(socialRow())).toBe("TOURNAMENT");
  });

  it("leaves a bare UNKNOWN alone, so it stays off the public schedule", () => {
    // UNKNOWN is a catch-all. Without a tournament_id we have no evidence this
    // is a public event, and publishing it could expose a private booking.
    const row = socialRow({ tournament_id: null, activity_id: null });
    expect(T.effectiveBookingType(row)).toBe("UNKNOWN");
  });

  it.each([
    ["COURSE_CLASS"],
    ["PUBLIC_CLASS"],
    ["PRIVATE_CLASS"],
    ["TOURNAMENT"],
    ["OPEN_MATCH"],
  ])("passes %s through untouched", (booking_type) => {
    expect(T.effectiveBookingType(socialRow({ booking_type }))).toBe(
      booking_type,
    );
  });

  it("deep-links a promoted social to its tournament page, not the club page", () => {
    expect(T.bookingDeepLink(socialRow())).toBe(
      "https://app.playtomic.com/tournaments/0feaf364-f7cf-460c-9801-16367bc76c89",
    );
  });

  it("maps a multi-court social into one event with the tournament type", () => {
    const group = [
      socialRow({ resource_name: "Padel 2" }),
      socialRow({ resource_name: "Padel 3" }),
      socialRow({ resource_name: "Padel 4 " }),
    ];
    const event = T.mapBookingGroup(group);

    expect(event.booking_type).toBe("TOURNAMENT");
    expect(event.title).toBe("Midday Social: Intermediate & Up");
    expect(event.court).toBe("3 courts");
    // 18:00 UTC is 11:00 in America/Los_Angeles — a midday social, as named.
    expect(event.start_time).toBe("11:00");
    expect(event.end_time).toBe("13:00");
    expect(event.date).toBe("2026-08-13");
  });

  it("groups the per-court rows by activity so it shows once, not four times", () => {
    const groups = T.groupEventBookings([
      socialRow({ booking_id: "a", resource_name: "Padel 1" }),
      socialRow({ booking_id: "b", resource_name: "Padel 2" }),
      socialRow({ booking_id: "c", resource_name: "Padel 3" }),
      socialRow({ booking_id: "d", resource_name: "Padel 4 " }),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0]).toHaveLength(4);
  });

  it("never renders a raw booking_type as a visitor-facing title", () => {
    const row = socialRow({ activity_name: null, course_name: null });
    expect(T.mapBookingGroup([row]).title).toBe("Tournament");
  });
});

describe("courts are called Court 1 to 4, not Padel 1 to 4", () => {
  it("renames what Playtomic calls them", () => {
    // Playtomic names the resources "Padel 1".."Padel 4". The club, the
    // website and the phone agent all say Court.
    expect(T.courtLabel("Padel 1")).toBe("Court 1");
    expect(T.courtLabel("Padel 4 ")).toBe("Court 4");
  });

  it("leaves an already-correct name alone", () => {
    expect(T.courtLabel("Court 3")).toBe("Court 3");
  });

  it("renames on the public events feed too, so nothing disagrees", () => {
    const event = T.mapBookingGroup([
      socialRow({ resource_name: "Padel 2" }),
      socialRow({ resource_name: "Padel 4 " }),
    ]);
    expect(event.courts).toEqual(["Court 2", "Court 4"]);
  });
});
