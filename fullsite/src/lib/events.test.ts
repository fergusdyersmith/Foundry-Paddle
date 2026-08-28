/** @vitest-environment node */
import { describe, it, expect } from "vitest";

import { isPastEvent } from "./events";
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
