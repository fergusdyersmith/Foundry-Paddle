/**
 * The club's clock. Sessions arrive from the API as a Portland date plus "HH:mm", and
 * rates change on a Portland date, so "what is today" and "has this started" are asked
 * in Portland's terms, never the visitor's. A visitor in New York at 9pm would otherwise
 * see a 7pm Portland match as already over, and `toISOString()` (UTC) turns every
 * evening after 5pm into tomorrow.
 *
 * Intl does the conversion, so no timezone library ships for it. The server reads the
 * same zone (CLUB_TIMEZONE in server.js).
 */
export const CLUB_TIMEZONE = "America/Los_Angeles";

const clubParts = new Intl.DateTimeFormat("en-US", {
  timeZone: CLUB_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** Portland's date ("2026-10-12") and time ("19:05") at `now`. */
export function clubNow(now: Date = new Date()): { date: string; time: string } {
  const p: Record<string, string> = {};
  for (const { type, value } of clubParts.formatToParts(now)) p[type] = value;
  return { date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}` };
}

/** Portland's date as "yyyy-MM-dd". */
export const clubToday = (now?: Date): string => clubNow(now).date;

/** Portland's date as a Date at local midnight, for the date-fns arithmetic the
 *  calendar does (date-fns reads local fields, so this is the day the club is on). */
export function clubTodayDate(now?: Date): Date {
  const [y, m, d] = clubToday(now).split("-").map(Number);
  return new Date(y, m - 1, d);
}
