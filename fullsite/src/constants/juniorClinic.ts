/**
 * The junior padel clinic: the facts /juniors and its printed ad both state, in one
 * place. As with the preview evening, the printed piece cannot be corrected once it
 * runs, so a change here means a change in the ad source (compose.py, JR_* constants)
 * and vice versa.
 *
 * The clinic runs on days Portland Public Schools are closed to students and parents
 * mostly are not: staff days, conferences, the statewide inservice. The list below is
 * the district's own 2026-27 calendar (portlandk12.org, updated 9 Sep 2026), weekdays
 * only. Public holidays and the long breaks are left off on purpose: families travel,
 * and the club has not said it will run those. Add a day here and it appears on the
 * page with its two sessions; the club still has to create the Playtomic sessions.
 */
import type { PlannedSession } from "@/constants/previewEvening";

export const JUNIOR_PRICE = "$15"; // $10 until 25 September
export const JUNIOR_COACH = "Diego Valeri";

/** One session per age group (Monica, 25 Sep), ninety minutes each. */
export const JUNIOR_SESSION_TIMES: { start: string; end: string; label: string; ages: string }[] = [
  { start: "09:00", end: "10:30", label: "9 to 10:30 AM", ages: "Ages 10 to 13" },
  { start: "10:30", end: "12:00", label: "10:30 AM to noon", ages: "Ages 14 and up" },
];

export const JUNIOR_BLURB = "Timbers legend Diego Valeri will be there, on court, coaching both sessions.";

export type JuniorDay = {
  /** YYYY-MM-DD, club local time. */
  date: string;
  label: string;
  /** Why school is out, as the district words it. */
  reason: string;
  /**
   * Playtomic links for that day's two sessions, in JUNIOR_SESSION_TIMES order. Pasted
   * by hand for the same reason as PlannedSession.bookUrl on the preview evening: the
   * feed hands out no link while a session is still private. null = not created yet.
   */
  bookUrls: [string | null, string | null];
};

export const JUNIOR_DAYS: JuniorDay[] = [
  { date: "2026-10-09", label: "Friday, October 9", reason: "Statewide inservice day", bookUrls: [null, null] },
  { date: "2026-10-29", label: "Thursday, October 29", reason: "Staff day", bookUrls: [null, null] },
  { date: "2026-10-30", label: "Friday, October 30", reason: "Staff day", bookUrls: [null, null] },
  { date: "2026-11-23", label: "Monday, November 23", reason: "Conference day", bookUrls: [null, null] },
  { date: "2026-11-24", label: "Tuesday, November 24", reason: "Conference day", bookUrls: [null, null] },
  { date: "2026-11-25", label: "Wednesday, November 25", reason: "Fall break", bookUrls: [null, null] },
  { date: "2027-01-25", label: "Monday, January 25", reason: "Staff day", bookUrls: [null, null] },
  { date: "2027-01-26", label: "Tuesday, January 26", reason: "Staff day", bookUrls: [null, null] },
  { date: "2027-04-08", label: "Thursday, April 8", reason: "Staff day", bookUrls: [null, null] },
  { date: "2027-04-09", label: "Friday, April 9", reason: "Staff day", bookUrls: [null, null] },
];

/** A day's sessions in the shape the preview evening's merge already understands. */
export function plannedSessionsFor(day: JuniorDay): PlannedSession[] {
  return JUNIOR_SESSION_TIMES.map((t, i) => ({ start: t.start, end: t.end, bookUrl: day.bookUrls[i] }));
}

/** How a Playtomic event is recognised as a junior clinic session. */
export const JUNIOR_TITLE_PATTERN = /junior|jr\b|kids/i;

export const JUNIOR_AGE_RULES = [
  {
    heading: "Ages 10 to 13",
    body: "A parent or guardian stays for the full session. There is Wi-Fi and a workspace, so bring the laptop.",
  },
  {
    heading: "Ages 14 and up",
    body: "Parents are welcome to stay and watch, but do not have to.",
  },
  {
    heading: "Under 10",
    body: "Considered case by case for kids with significant racket experience. Call us first.",
  },
] as const;
