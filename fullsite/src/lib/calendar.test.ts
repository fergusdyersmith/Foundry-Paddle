/** @vitest-environment node */
import { describe, it, expect } from "vitest";
import {
  addDays,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  startOfMonth,
  startOfWeek,
} from "date-fns";

import { monthGridRange, monthNeedsHistory, WEEKDAYS, WEEK_STARTS_ON } from "./calendar";

describe("the schedule calendar starts on Sunday", () => {
  it("labels the first column Sun and the last Sat", () => {
    expect(WEEKDAYS[0]).toBe("Sun");
    expect(WEEKDAYS[6]).toBe("Sat");
    expect(WEEKDAYS).toHaveLength(7);
  });

  it("the column HEADERS match the days actually rendered under them", () => {
    // The real failure mode: change one of WEEKDAYS / WEEK_STARTS_ON and the calendar
    // silently labels every day wrong. No type or lint error catches that.
    const gridStart = startOfWeek(startOfMonth(new Date(2026, 7, 1)), {
      weekStartsOn: WEEK_STARTS_ON,
    });
    for (let i = 0; i < 7; i++) {
      expect(format(addDays(gridStart, i), "EEE")).toBe(WEEKDAYS[i]);
    }
  });

  it("adds no dead leading week when a month already begins on Sunday", () => {
    // Feb 2026 starts on a Sunday, the case where an off-by-one week is invisible
    // unless you look at the leading cells.
    const feb = new Date(2026, 1, 1);
    expect(format(feb, "EEE")).toBe("Sun");
    const gridStart = startOfWeek(startOfMonth(feb), { weekStartsOn: WEEK_STARTS_ON });
    expect(format(gridStart, "yyyy-MM-dd")).toBe("2026-02-01");
  });

  it("always produces whole weeks of seven", () => {
    for (const m of [0, 1, 6, 7, 11]) {
      const first = new Date(2026, m, 1);
      const start = startOfWeek(startOfMonth(first), { weekStartsOn: WEEK_STARTS_ON });
      const end = endOfWeek(endOfMonth(first), { weekStartsOn: WEEK_STARTS_ON });
      // endOfWeek lands on 23:59:59.999, so rounding the span already gives the whole
      // day count; adding one would overshoot. Math.round also absorbs a DST hour.
      const days = Math.round((+end - +start) / 86400000);
      expect(days % 7).toBe(0);
    }
  });
});

// The grid always drew leading/trailing days from the neighbouring months; the page
// fetched only the month, so those cells came back empty. August 2026 ends on a Monday,
// so the calendar draws through Sat 5 September — five days of real sessions that a
// visitor could see the boxes for but not the events in.
describe("the fetched range covers every day the grid draws", () => {
  const key = (d: Date) => format(d, "yyyy-MM-dd");

  it("spans the whole six-week grid for August 2026", () => {
    const { start, end } = monthGridRange(new Date(2026, 7, 1));
    expect(key(start)).toBe("2026-07-26"); // Sunday before Sat 1 Aug
    expect(key(end)).toBe("2026-09-05"); // Saturday after Mon 31 Aug
  });

  it("matches the days the grid actually renders, every month of the year", () => {
    for (let m = 0; m < 12; m++) {
      const monthStart = new Date(2026, m, 1);
      const { start, end } = monthGridRange(monthStart);
      const drawn = eachDayOfInterval({
        start: startOfWeek(startOfMonth(monthStart), { weekStartsOn: WEEK_STARTS_ON }),
        end: endOfWeek(endOfMonth(monthStart), { weekStartsOn: WEEK_STARTS_ON }),
      });
      expect(key(start)).toBe(key(drawn[0]));
      expect(key(end)).toBe(key(drawn[drawn.length - 1]));
      expect(drawn.length % 7).toBe(0);
      expect(drawn.length).toBeLessThanOrEqual(42); // the server's range cap allows 45
    }
  });

  it("starts on a Sunday and ends on a Saturday, so whole weeks are fetched", () => {
    const { start, end } = monthGridRange(new Date(2026, 1, 1)); // Feb 2026 begins on a Sunday
    expect(format(start, "EEE")).toBe("Sun");
    expect(format(end, "EEE")).toBe("Sat");
  });
});

// Showing every past day of the CURRENT month was a mistake: it put a second Playtomic
// fetch (6.9s cold, 66KB) in front of the page a visitor lands on, to fill three weeks
// of the grid with sessions nobody can join. History is now loaded only when someone
// navigates back to a month that has already been.
describe("history is loaded only for a month that has already been", () => {
  const TODAY = new Date(2026, 7, 29); // Sat 29 Aug 2026

  it("does not ask for it on the month being viewed today", () => {
    expect(monthNeedsHistory(new Date(2026, 7, 1), TODAY)).toBe(false);
  });

  it("does not ask for it on a month still to come", () => {
    expect(monthNeedsHistory(new Date(2026, 8, 1), TODAY)).toBe(false);
  });

  it("asks for it on last month, and on months before that", () => {
    expect(monthNeedsHistory(new Date(2026, 6, 1), TODAY)).toBe(true);
    expect(monthNeedsHistory(new Date(2026, 4, 1), TODAY)).toBe(true);
  });

  it("compares months, not days — the 1st of this month is not history", () => {
    // A month start is always <= today within the current month; comparing raw dates
    // would make every day after the 1st ask for history it does not need.
    expect(monthNeedsHistory(new Date(2026, 7, 1), new Date(2026, 7, 31))).toBe(false);
  });

  it("crosses a year boundary the right way round", () => {
    expect(monthNeedsHistory(new Date(2025, 11, 1), new Date(2026, 0, 15))).toBe(true);
    expect(monthNeedsHistory(new Date(2026, 0, 1), new Date(2025, 11, 15))).toBe(false);
  });
});
