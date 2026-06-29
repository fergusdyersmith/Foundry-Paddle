import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { TYPE_DOT_COLORS, TYPE_LABELS } from "@/constants/events";
import type { PadelEvent } from "@/types/events";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MAX_CHIPS = 3;

function DayChip({ event }: { event: PadelEvent }) {
  const dot = TYPE_DOT_COLORS[event.booking_type] || "bg-muted-foreground";
  const label = TYPE_LABELS[event.booking_type] || event.booking_type;
  return (
    <div className="flex items-center gap-1.5 truncate text-left">
      <span className={`h-1.5 w-1.5 shrink-0 ${dot}`} />
      <span className="truncate text-[11px] leading-tight text-muted-foreground">
        <span className="text-foreground/80">{event.start_time}</span> {label}
      </span>
    </div>
  );
}

/** Desktop calendar grid (Mon–Sun weeks) for a single month. Each day cell
 *  shows up to a few event chips and is clickable when it has events. */
export default function MonthGrid({
  monthStart,
  eventsByDate,
  onSelectDay,
}: {
  monthStart: Date;
  eventsByDate: Map<string, PadelEvent[]>;
  onSelectDay: (day: Date) => void;
}) {
  const gridStart = startOfWeek(startOfMonth(monthStart), { weekStartsOn: 1 });
  const gridEnd = endOfWeek(endOfMonth(monthStart), { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  return (
    <div className="border border-border bg-card">
      {/* Weekday header */}
      <div className="grid grid-cols-7 border-b border-border">
        {WEEKDAYS.map((d) => (
          <div
            key={d}
            className="px-3 py-2 text-center font-display text-xs uppercase tracking-[0.2em] text-muted-foreground"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const dayEvents = eventsByDate.get(key) ?? [];
          const inMonth = isSameMonth(day, monthStart);
          const today = isToday(day);
          const hasEvents = dayEvents.length > 0;

          return (
            <button
              key={key}
              type="button"
              disabled={!hasEvents}
              onClick={() => hasEvents && onSelectDay(day)}
              className={[
                "flex min-h-[7rem] flex-col gap-1 border-b border-r border-border p-2 text-left transition-colors",
                "[&:nth-child(7n)]:border-r-0",
                inMonth ? "" : "bg-background/40",
                hasEvents
                  ? "cursor-pointer hover:bg-secondary/60"
                  : "cursor-default",
              ].join(" ")}
            >
              <div className="flex items-center justify-between">
                <span
                  className={[
                    "inline-flex h-6 w-6 items-center justify-center text-sm",
                    today
                      ? "bg-primary font-semibold text-primary-foreground"
                      : inMonth
                        ? "text-foreground"
                        : "text-muted-foreground/50",
                  ].join(" ")}
                >
                  {format(day, "d")}
                </span>
                {dayEvents.length > 0 && (
                  <span className="text-[10px] font-medium text-muted-foreground">
                    {dayEvents.length}
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-1 overflow-hidden">
                {dayEvents.slice(0, MAX_CHIPS).map((e) => (
                  <DayChip key={e.id} event={e} />
                ))}
                {dayEvents.length > MAX_CHIPS && (
                  <span className="text-[10px] font-medium text-primary">
                    +{dayEvents.length - MAX_CHIPS} more
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
