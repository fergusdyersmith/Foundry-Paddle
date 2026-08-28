import { useState } from "react";
import { format, isToday, parseISO } from "date-fns";
import { ChevronDown } from "lucide-react";
import type { PadelEvent } from "@/types/events";
import EventCard from "./EventCard";

function DayGroup({ dayKey, events }: { dayKey: string; events: PadelEvent[] }) {
  const date = parseISO(dayKey);
  return (
    <div>
      <div className="sticky top-20 z-10 -mx-1 mb-3 flex items-baseline gap-3 bg-background/90 px-1 py-2 backdrop-blur-sm">
        <span className="font-display text-2xl tracking-wide text-foreground">
          {format(date, "EEE d")}
        </span>
        <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          {format(date, "MMMM")}
        </span>
        {isToday(date) && (
          <span className="bg-primary px-2 py-0.5 font-display text-[10px] uppercase tracking-wider text-primary-foreground">
            Today
          </span>
        )}
      </div>
      <div className="flex flex-col gap-3">
        {events.map((e) => (
          <EventCard key={e.id} event={e} />
        ))}
      </div>
    </div>
  );
}

/** Mobile/tablet view: events grouped by day in chronological order.
 *  Only days that actually have events are shown.
 *
 *  Days that have already been are kept — the calendar shows a whole month now, not
 *  just what is left of it — but folded away behind a toggle. On a phone there is no
 *  grid to scan, so leading with three weeks of finished sessions would bury the next
 *  thing anyone can actually book. A month entirely in the past opens expanded: there
 *  is nothing else on the page to see. */
export default function AgendaList({
  eventsByDate,
}: {
  eventsByDate: Map<string, PadelEvent[]>;
}) {
  const [showPast, setShowPast] = useState(false);

  const days = [...eventsByDate.keys()].sort();
  // The whole of today counts as upcoming, so a day already half over still leads.
  const todayKey = format(new Date(), "yyyy-MM-dd");
  const past = days.filter((d) => d < todayKey);
  const upcoming = days.filter((d) => d >= todayKey);
  const pastOpen = showPast || upcoming.length === 0;

  if (days.length === 0) {
    return (
      <p className="py-16 text-center text-sm text-muted-foreground">
        No events scheduled this month.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {past.length > 0 && upcoming.length > 0 && (
        <button
          type="button"
          onClick={() => setShowPast((v) => !v)}
          aria-expanded={showPast}
          className="flex items-center justify-between border border-border px-4 py-3 text-left font-display text-[11px] uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-foreground"
        >
          {showPast ? "Hide earlier days" : `Earlier this month · ${past.length} days`}
          <ChevronDown
            className={`h-4 w-4 transition-transform ${showPast ? "rotate-180" : ""}`}
          />
        </button>
      )}

      {pastOpen &&
        past.map((key) => (
          <DayGroup key={key} dayKey={key} events={eventsByDate.get(key) ?? []} />
        ))}

      {upcoming.map((key) => (
        <DayGroup key={key} dayKey={key} events={eventsByDate.get(key) ?? []} />
      ))}
    </div>
  );
}
