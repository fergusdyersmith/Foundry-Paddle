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

/** Was $10, then $15 from 25 September. Free since 2 October: a sponsor covers 100 places,
 *  so nothing is collected and the signup lives on this site, not in Playtomic (the two
 *  Playtomic sessions are priced at 0 so a listing someone finds cannot charge them). */
export const JUNIOR_PRICE = "Free";
export const JUNIOR_PLACES = 80; // 100 until Monica's note of 2 Oct, 1 PM
/** Who to thank. Null until the club says the sponsor can be named. */
export const JUNIOR_SPONSOR: string | null = null;
/** "First" on purpose (Monica, 2 Oct): it sets the expectation that later clinics may cost. */
export const JUNIOR_FREE_LINE = JUNIOR_SPONSOR
  ? `This first clinic is free: ${JUNIOR_PLACES} places covered by ${JUNIOR_SPONSOR}.`
  : `This first clinic is free: ${JUNIOR_PLACES} places covered by a club sponsor.`;
export const JUNIOR_COACH = "Diego Valeri";

/** One session per age group (Monica, 25 Sep), ninety minutes each. `group` is what the
 *  next-dates signup sends; server/juniors.js AGE_GROUPS accepts exactly these. */
export const JUNIOR_SESSION_TIMES: { start: string; end: string; label: string; ages: string; group: string }[] = [
  { start: "09:00", end: "10:30", label: "9 to 10:30 AM", ages: "Ages 10 to 13", group: "10-13" },
  { start: "10:30", end: "12:00", label: "10:30 AM to noon", ages: "Ages 14 and up", group: "14+" },
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
  /**
   * The club has stopped taking names for this day (Monica, 8 Oct 2026, the evening
   * before the first clinic). The day stays on the page, its SIGN UP buttons become
   * "signups closed", the form hides it, and the server refuses a signup for it from a
   * stale tab. The next-dates list stays open throughout.
   */
  signupsClosed?: boolean;
  /**
   * The club has announced this day (Kelly, 10 Oct 2026, the day after the first
   * clinic). The rest of the list is the district calendar, days the clinic COULD run,
   * and until Monica confirms one it must not look bookable: the page showed 29 October
   * with a SIGN UP button on 10 October while the server knew no such day. Only announced
   * days reach the page, the home promo and the waiver; with none ahead the page says
   * more clinics are coming and asks for an email. Announcing a day means setting this,
   * adding it to JUNIOR_SIGNUP_DAYS in server/juniors.js, and creating the Playtomic
   * sessions.
   */
  announced?: boolean;
};

export const JUNIOR_DAYS: JuniorDay[] = [
  {
    date: "2026-10-09",
    label: "Friday, October 9",
    reason: "Statewide inservice day",
    bookUrls: [
      "https://app.playtomic.com/tournaments/44e6a014-edb0-43a0-a137-37af36007c7f",
      "https://app.playtomic.com/tournaments/6d700fbc-a871-4bd7-8a84-0f6b54f04848",
    ],
    // Closed the evening of 8 Oct, reopened an hour later: four more places at 9 AM.
    signupsClosed: false,
    announced: true,
  },
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

/** Before the browser has decided "today" (the prerender, and the first client render that
 *  must match it), the day of the build stands in. Vitest has no define, hence the guard. */
const BUILD_DAY: string | null = typeof __BUILD_DAY__ === "string" ? __BUILD_DAY__ : null;

/** The announced days still ahead, soonest first. `today` is YYYY-MM-DD in Portland, or
 *  null before the browser has decided it, when the build day is used instead. */
export function announcedDays(today: string | null): JuniorDay[] {
  const ref = today || BUILD_DAY;
  return JUNIOR_DAYS.filter((d) => d.announced && (!ref || d.date >= ref));
}

/** The most recent announced day that has already happened, if any: the page names it
 *  while the next one is still unannounced. */
export function lastClinicDay(today: string | null): JuniorDay | null {
  const ref = today || BUILD_DAY;
  if (!ref) return null;
  const past = JUNIOR_DAYS.filter((d) => d.announced && d.date < ref);
  return past[past.length - 1] ?? null;
}

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
