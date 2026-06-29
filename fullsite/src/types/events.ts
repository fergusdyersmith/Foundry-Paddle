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
  /** Live roster count from Playtomic. Often 0 for clinics (sparse upstream data). */
  signed_up: number;
}
