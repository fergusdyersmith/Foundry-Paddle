import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  addDays,
  addMonths,
  endOfMonth,
  format,
  isAfter,
  isBefore,
  startOfDay,
  startOfMonth,
  subMonths,
} from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { TYPE_DOT_COLORS, TYPE_LABELS } from "@/constants/events";
import { groupEventsByDate, sortTypesByOrder } from "@/lib/events";
import { useScheduleEvents } from "@/hooks/useScheduleEvents";
import MonthGrid from "@/components/schedule/MonthGrid";
import AgendaList from "@/components/schedule/AgendaList";
import EventCard from "@/components/schedule/EventCard";

const today = startOfDay(new Date());
const thisMonth = startOfMonth(today);
// Playtomic only returns ~30 days out, so the calendar spans at most this month
// and the next.
const maxMonth = startOfMonth(addDays(today, 30));

const Schedule = () => {
  const [monthStart, setMonthStart] = useState(thisMonth);
  const [activeType, setActiveType] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const {
    data: events = [],
    isLoading,
    isError,
    isFetching,
    refetch,
  } = useScheduleEvents(startOfMonth(monthStart), endOfMonth(monthStart));

  const availableTypes = useMemo(
    () => sortTypesByOrder([...new Set(events.map((e) => e.booking_type))]),
    [events],
  );

  const filtered = useMemo(
    () => (activeType ? events.filter((e) => e.booking_type === activeType) : events),
    [events, activeType],
  );

  const eventsByDate = useMemo(() => groupEventsByDate(filtered), [filtered]);

  const canPrev = isAfter(monthStart, thisMonth);
  const canNext = isBefore(monthStart, maxMonth);

  const selectedKey = selectedDay ? format(selectedDay, "yyyy-MM-dd") : null;
  const selectedEvents = selectedKey ? (eventsByDate.get(selectedKey) ?? []) : [];

  return (
    <main className="min-h-screen bg-background pt-24">
      <section className="px-6 py-16">
        <div className="mx-auto max-w-6xl">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="mb-12 text-center"
          >
            <h1 className="mb-4 font-display text-6xl text-foreground sm:text-8xl">
              SCHEDULE
            </h1>
            <div className="flex items-center justify-center gap-4">
              <div className="h-px w-16 bg-primary" />
              <span className="font-body text-sm uppercase tracking-[0.2em] text-primary">
                Clinics · Open Play · Lessons · Tournaments
              </span>
              <div className="h-px w-16 bg-primary" />
            </div>
          </motion.div>

          {/* Month nav + live indicator */}
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => canPrev && setMonthStart((m) => subMonths(m, 1))}
                disabled={!canPrev}
                aria-label="Previous month"
                className="p-1.5 text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <span className="min-w-[10rem] text-center font-display text-2xl tracking-widest text-foreground">
                {format(monthStart, "MMMM yyyy")}
              </span>
              <button
                onClick={() => canNext && setMonthStart((m) => addMonths(m, 1))}
                disabled={!canNext}
                aria-label="Next month"
                className="p-1.5 text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>

            <span className="hidden items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-muted-foreground sm:flex">
              <RefreshCw
                className={`h-3 w-3 ${isFetching ? "animate-spin text-primary" : ""}`}
              />
              Live
            </span>
          </div>

          {/* Type filters (double as a color legend) */}
          {availableTypes.length > 1 && (
            <div className="mb-6 flex flex-wrap items-center gap-2">
              {availableTypes.map((type) => {
                const isActive = activeType === type;
                return (
                  <button
                    key={type}
                    onClick={() => setActiveType(isActive ? null : type)}
                    className={`inline-flex items-center gap-2 border px-3 py-1.5 font-display text-[10px] uppercase tracking-[0.15em] transition-all ${
                      isActive
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 ${TYPE_DOT_COLORS[type] || "bg-muted-foreground"}`}
                    />
                    {TYPE_LABELS[type] || type}
                  </button>
                );
              })}
            </div>
          )}

          {/* Content */}
          {isLoading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center gap-4 py-24">
              <p className="text-sm text-muted-foreground">
                Couldn't load the schedule.
              </p>
              <button
                onClick={() => refetch()}
                className="border border-primary px-5 py-2 font-display text-xs tracking-widest text-primary transition-all hover:bg-primary hover:text-primary-foreground"
              >
                RETRY
              </button>
            </div>
          ) : (
            <>
              <div className="hidden lg:block">
                <MonthGrid
                  monthStart={monthStart}
                  eventsByDate={eventsByDate}
                  onSelectDay={setSelectedDay}
                />
              </div>
              <div className="lg:hidden">
                <AgendaList eventsByDate={eventsByDate} />
              </div>
            </>
          )}
        </div>
      </section>

      {/* Day detail (desktop grid click) */}
      <Sheet
        open={selectedDay !== null}
        onOpenChange={(open) => !open && setSelectedDay(null)}
      >
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="font-display text-2xl tracking-widest">
              {selectedDay ? format(selectedDay, "EEEE, MMMM d") : ""}
            </SheetTitle>
          </SheetHeader>
          <div className="mt-6 flex flex-col gap-3">
            {selectedEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground">No events this day.</p>
            ) : (
              selectedEvents.map((e) => <EventCard key={e.id} event={e} />)
            )}
          </div>
        </SheetContent>
      </Sheet>
    </main>
  );
};

export default Schedule;
