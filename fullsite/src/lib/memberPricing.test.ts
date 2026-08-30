/** @vitest-environment node */
import { describe, expect, it } from "vitest";

import { isPeakEvent, memberPrice } from "./events";
import { OFF_PEAK_LABELS, PEAK_LABELS } from "@/constants/memberPricing";
import type { PadelEvent } from "@/types/events";

// September 2026: the 3rd is a Thursday, the 5th a Saturday, the 6th a Sunday,
// the 7th a Monday.
function event(o: Partial<PadelEvent> = {}): PadelEvent {
  return {
    id: "e1",
    title: "Midday Social 1.5+",
    date: "2026-09-03",
    start_time: "11:00",
    end_time: "12:30",
    duration_min: 90,
    price: "$20",
    booking_type: "TOURNAMENT",
    court: "3 courts",
    signed_up: 0,
    book_url: "https://playtomic.com/x",
    ...o,
  };
}

// The club prices clinics and tournaments by TIME, not by product: off peak they are
// discounted the same on every tier, which is the only reason one "members pay X" figure
// can be true. At peak everyone pays the same and members draw on their monthly credit.
describe("peak and off peak follow the windows printed on /memberships", () => {
  it("is peak on a weekday evening, 4pm to 10pm", () => {
    expect(isPeakEvent(event({ date: "2026-09-07", start_time: "16:00" }))).toBe(true); // Mon
    expect(isPeakEvent(event({ date: "2026-09-03", start_time: "21:30" }))).toBe(true); // Thu
  });

  it("is off peak on a weekday morning and after 10pm", () => {
    expect(isPeakEvent(event({ date: "2026-09-07", start_time: "15:59" }))).toBe(false);
    expect(isPeakEvent(event({ date: "2026-09-07", start_time: "06:00" }))).toBe(false);
    // 10pm exactly: the window ends there, so the session is off peak.
    expect(isPeakEvent(event({ date: "2026-09-07", start_time: "22:00" }))).toBe(false);
  });

  it("flips at the weekend: daytime is peak, evening is not", () => {
    expect(isPeakEvent(event({ date: "2026-09-05", start_time: "06:00" }))).toBe(true); // Sat
    expect(isPeakEvent(event({ date: "2026-09-06", start_time: "15:59" }))).toBe(true); // Sun
    expect(isPeakEvent(event({ date: "2026-09-05", start_time: "16:00" }))).toBe(false);
    expect(isPeakEvent(event({ date: "2026-09-06", start_time: "23:00" }))).toBe(false);
  });

  it("classifies every window the page puts in words", () => {
    // Pins the printed lines to the arithmetic: change one without the other and this
    // fails rather than a wrong price reaching a visitor.
    expect(PEAK_LABELS).toEqual(["Monday to Friday, 4pm–10pm", "Saturday & Sunday, 6am–4pm"]);
    expect(OFF_PEAK_LABELS[0]).toContain("6am–4pm and 10pm–midnight");
    expect(OFF_PEAK_LABELS[1]).toContain("4pm–midnight");
  });
});

describe("what a member pays for a session", () => {
  it("halves an off-peak tournament", () => {
    expect(memberPrice(event())).toBe("$10");
  });

  it("takes a quarter off an off-peak clinic or course", () => {
    expect(memberPrice(event({ booking_type: "PUBLIC_CLASS", price: "$30" }))).toBe("$22.50");
    expect(memberPrice(event({ booking_type: "COURSE_CLASS", price: "$40" }))).toBe("$30");
  });

  it("says nothing at peak, where a member pays the same and uses their credit", () => {
    expect(memberPrice(event({ date: "2026-09-07", start_time: "20:00", booking_type: "PUBLIC_CLASS", price: "$50" }))).toBeNull();
    expect(memberPrice(event({ date: "2026-09-06", start_time: "09:00", price: "$25" }))).toBeNull();
  });

  it("plays an off-peak open match free, on every tier", () => {
    // Unlimited off-peak play covers a member's place in an open match — the club states
    // it in as many words. "Free" is an answer, so it must not fall out as null.
    expect(memberPrice(event({ booking_type: "OPEN_MATCH", price: "$15" }))).toBe("Free");
    expect(memberPrice(event({ booking_type: "OPEN_MATCH", price: "22.50 USD" }))).toBe("Free");
  });

  it("says nothing about a PEAK open match, where the benefit runs per tier", () => {
    // 25% or 50% off a member's share, or nothing at all on Student. No single figure.
    const peak = { booking_type: "OPEN_MATCH", date: "2026-09-07", start_time: "18:00" };
    expect(memberPrice(event({ ...peak, price: "$22.50" }))).toBeNull();
  });

  it("still needs a published price before it will say Free", () => {
    // No price is not "we know it is free", it is "we know nothing about this session".
    expect(memberPrice(event({ booking_type: "OPEN_MATCH", price: null }))).toBeNull();
  });

  it("says nothing when the price itself is unknown", () => {
    expect(memberPrice(event({ price: null }))).toBeNull();
    expect(memberPrice(event({ price: "Free" }))).toBeNull();
    expect(memberPrice(event({ price: "$0" }))).toBeNull();
  });

  it("reads a raw Playtomic price as well as a formatted one", () => {
    expect(memberPrice(event({ price: "20 USD" }))).toBe("$10");
    expect(memberPrice(event({ booking_type: "PUBLIC_CLASS", price: "37.50 USD" }))).toBe("$28.13");
  });

  it("keeps cents only when there are cents", () => {
    expect(memberPrice(event({ price: "$25" }))).toBe("$12.50");
    expect(memberPrice(event({ price: "$30" }))).toBe("$15");
  });
});
