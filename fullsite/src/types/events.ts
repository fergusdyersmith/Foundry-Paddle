/** A padel event (clinic, open play, private lesson, course, or tournament)
 *  as returned by the server's Playtomic-backed events API. */
export interface PadelEvent {
  id: string;
  title: string;
  /** Local club date, YYYY-MM-DD. */
  date: string;
  /** Local 24h start time, HH:MM. */
  start_time: string;
  /** Local 24h end time, HH:MM. */
  end_time: string;
  duration_min: number;
  price: string | null;
  booking_type: string;
  court: string | null;
  /** Live roster count from Playtomic. Often 0 for clinics (sparse upstream data);
   *  for clinics and tournaments the server swaps in kumi's registration count. */
  signed_up: number;
  /** Max players, when known (kumi enrichment for clinics/tournaments). */
  capacity?: number | null;
  /** Deep link to the specific item on Playtomic (built server-side per type). Null on a
   *  tournament Playtomic has not released yet — see `booking_open`. */
  book_url: string | null;
  /** False when the club has not opened this event for booking yet: Playtomic holds the
   *  programme private and releases each tournament a few days out, and its id is the
   *  join link, so the site must not publish one before then. Absent means bookable. */
  booking_open?: boolean;
  /** The day it opens to everyone (YYYY-MM-DD), for an event still in its members-first
   *  window. Null when that day has already passed, which means the release is running
   *  late rather than that the date is unknown. */
  opens_on?: string | null;
}
