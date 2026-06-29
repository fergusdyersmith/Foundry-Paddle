import { Clock, ExternalLink, Users } from "lucide-react";
import { PLAYTOMIC_TENANT_URL } from "@/constants/booking";
import { TYPE_LABELS, TYPE_COLORS } from "@/constants/events";
import { formatTime } from "@/lib/events";
import type { PadelEvent } from "@/types/events";

/** Full event row used in the agenda list and the day-detail panel. */
export default function EventCard({ event }: { event: PadelEvent }) {
  const typeLabel = TYPE_LABELS[event.booking_type];
  const typeColor =
    TYPE_COLORS[event.booking_type] || "bg-muted text-muted-foreground";

  return (
    <div className="flex flex-col gap-4 border border-border bg-card p-4 sm:flex-row sm:items-center sm:p-5">
      <div className="flex shrink-0 items-center gap-2 sm:w-36">
        <Clock className="h-4 w-4 text-muted-foreground" />
        <div>
          <p className="text-sm font-medium text-foreground">
            {formatTime(event.start_time)} - {formatTime(event.end_time)}
          </p>
          <p className="text-xs text-muted-foreground">{event.duration_min} min</p>
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <h4 className="truncate font-display text-lg tracking-wide text-foreground">
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
        </div>
      </div>

      <div className="flex shrink-0 items-center justify-between gap-4 sm:justify-end sm:gap-6">
        {event.signed_up > 0 && (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Users className="h-3.5 w-3.5" />
            {event.signed_up} signed up
          </span>
        )}

        <a
          href={PLAYTOMIC_TENANT_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 border border-primary px-5 py-2 font-display text-xs tracking-widest text-primary transition-all hover:bg-primary hover:text-primary-foreground"
        >
          BOOK
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </div>
  );
}
