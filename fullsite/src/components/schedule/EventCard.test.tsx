import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import EventCard from "./EventCard";
import type { PadelEvent } from "@/types/events";

const NOW = new Date(2026, 7, 29, 9, 0); // Sat 29 Aug 2026, 9am — before the 10am start

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

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

// The reported case, verbatim from the phone: "Intermediate Tournament / 16 signed up /
// BOOK" on a 16-of-16 tournament.
describe("a card offers BOOK only when there is something to book", () => {
  it("says FULL, with no link, when every place is taken", () => {
    render(<EventCard event={event()} />);
    expect(screen.getByText("FULL")).toBeTruthy();
    expect(screen.queryByText("BOOK")).toBeNull();
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("shows the roster against the capacity, not a bare count", () => {
    render(<EventCard event={event()} />);
    expect(screen.getByText("16 of 16 signed up")).toBeTruthy();
  });

  it("still books when a place is left", () => {
    render(<EventCard event={event({ signed_up: 15 })} />);
    expect(screen.getByText("BOOK")).toBeTruthy();
    expect(screen.getByRole("link").getAttribute("href")).toBe("https://playtomic.com/x");
    expect(screen.getByText("15 of 16 signed up")).toBeTruthy();
  });

  it("books when the capacity is unknown, rather than guessing at full", () => {
    render(<EventCard event={event({ capacity: null, signed_up: 40 })} />);
    expect(screen.getByText("BOOK")).toBeTruthy();
    expect(screen.getByText("40 signed up")).toBeTruthy();
  });

  it("prefers PAST over FULL once the session is over", () => {
    // Both are true of yesterday's sold-out tournament; PAST says the more useful thing.
    render(<EventCard event={event({ date: "2026-08-28" })} />);
    expect(screen.getByText("PAST")).toBeTruthy();
    expect(screen.queryByText("FULL")).toBeNull();
  });
});

// The day panel described a clinic completely except for the one thing anyone decides
// on: what it costs.
describe("a card says what a player pays", () => {
  it("shows the per-person price beside the type", () => {
    render(<EventCard event={event({ price: "$25" })} />);
    expect(screen.getByText("$25")).toBeTruthy();
    expect(screen.getByText("/person")).toBeTruthy();
  });

  it("renders a raw Playtomic price as dollars", () => {
    render(<EventCard event={event({ price: "37.50 USD" })} />);
    expect(screen.getByText("$37.50")).toBeTruthy();
  });

  it("says nothing when the price is unknown, rather than guessing", () => {
    // Null is what the server sends when Kumi's feed is unavailable — the alternative
    // there would be publishing the COURT total as if a player paid it.
    render(<EventCard event={event({ price: null })} />);
    expect(screen.queryByText("/person")).toBeNull();
  });

  it("still shows the price on a session that is full or past", () => {
    render(<EventCard event={event({ price: "$25", signed_up: 16, capacity: 16 })} />);
    expect(screen.getByText("$25")).toBeTruthy();
    expect(screen.getByText("FULL")).toBeTruthy();
  });
});

// Playtomic holds the club's programme private until a few days out, which is what makes
// the members' early-booking window a perk. The site must not hand out the join link
// before then — its id IS the link.
describe("an event the club has not opened yet offers no way in", () => {
  it("says MEMBERS FIRST instead of BOOK, and links nowhere", () => {
    render(<EventCard event={event({ booking_open: false, book_url: null, price: null })} />);
    expect(screen.getByText("MEMBERS FIRST")).toBeTruthy();
    expect(screen.queryByText("BOOK")).toBeNull();
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("still shows what it is and when, because the programme is worth seeing", () => {
    render(<EventCard event={event({ booking_open: false, book_url: null, price: null })} />);
    expect(screen.getByText("Intermediate Tournament")).toBeTruthy();
    expect(screen.getByText("10:00 AM - 12:00 PM")).toBeTruthy();
  });

  it("books normally when the flag is absent, which is every other event", () => {
    render(<EventCard event={event({ signed_up: 2 })} />);
    expect(screen.getByText("BOOK")).toBeTruthy();
  });

  it("prefers PAST once it has been, whatever the flag says", () => {
    render(<EventCard event={event({ booking_open: false, book_url: null, date: "2026-08-28" })} />);
    expect(screen.getByText("PAST")).toBeTruthy();
    expect(screen.queryByText("MEMBERS FIRST")).toBeNull();
  });
});

// "Members first" rather than "not yet open": the wait IS the members' perk, so the card
// names it, and says when everyone else gets in.
describe("a members-first card sells the window instead of just closing the door", () => {
  const gated = { booking_open: false, book_url: null, price: null, signed_up: 0 };

  it("says MEMBERS FIRST and the day it opens to all", () => {
    render(<EventCard event={event({ ...gated, date: "2026-09-10", opens_on: "2026-09-05" })} />);
    expect(screen.getByText("MEMBERS FIRST")).toBeTruthy();
    expect(screen.getByText(/Opens to all Sep 5/)).toBeTruthy();
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("drops the date when the server withheld it, keeping the label", () => {
    render(<EventCard event={event({ ...gated, opens_on: null })} />);
    expect(screen.getByText("MEMBERS FIRST")).toBeTruthy();
    expect(screen.queryByText(/Opens to all/)).toBeNull();
  });

  it("shows the roster again on an event that is open", () => {
    render(<EventCard event={event({ signed_up: 5, capacity: 8 })} />);
    expect(screen.getByText("5 of 8 signed up")).toBeTruthy();
    expect(screen.queryByText(/Opens to all/)).toBeNull();
  });
});
