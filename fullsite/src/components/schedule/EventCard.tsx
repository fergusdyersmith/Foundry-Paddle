import { Clock, ExternalLink, Users } from "lucide-react";
import { TYPE_LABELS, TYPE_COLORS } from "@/constants/events";
import {
  eventBookingUrl,
  formatPrice,
  formatTime,
  isFullEvent,
  isPastEvent,
  signupSummary,
} from "@/lib/events";
import type { PadelEvent } from "@/types/events";

/** Full event row for the agenda list and the day-detail panel.
 *  `stacked` forces the vertical layout regardless of viewport — use it inside
 *  the narrow day-detail side panel, where the horizontal layout would cram
 *  and truncate the title.
 *
 *  The calendar now shows days that have already happened, so a card can describe a
 *  session that is over. Those keep everything except the BOOK button: sending someone
 *  to Playtomic to sign up for last Tuesday's clinic is the one thing they must not do.
 *  A session with no spots left is treated the same way — a 16-of-16 tournament reading
 *  "16 signed up" next to a live BOOK button invited a click that could only end in
 *  disappointment. */
export default function EventCard({
  event,
  stacked = false,
}: {
  event: PadelEvent;
  stacked?: boolean;
}) {
  const past = isPastEvent(event);
  // Booking has not opened yet: the club releases each tournament a few days out, and
  // until then there is no link to give — see applyKumiTournamentInfo in server.js.
  const notOpen = !past && event.booking_open === false;
  // Past wins: "PAST" says everything "FULL" would, and more. A session that is not open
  // yet cannot be full either — its capacity is not published until it opens.
  const full = !past && !notOpen && isFullEvent(event);
  const roster = signupSummary(event);
  const typeLabel = TYPE_LABELS[event.booking_type];
  const typeColor =
    TYPE_COLORS[event.booking_type] || "bg-muted text-muted-foreground";
  const row = stacked ? "" : "sm:flex-row sm:items-center sm:p-5";
  const timeWidth = stacked ? "" : "sm:w-36";
  const actions = stacked ? "" : "sm:gap-6";

  return (
    <div
      className={`flex flex-col gap-4 border border-border bg-card p-4 ${row} ${
        past || full ? "opacity-70" : ""
      }`}
    >
      <div className={`flex shrink-0 items-center gap-2 ${timeWidth}`}>
        <Clock className="h-4 w-4 text-muted-foreground" />
        <div>
          <p className="text-sm font-medium text-foreground">
            {formatTime(event.start_time)} - {formatTime(event.end_time)}
          </p>
          <p className="text-xs text-muted-foreground">{event.duration_min} min</p>
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <h4 className={`font-display text-lg tracking-wide text-foreground ${stacked ? "" : "truncate"}`}>
          {event.title}
        </h4>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          {event.court && (
            <span className="text-xs text-muted-foreground">{event.court}</span>
          )}
          {typeLabel && (
            <span
              className={`inline-block px-2 py-0.5 font-display text-[10px] uppercase tracking-wider ${typeColor}`}
            >
              {typeLabel}
            </span>
          )}
          {/* What a PLAYER pays, which is the number the API carries: Kumi's per-person
              price for clinics and tournaments, and a quarter of the court for an open
              match. Never the court total — the server drops that rather than publish
              it as if it were a per-head price. Absent when nobody told us. */}
          {event.price && (
            <span className="text-xs font-medium text-foreground">
              {formatPrice(event.price)}
              <span className="text-muted-foreground">/person</span>
            </span>
          )}
        </div>
      </div>

      <div className={`flex shrink-0 items-center gap-4 ${actions}`}>
        {roster && (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Users className="h-3.5 w-3.5" />
            {roster}
          </span>
        )}

        {past || full || notOpen ? (
          <span className="ml-auto inline-flex items-center whitespace-nowrap border border-border px-5 py-2 font-display text-xs tracking-widest text-muted-foreground">
            {past ? "PAST" : full ? "FULL" : "NOT YET OPEN"}
          </span>
        ) : (
          <a
            href={eventBookingUrl(event)}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto inline-flex items-center gap-1.5 bg-primary px-5 py-2 font-display text-xs tracking-widest text-primary-foreground transition-all hover:brightness-110"
          >
            BOOK
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
    </div>
  );
}
