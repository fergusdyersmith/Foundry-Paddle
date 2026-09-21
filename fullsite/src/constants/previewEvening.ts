/**
 * The neighbourhood preview evening: the facts /preview and the North Peninsula Review
 * ad both state, in one place. The printed ad cannot be corrected once it runs, so when
 * something here changes, the ad source (compose.py, constants at the top) has to change
 * with it, and vice versa.
 *
 * The evening is sold as separate Playtomic sessions that overlap on purpose, so there
 * is always a crowd on court as one group arrives and another winds down.
 */

export const PREVIEW_DATE = "2026-10-10";
export const PREVIEW_DATE_LABEL = "Saturday, October 10";

export const PREVIEW_PRICE = "$25";
export const PREVIEW_INCLUDES = [
  "Racket and balls",
  "A brat",
  "One drink: beer, wine or non-alcoholic",
] as const;

/** Places per session. Said on the page as a plain limit; the live "spots left" count
 *  comes from Playtomic, so the capacity set on each Playtomic session has to match. */
export const PREVIEW_SESSION_CAPACITY = 20;

export type PlannedSession = {
  /** 24h local club time, matching the events feed's start_time / end_time. */
  start: string;
  end: string;
  /**
   * The session's Playtomic link, pasted in by hand. Leave null to let the page find the
   * session in the events feed instead.
   *
   * WHY THIS EXISTS: the club creates its Playtomic programme PRIVATE and a cron releases
   * each event to the public five days before it plays (TOURNAMENT_RELEASE_DAYS in
   * server.js). Until then the feed deliberately hands the site no book_url. The paper
   * lands on 1 October and five days before the evening is 5 October, so a session left
   * on the default workflow would show "booking opens soon" to every reader for the
   * first four days. Private on Playtomic means unlisted, not locked: the link works, so
   * putting it here opens booking on the page regardless of the release state.
   */
  bookUrl: string | null;
};

export const PREVIEW_SESSIONS: PlannedSession[] = [
  { start: "17:00", end: "19:00", bookUrl: null },
  { start: "18:00", end: "20:00", bookUrl: null },
  { start: "19:00", end: "21:00", bookUrl: null },
];

/** How a Playtomic event is recognised as one of the preview sessions. Name them with
 *  "Preview" in the title and the page picks them up, including a fourth if one is added. */
export const PREVIEW_TITLE_PATTERN = /preview/i;
