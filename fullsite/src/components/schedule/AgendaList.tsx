import { format, isToday, parseISO } from "date-fns";
import type { PadelEvent } from "@/types/events";
import EventCard from "./EventCard";

/** Mobile/tablet view: events grouped by day in chronological order.
 *  Only days that actually have events are shown. */
export default function AgendaList({
  eventsByDate,
}: {
  eventsByDate: Map<string, PadelEvent[]>;
}) {
  const days = [...eventsByDate.keys()].sort();

  if (days.length === 0) {
    return (
      <p className="py-16 text-center text-sm text-muted-foreground">
        No events scheduled this month.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {days.map((key) => {
        const date = parseISO(key);
        const events = eventsByDate.get(key) ?? [];
        return (
          <div key={key}>
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
      })}
    </div>
  );
}
