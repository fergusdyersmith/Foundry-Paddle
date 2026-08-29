import { EVENT_TYPE_ORDER, OPEN_MATCH_CAPACITY } from "@/constants/events";
import { PLAYTOMIC_TENANT_URL } from "@/constants/booking";
import type { PadelEvent } from "@/types/events";

/** "13:00" -> "01:00 PM" */
export function formatTime(t: string): string {
  const [h, m] = t.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 || 12;
  return `${hour12.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")} ${period}`;
}

/** Playtomic prices arrive as "40 USD" / "37.50 USD"; render as "$40" / "$37.50".
 *  Anything unrecognized passes through unchanged. */
export function formatPrice(price: string): string {
  const m = price.match(/^(\d+(?:\.\d+)?)\s*USD$/i);
  if (!m) return price;
  const n = Number(m[1]);
  return `$${Number.isInteger(n) ? n : n.toFixed(2)}`;
}

/** Group events by their YYYY-MM-DD date. Input is assumed already sorted by
 *  date then start time (the API returns it that way), so each day's array
 *  preserves chronological order. */
export function groupEventsByDate(events: PadelEvent[]): Map<string, PadelEvent[]> {
  const map = new Map<string, PadelEvent[]>();
  for (const e of events) {
    const list = map.get(e.date);
    if (list) list.push(e);
    else map.set(e.date, [e]);
  }
  return map;
}

/** Has this event already finished? The API returns a local date plus "HH:mm" strings,
 *  so the comparison is done in those same terms against the visitor's clock — the same
 *  reading /book already uses to drop matches that have started. A visitor in another
 *  timezone can be a few hours out; nothing here does more than dim a card and swap its
 *  BOOK button, so that is a fair trade for not shipping a timezone library.
 *
 *  Pure and exported so the rule is testable: it decides whether the page offers someone
 *  a booking link to a session that is already over. */
export function isPastEvent(event: PadelEvent, now: Date = new Date()): boolean {
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  if (event.date !== today) return event.date < today;
  return (event.end_time || event.start_time) <= time;
}

/** Is this event out of spots?
 *
 *  Only ever true when the capacity is actually KNOWN: clinics, courses and tournaments
 *  carry one from Kumi's feed, and a padel open match is always four. `capacity` is null
 *  whenever that enrichment is unavailable, and null means unknown, never full — a
 *  session wrongly labelled FULL is a booking the club does not get, which is a worse
 *  error than the one this fixes.
 *
 *  Pure and exported so the rule is testable: it decides whether the page still offers
 *  someone a way to sign up. */
export function isFullEvent(event: PadelEvent): boolean {
  const capacity =
    event.capacity ?? (event.booking_type === "OPEN_MATCH" ? OPEN_MATCH_CAPACITY : null);
  if (capacity == null || capacity <= 0) return false;
  return event.signed_up >= capacity;
}

/** How the roster reads next to an event: "12 of 16 signed up" when the capacity is
 *  known, "12 signed up" when it is not. Empty when nobody has signed up yet — "0 signed
 *  up" on a clinic that opened this morning reads worse than saying nothing. */
export function signupSummary(event: PadelEvent): string {
  if (event.signed_up <= 0) return "";
  return event.capacity != null && event.capacity > 0
    ? `${event.signed_up} of ${event.capacity} signed up`
    : `${event.signed_up} signed up`;
}

/** Split a list so the events someone can still join come first, then the ones that are
 *  full, each group keeping the order it arrived in (the API sorts by date, then time).
 *
 *  Two separate caps rather than one over the whole list: a short list capped as a whole
 *  would quietly drop every full session the moment there were enough open ones, and the
 *  point is to still SHOW what the club runs — a sold-out beginner clinic is a reason to
 *  come back next week, not noise. The open ones lead because those are the ones a click
 *  can still fill. */
export function openFirst(
  events: PadelEvent[],
  { openLimit, fullLimit }: { openLimit: number; fullLimit: number },
): PadelEvent[] {
  const open: PadelEvent[] = [];
  const full: PadelEvent[] = [];
  for (const e of events) (isFullEvent(e) ? full : open).push(e);
  return [...open.slice(0, openLimit), ...full.slice(0, fullLimit)];
}

/** Where the BOOK button points for a given event. The server builds a per-type
 *  deep link (tournaments, classes/clinics, and open matches each use a
 *  different Playtomic URL + id); fall back to the club page if it's missing. */
export function eventBookingUrl(event: PadelEvent): string {
  return event.book_url || PLAYTOMIC_TENANT_URL;
}

/** Sort booking types into a stable display order; unknown types go last. */
export function sortTypesByOrder(types: string[]): string[] {
  return [...types].sort((a, b) => {
    const ia = EVENT_TYPE_ORDER.indexOf(a);
    const ib = EVENT_TYPE_ORDER.indexOf(b);
    return (ia === -1 ? Infinity : ia) - (ib === -1 ? Infinity : ib);
  });
}
