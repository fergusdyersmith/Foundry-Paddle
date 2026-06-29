import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, Clock, Loader2, ExternalLink } from "lucide-react";
import { PLAYTOMIC_TENANT_URL } from "@/constants/booking";
import { TYPE_LABELS, TYPE_COLORS } from "@/constants/events";
import { formatTime } from "@/lib/events";
import type { PadelEvent } from "@/types/events";
import { addDays, format, isSameDay, startOfDay } from "date-fns";

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------

async function fetchEvents(date: string): Promise<PadelEvent[]> {
  const res = await fetch(`/api/events?date=${date}`);
  if (!res.ok) throw new Error("Failed to load events");
  return res.json();
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const today = startOfDay(new Date());
const VISIBLE_DAYS = 9;

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function WeekStrip({
  selectedDate,
  onSelect,
  weekStart,
  onShift,
}: {
  selectedDate: Date;
  onSelect: (d: Date) => void;
  weekStart: Date;
  onShift: (dir: -1 | 1) => void;
}) {
  const days = Array.from({ length: VISIBLE_DAYS }, (_, i) =>
    addDays(weekStart, i),
  );

  const monthLabel = format(days[0], "MMMM yyyy");

  return (
    <div className="flex flex-col items-center bg-card px-3 pt-4 pb-3 sm:px-6">
      <span className="mb-2 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
        {monthLabel}
      </span>
      <div className="flex items-center gap-1 sm:gap-2">
        <button
          onClick={() => onShift(-1)}
          className="p-1 text-muted-foreground transition-colors hover:text-foreground"
          aria-label="Previous days"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-1 sm:gap-3 overflow-x-auto">
          {days.map((day) => {
            const isSelected = isSameDay(day, selectedDate);
            const isToday = isSameDay(day, today);
            return (
              <button
                key={day.toISOString()}
                onClick={() => onSelect(day)}
                className={`flex flex-col items-center min-w-[3rem] sm:min-w-[3.5rem] px-2 py-2 transition-all ${
                  isSelected
                    ? "bg-primary text-primary-foreground"
                    : isToday
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span className="text-[10px] font-medium uppercase tracking-wider">
                  {format(day, "EEE")}
                </span>
                <span className="text-lg font-semibold leading-tight">
                  {format(day, "d")}
                </span>
              </button>
            );
          })}
        </div>

        <button
          onClick={() => onShift(1)}
          className="p-1 text-muted-foreground transition-colors hover:text-foreground"
          aria-label="Next days"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

function TypeFilterStrip({
  types,
  active,
  onToggle,
}: {
  types: string[];
  active: string | null;
  onToggle: (type: string | null) => void;
}) {
  if (types.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center justify-center gap-2 px-4 py-3 sm:px-6 border-b border-border">
      {types.map((type) => {
        const isActive = active === type;
        return (
          <button
            key={type}
            onClick={() => onToggle(isActive ? null : type)}
            className={`px-4 py-1.5 text-[10px] font-display tracking-[0.15em] uppercase transition-all border ${
              isActive
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
            }`}
          >
            {TYPE_LABELS[type] || type}
          </button>
        );
      })}
    </div>
  );
}

function EventCard({ event }: { event: PadelEvent }) {
  const typeLabel = TYPE_LABELS[event.booking_type];
  const typeColor = TYPE_COLORS[event.booking_type] || "bg-muted text-muted-foreground";

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-4 border-b border-border px-4 py-5 sm:px-6 last:border-b-0">
      <div className="flex items-center gap-2 sm:w-36 shrink-0">
        <Clock className="h-4 w-4 text-muted-foreground" />
        <div>
          <p className="text-sm font-medium text-foreground">
            {formatTime(event.start_time)} - {formatTime(event.end_time)}
          </p>
          <p className="text-xs text-muted-foreground">
            {event.duration_min} min
          </p>
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <h4 className="font-display text-lg tracking-wide text-foreground truncate">
          {event.title}
        </h4>
        <div className="mt-1 flex items-center gap-2">
          {event.court && (
            <span className="text-xs text-muted-foreground">{event.court}</span>
          )}
          {typeLabel && (
            <span className={`inline-block px-2 py-0.5 text-[10px] font-display tracking-wider uppercase ${typeColor}`}>
              {typeLabel}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4 sm:gap-6 shrink-0">
        {event.signed_up > 0 && (
          <span className="hidden sm:inline text-xs font-medium text-muted-foreground">
            {event.signed_up} signed up
          </span>
        )}

        <a
          href={PLAYTOMIC_TENANT_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 border border-primary px-5 py-2 text-xs font-display tracking-widest text-primary transition-all hover:bg-primary hover:text-primary-foreground"
        >
          BOOK
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

interface EventsModalProps {
  children: React.ReactNode;
}

export default function EventsModal({ children }: EventsModalProps) {
  const [open, setOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(today);
  const [weekStart, setWeekStart] = useState(today);
  const [activeType, setActiveType] = useState<string | null>(null);

  const dateStr = format(selectedDate, "yyyy-MM-dd");

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["events", dateStr],
    queryFn: () => fetchEvents(dateStr),
    enabled: open,
    staleTime: 60_000,
  });

  const availableTypes = [...new Set(events.map((e) => e.booking_type))];

  const filtered = activeType
    ? events.filter((e) => e.booking_type === activeType)
    : events;

  const handleShift = (dir: -1 | 1) => {
    setWeekStart((prev) => addDays(prev, dir * VISIBLE_DAYS));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="font-display text-2xl tracking-widest">
            UPCOMING EVENTS
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-sm">
            Browse clinics and programs. Select a day to see what's on.
          </DialogDescription>
        </DialogHeader>

        <WeekStrip
          selectedDate={selectedDate}
          onSelect={setSelectedDate}
          weekStart={weekStart}
          onShift={handleShift}
        />

        {!isLoading && availableTypes.length > 1 && (
          <TypeFilterStrip
            types={availableTypes}
            active={activeType}
            onToggle={setActiveType}
          />
        )}

        <div className="flex-1 overflow-y-auto min-h-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : filtered.length > 0 ? (
            filtered.map((event) => (
              <EventCard key={event.id} event={event} />
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="font-display text-xl tracking-wide text-muted-foreground">
                NO EVENTS
              </p>
              <p className="mt-2 text-sm text-muted-foreground/70">
                {activeType
                  ? "No events of this type on this day. Try clearing the filter or picking another date."
                  : "Nothing scheduled for this day. Try another date."}
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
