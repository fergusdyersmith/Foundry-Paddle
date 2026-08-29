import { eachDayOfInterval, format, isBefore, isSameMonth, isToday, startOfDay } from "date-fns";
import { monthGridRange, WEEKDAYS } from "@/lib/calendar";
import { TYPE_DOT_COLORS, TYPE_LABELS } from "@/constants/events";
import { isFullEvent } from "@/lib/events";
import type { PadelEvent } from "@/types/events";


const MAX_CHIPS = 3;

function DayChip({ event, past }: { event: PadelEvent; past: boolean }) {
  const dot = TYPE_DOT_COLORS[event.booking_type] || "bg-muted-foreground";
  const label = TYPE_LABELS[event.booking_type] || event.booking_type;
  // Marked here too, not only on the card behind the click: the point of the grid is to
  // scan a month for something to join, and a full session is not that. Not worth saying
  // on a day that has been, though — nothing there is joinable either way, and the
  // history months are thick with matches that filled up.
  const full = !past && isFullEvent(event);
  return (
    <div className="flex items-center gap-1.5 truncate text-left">
      <span className={`h-1.5 w-1.5 shrink-0 ${dot}`} />
      <span className="truncate text-[11px] leading-tight text-muted-foreground">
        <span className="text-foreground/80">{event.start_time}</span> {label}
        {full && <span className="text-muted-foreground/60"> · Full</span>}
      </span>
    </div>
  );
}

/** Desktop calendar grid (Sun–Sat weeks) for a single month. Each day cell
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
  // The same range the page FETCHES, so every cell drawn here had a chance to be filled.
  const { start: gridStart, end: gridEnd } = monthGridRange(monthStart);
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });
  const todayStart = startOfDay(new Date());
  // Dimming a finished day only says something when there are live ones beside it. In a
  // month that has entirely been, it would put the whole grid behind a veil.
  const gridHasFuture = !isBefore(gridEnd, todayStart);

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
          const past = isBefore(day, todayStart);
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
                // Days already gone read a shade back, so what is still bookable leads.
                past && gridHasFuture ? "opacity-60" : "",
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
                  <DayChip key={e.id} event={e} past={past} />
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
