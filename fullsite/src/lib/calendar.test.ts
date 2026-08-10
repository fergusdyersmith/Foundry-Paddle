/** @vitest-environment node */
import { describe, it, expect } from "vitest";
import { addDays, endOfMonth, endOfWeek, format, startOfMonth, startOfWeek } from "date-fns";

import { WEEKDAYS, WEEK_STARTS_ON } from "./calendar";

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
