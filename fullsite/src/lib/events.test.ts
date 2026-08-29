/** @vitest-environment node */
import { describe, it, expect } from "vitest";

import { isFullEvent, isPastEvent, openFirst, signupSummary } from "./events";
import type { PadelEvent } from "@/types/events";

// The schedule now shows days that have already been, so a card can describe a session
// that is over. This is the rule that decides whether such a card still offers a BOOK
// button — i.e. whether the site sends someone to Playtomic to join last Tuesday's clinic.
describe("an event that has finished is marked past", () => {
  const NOW = new Date(2026, 7, 28, 14, 30); // Fri 28 Aug 2026, 2:30pm local

  function event(overrides: Partial<PadelEvent> = {}): PadelEvent {
    return {
      id: "e1",
      title: "Midweek Morning Clinic",
      date: "2026-08-28",
      start_time: "10:00",
      end_time: "11:30",
      duration_min: 90,
      price: null,
      booking_type: "PUBLIC_CLASS",
      court: "Court 1",
      signed_up: 3,
      book_url: "https://playtomic.com/x",
      ...overrides,
    };
  }

  it("counts an earlier day as past", () => {
    expect(isPastEvent(event({ date: "2026-08-27" }), NOW)).toBe(true);
  });

  it("counts a later day as upcoming, however early in the day it starts", () => {
    const tomorrow = event({ date: "2026-08-29", start_time: "07:00", end_time: "08:00" });
    expect(isPastEvent(tomorrow, NOW)).toBe(false);
  });

  it("counts this morning's clinic as past", () => {
    expect(isPastEvent(event(), NOW)).toBe(true);
  });

  it("counts tonight's session as upcoming", () => {
    expect(isPastEvent(event({ start_time: "18:00", end_time: "19:30" }), NOW)).toBe(false);
  });

  it("keeps a session under way right now bookable", () => {
    // Started at 2, ends at 3:30: still running, so still a live thing to walk into.
    expect(isPastEvent(event({ start_time: "14:00", end_time: "15:30" }), NOW)).toBe(false);
  });

  it("treats an event ending exactly now as over", () => {
    expect(isPastEvent(event({ start_time: "13:00", end_time: "14:30" }), NOW)).toBe(true);
  });

  it("compares dates by their zero-padded parts, not a loose string", () => {
    const jan = new Date(2026, 0, 9, 9, 0);
    expect(isPastEvent(event({ date: "2026-01-08" }), jan)).toBe(true);
    expect(isPastEvent(event({ date: "2026-01-10" }), jan)).toBe(false);
  });

  it("falls back to the start time when an event has no end time", () => {
    const noEnd = (start: string) =>
      isPastEvent(event({ start_time: start, end_time: "" }), NOW);
    expect(noEnd("09:00")).toBe(true);
    expect(noEnd("20:00")).toBe(false);
  });
});

