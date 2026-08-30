/** The club's published pay-as-you-go rates, and the day they change.
 *
 * One source, because this number is stated in four places that must agree: the drop-in
 * line on /book, the rate card on /memberships, the per-player price the schedule shows
 * against an open match, and (in Kumi, out of this repo) the chatbot and phone agent's
 * knowledge base. Court rental and the per-player rate both step up on the same day.
 *
 * Dated rather than swapped by hand: the old figures do not become wrong at some point
 * in the future, they become wrong at 00:00 on a known date, and a rate stated with no
 * date attached silently starts lying. An event is priced by ITS OWN date, so a session
 * in September already shows September's rate today.
 *
 * Plain JS, and in shared/ rather than fullsite/, because server.js imports it too and
 * runs from source with no build step.
 */

/** Rates change at the start of this club-local day (YYYY-MM-DD). */
export const RATE_CHANGE_DATE = "2026-09-01";

const BEFORE = { perPlayer90: 15, court90: 60 };
const FROM_SEPT = { perPlayer90: 22.5, court90: 90 };

/** The rates in force on a given YYYY-MM-DD (club-local). */
export function ratesOn(date) {
  return String(date) >= RATE_CHANGE_DATE ? FROM_SEPT : BEFORE;
}

/** "$15" / "$22.50" — cents only when there are cents, matching how the site writes money. */
export function formatUsd(amount) {
  return `$${Number.isInteger(amount) ? amount : amount.toFixed(2)}`;
}
