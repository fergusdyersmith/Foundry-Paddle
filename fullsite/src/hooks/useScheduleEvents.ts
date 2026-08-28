import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import type { PadelEvent } from "@/types/events";

async function fetchEventsRange(
  start: string,
  end: string,
  includePast: boolean,
): Promise<PadelEvent[]> {
  const past = includePast ? "&include_past=1" : "";
  const res = await fetch(`/api/events/range?start=${start}&end=${end}${past}`);
  if (!res.ok) throw new Error("Failed to load schedule");
  return res.json();
}

/** Fetches all events in [start, end] (inclusive) for the calendar view.
 *
 *  `includePast` keeps days that have already happened — the schedule's month grid
 *  asks for them so a month reads as a whole month; /book, which only lists things
 *  you can still sign up for, does not.
 *
 *  `live` drives the polling: a range that ends before today cannot change, so
 *  browsing back through past months does not put the page on a 60s refresh loop.
 *  Anything still ahead auto-refreshes every 60s and on window focus, so signup
 *  counts and newly added/removed events stay current while the page is open. */
export function useScheduleEvents(
  start: Date,
  end: Date,
  { includePast = false, live = true }: { includePast?: boolean; live?: boolean } = {},
) {
  const startStr = format(start, "yyyy-MM-dd");
  const endStr = format(end, "yyyy-MM-dd");

  return useQuery({
    queryKey: ["events-range", startStr, endStr, includePast],
    queryFn: () => fetchEventsRange(startStr, endStr, includePast),
    staleTime: live ? 60_000 : 15 * 60_000,
    refetchInterval: live ? 60_000 : false,
    refetchOnWindowFocus: live,
  });
}
