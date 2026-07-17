import { format, parseISO } from "date-fns";
import { ExternalLink, Users } from "lucide-react";
import { OPEN_MATCH_CAPACITY } from "@/constants/events";
import { eventBookingUrl, formatTime } from "@/lib/events";
import type { PadelEvent } from "@/types/events";

/** Compact one-line event row for the Book page's clinic and open-match
 *  lists. The whole row is a link to the event's Playtomic deep link. Open
 *  matches show spots left (roster out of 4) instead of a raw signup count. */
export default function BookEventRow({ event }: { event: PadelEvent }) {
  const date = parseISO(event.date);
  const isMatch = event.booking_type === "OPEN_MATCH";
  const spotsLeft = Math.max(0, OPEN_MATCH_CAPACITY - event.signed_up);
  return (
    <a
      href={eventBookingUrl(event)}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-center gap-4 border border-border bg-card px-4 py-3 transition-colors hover:border-primary"
    >
      <div className="w-11 shrink-0 text-center">
        <p className="font-display text-[10px] uppercase tracking-wider text-muted-foreground">
          {format(date, "EEE")}
        </p>
        <p className="font-display text-xl leading-none text-foreground">
          {format(date, "d")}
        </p>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-display text-base tracking-wide text-foreground">
          {event.title}
        </p>
        <p className="text-xs text-muted-foreground">
          {formatTime(event.start_time)} · {event.duration_min} min
          {event.price ? ` · ${event.price}` : ""}
        </p>
      </div>
      {isMatch ? (
        <span className="shrink-0 text-right text-xs font-medium text-primary">
          {event.signed_up}/{OPEN_MATCH_CAPACITY}
          <span className="hidden sm:inline">
            {" "}
            · {spotsLeft} {spotsLeft === 1 ? "spot" : "spots"} left
          </span>
        </span>
      ) : (
        event.signed_up > 0 && (
          <span className="hidden shrink-0 items-center gap-1 text-xs font-medium text-muted-foreground sm:inline-flex">
            <Users className="h-3.5 w-3.5" />
            {event.signed_up}
          </span>
        )
      )}
      <span className="inline-flex shrink-0 items-center gap-1.5 font-display text-xs tracking-widest text-primary">
        BOOK
        <ExternalLink className="h-3 w-3" />
      </span>
    </a>
  );
}
