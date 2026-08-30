import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import BookEventRow from "./BookEventRow";
import type { PadelEvent } from "@/types/events";

// 3 Sep 2026 is a Thursday: 10am is off peak, 8pm is peak.
function clinic(o: Partial<PadelEvent> = {}): PadelEvent {
  return {
    id: "c1",
    title: "Midweek Morning Clinic",
    date: "2026-09-03",
    start_time: "10:00",
    end_time: "11:00",
    duration_min: 60,
    price: "$30",
    booking_type: "PUBLIC_CLASS",
    court: "Court 3",
    signed_up: 1,
    capacity: 4,
    book_url: "https://playtomic.com/x",
    ...o,
  };
}

describe("the Book page's clinic row", () => {
  it("names the member rate on an off-peak clinic", () => {
    render(<BookEventRow event={clinic()} />);
    expect(screen.getByText(/\$30/)).toBeTruthy();
    expect(screen.getByText(/\$22\.50 members/)).toBeTruthy();
  });

  it("leaves a peak clinic on one price, which is what a member pays too", () => {
    render(<BookEventRow event={clinic({ start_time: "20:00", end_time: "21:00", price: "$50" })} />);
    expect(screen.getByText(/\$50/)).toBeTruthy();
    expect(screen.queryByText(/members/)).toBeNull();
  });

  it("stops being a link once it is full, and says so", () => {
    render(<BookEventRow event={clinic({ signed_up: 4, capacity: 4 })} />);
    expect(screen.getByText("FULL")).toBeTruthy();
    expect(screen.queryByText("BOOK")).toBeNull();
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("is a link to Playtomic while there are places", () => {
    render(<BookEventRow event={clinic()} />);
    expect(screen.getByRole("link").getAttribute("href")).toBe("https://playtomic.com/x");
    expect(screen.getByText("BOOK")).toBeTruthy();
  });

  it("shows the roster against the capacity", () => {
    render(<BookEventRow event={clinic({ signed_up: 2 })} />);
    expect(screen.getByText("2/4")).toBeTruthy();
  });
});
