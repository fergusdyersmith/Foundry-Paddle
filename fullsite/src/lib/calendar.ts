import { endOfMonth, endOfWeek, isBefore, startOfMonth, startOfWeek } from "date-fns";

/** Which day a calendar week starts on, and the matching column headers.
 *
 * These two MUST agree: change one and the grid silently labels every day wrong, which
 * no type or lint error catches. Kept together in one file, with no React in it, so the
 * pair is testable without dragging a component (and its `@/` aliases) into the test.
 *
 * Sunday-first (2026-08-10) — the US convention, and what every other calendar the club
 * uses looks like. The grid shipped Monday-first, which read as subtly wrong to anyone
 * scanning for a weekend session.
 */
export const WEEK_STARTS_ON = 0 as const; // 0 = Sunday, in date-fns terms

export const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

/** First and last day the month grid actually DRAWS — the leading and trailing days
 *  of the neighbouring months included.
 *
 *  The schedule fetches THIS range rather than the month itself, so those spill-over
 *  cells carry their events instead of sitting empty: the first days of September were
 *  already on the calendar in August, just blank until you clicked forward a month.
 *  Shared with MonthGrid so the range fetched and the range drawn cannot drift apart. */
export function monthGridRange(monthStart: Date): { start: Date; end: Date } {
  return {
    start: startOfWeek(startOfMonth(monthStart), { weekStartsOn: WEEK_STARTS_ON }),
    end: endOfWeek(endOfMonth(monthStart), { weekStartsOn: WEEK_STARTS_ON }),
  };
}

/** Should the calendar ask the API for days that have already happened?
 *
 *  Only for a month that has already BEEN. History is a second Playtomic fetch — 6.9s
 *  cold against 0.15s, and a 66KB payload against 9KB — and on the current month it buys
 *  three weeks of sessions nobody can join. So the month a visitor lands on shows what is
 *  left of it, and the history is loaded only when they navigate back to look for it. */
export function monthNeedsHistory(monthStart: Date, today: Date = new Date()): boolean {
  return isBefore(startOfMonth(monthStart), startOfMonth(today));
}
