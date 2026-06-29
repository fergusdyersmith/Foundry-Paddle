import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import type { PadelEvent } from "@/types/events";

async function fetchEventsRange(
  start: string,
  end: string,
): Promise<PadelEvent[]> {
  const res = await fetch(`/api/events/range?start=${start}&end=${end}`);
  if (!res.ok) throw new Error("Failed to load schedule");
  return res.json();
}

/** Fetches all events in [start, end] (inclusive) for the calendar view.
 *  Auto-refreshes every 60s and on window focus so signup counts and newly
 *  added/removed events stay current while the page is open. */
export function useScheduleEvents(start: Date, end: Date) {
  const startStr = format(start, "yyyy-MM-dd");
  const endStr = format(end, "yyyy-MM-dd");

  return useQuery({
    queryKey: ["events-range", startStr, endStr],
    queryFn: () => fetchEventsRange(startStr, endStr),
    staleTime: 60_000,
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });
}