// A 16-of-16 tournament read "16 signed up" with a live BOOK button next to it, which
// sent people to Playtomic to join something they could not join.
describe("an event with no spots left is marked full", () => {
  function event(o: Partial<PadelEvent> = {}): PadelEvent {
    return {
      id: "e1",
      title: "Intermediate Tournament",
      date: "2026-08-29",
      start_time: "10:00",
      end_time: "12:00",
      duration_min: 120,
      price: null,
      booking_type: "TOURNAMENT",
      court: "4 courts",
      signed_up: 16,
      capacity: 16,
      book_url: "https://playtomic.com/x",
      ...o,
    };
  }

  it("calls a tournament at its capacity full", () => {
    expect(isFullEvent(event())).toBe(true);
  });

  it("leaves one with a place left bookable", () => {
    expect(isFullEvent(event({ signed_up: 15 }))).toBe(false);
  });

  it("treats an oversubscribed event as full rather than letting it through", () => {
    expect(isFullEvent(event({ signed_up: 17 }))).toBe(true);
  });

  it("calls a 4-of-4 clinic full", () => {
    expect(isFullEvent(event({ booking_type: "PUBLIC_CLASS", signed_up: 4, capacity: 4 }))).toBe(
      true,
    );
  });

  it("never guesses when the capacity is unknown", () => {
    // Kumi's feed is what carries capacity; without it, null means unknown. Labelling a
    // live clinic FULL costs the club a booking, which is worse than the missing label.
    expect(isFullEvent(event({ capacity: null, signed_up: 40 }))).toBe(false);
    expect(isFullEvent(event({ capacity: undefined, signed_up: 40 }))).toBe(false);
    expect(isFullEvent(event({ capacity: 0, signed_up: 40 }))).toBe(false);
  });

  it("knows an open match holds four, since Playtomic publishes no maximum", () => {
    const match = { booking_type: "OPEN_MATCH", capacity: null };
    expect(isFullEvent(event({ ...match, signed_up: 4 }))).toBe(true);
    expect(isFullEvent(event({ ...match, signed_up: 3 }))).toBe(false);
  });

  it("spells the roster out against the capacity when there is one", () => {
    expect(signupSummary(event())).toBe("16 of 16 signed up");
    expect(signupSummary(event({ signed_up: 7, capacity: 8 }))).toBe("7 of 8 signed up");
    expect(signupSummary(event({ capacity: null, signed_up: 3 }))).toBe("3 signed up");
  });

  it("says nothing at all when nobody has signed up yet", () => {
    expect(signupSummary(event({ signed_up: 0 }))).toBe("");
  });
});

// Two of the four rows on /book's clinic list were sold-out clinics, sitting above ones
// that still had places. The list is what the page uses to fill sessions.
describe("clinics that can still be filled lead the list", () => {
  function clinic(id: string, signed_up: number, capacity: number | null = 4): PadelEvent {
    return {
      id,
      title: id,
      date: "2026-08-30",
      start_time: "09:00",
      end_time: "10:00",
      duration_min: 60,
      price: null,
      booking_type: "PUBLIC_CLASS",
      court: "Court 2",
      signed_up,
      capacity,
      book_url: "https://playtomic.com/x",
    };
  }
  const ids = (events: PadelEvent[]) => events.map((e) => e.id);
  const LIMITS = { openLimit: 4, fullLimit: 2 };

  it("puts the full ones underneath, whatever order they arrived in", () => {
    const list = [clinic("full-a", 4), clinic("open-a", 1), clinic("full-b", 4), clinic("open-b", 0)];
    expect(ids(openFirst(list, LIMITS))).toEqual(["open-a", "open-b", "full-a", "full-b"]);
  });

  it("keeps each group in the order the API gave it, which is by date and time", () => {
    const list = [clinic("mon", 0), clinic("tue", 1), clinic("wed", 2)];
    expect(ids(openFirst(list, LIMITS))).toEqual(["mon", "tue", "wed"]);
  });

  it("still shows full clinics on a week with more open ones than fit", () => {
    // The failure a single combined cap would cause: five open clinics and the sold-out
    // ones vanish from the page entirely.
    const list = [
      clinic("full-a", 4),
      ...[1, 2, 3, 4, 5].map((n) => clinic(`open-${n}`, 0)),
    ];
    expect(ids(openFirst(list, LIMITS))).toEqual([
      "open-1", "open-2", "open-3", "open-4", "full-a",
    ]);
  });

  it("caps the full ones too, so a quiet week is not a wall of sold-out rows", () => {
    const list = [1, 2, 3, 4].map((n) => clinic(`full-${n}`, 4));
    expect(ids(openFirst(list, LIMITS))).toEqual(["full-1", "full-2"]);
  });

  it("treats a clinic with no known capacity as open, never sinking it", () => {
    const list = [clinic("full-a", 4), clinic("unknown", 40, null)];
    expect(ids(openFirst(list, LIMITS))).toEqual(["unknown", "full-a"]);
  });

  it("returns an empty list unchanged", () => {
    expect(openFirst([], LIMITS)).toEqual([]);
  });
});
