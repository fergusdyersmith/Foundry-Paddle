import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AgendaList from "./AgendaList";
import type { PadelEvent } from "@/types/events";

const NOW = new Date(2026, 7, 28, 12, 0); // Fri 28 Aug 2026, midday

function event(date: string, title: string): PadelEvent {
  return {
    id: `${date}-${title}`,
    title,
    date,
    start_time: "10:00",
    end_time: "11:30",
    duration_min: 90,
    price: null,
    booking_type: "PUBLIC_CLASS",
    court: "Court 1",
    signed_up: 2,
    book_url: "https://playtomic.com/example",
  };
}

function byDate(...events: PadelEvent[]) {
  const map = new Map<string, PadelEvent[]>();
  for (const e of events) map.set(e.date, [...(map.get(e.date) ?? []), e]);
  return map;
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

// The month grid is desktop-only; on a phone this list IS the schedule. Now that the
// calendar keeps days that have already been, leading with three weeks of finished
// sessions would push the next bookable thing off the screen.
describe("the mobile agenda leads with what is still to come", () => {
  it("folds finished days away behind a toggle", () => {
    render(
      <AgendaList
        eventsByDate={byDate(
          event("2026-08-12", "Clinic that has been"),
          event("2026-08-30", "Clinic still to come"),
        )}
      />,
    );

    expect(screen.getByText("Clinic still to come")).toBeTruthy();
    expect(screen.queryByText("Clinic that has been")).toBeNull();
    expect(screen.getByText(/Earlier this month/)).toBeTruthy();
  });

  it("shows them when the toggle is opened, and hides them again", () => {
    render(
      <AgendaList
        eventsByDate={byDate(
          event("2026-08-12", "Clinic that has been"),
          event("2026-08-30", "Clinic still to come"),
        )}
      />,
    );

    fireEvent.click(screen.getByText(/Earlier this month/));
    expect(screen.getByText("Clinic that has been")).toBeTruthy();

    fireEvent.click(screen.getByText(/Hide earlier days/));
    expect(screen.queryByText("Clinic that has been")).toBeNull();
  });

  it("counts today as still to come, however late in the day it is", () => {
    // A 10am clinic on the day itself stays in the main list: someone reading at noon is
    // looking at today's schedule, not at history.
    render(<AgendaList eventsByDate={byDate(event("2026-08-28", "This morning's clinic"))} />);
    expect(screen.getByText("This morning's clinic")).toBeTruthy();
    expect(screen.queryByText(/Earlier this month/)).toBeNull();
  });

  it("opens a month that is entirely in the past, since there is nothing else to show", () => {
    render(
      <AgendaList
        eventsByDate={byDate(event("2026-07-02", "July clinic"), event("2026-07-09", "July social"))}
      />,
    );
    expect(screen.getByText("July clinic")).toBeTruthy();
    expect(screen.getByText("July social")).toBeTruthy();
    expect(screen.queryByText(/Earlier this month/)).toBeNull(); // nothing to fold it behind
  });

  it("still says so when a month has no events at all", () => {
    render(<AgendaList eventsByDate={new Map()} />);
    expect(screen.getByText(/No events scheduled/)).toBeTruthy();
  });
});
