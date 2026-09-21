import type { PadelEvent } from "@/types/events";
import type { PlannedSession } from "@/constants/previewEvening";
import { isFullEvent } from "@/lib/events";

export type PreviewSession = {
  start: string;
  end: string;
  /** Where BOOK THIS SESSION goes, or null while there is nowhere to send anyone yet. */
  bookUrl: string | null;
  /** Places remaining, when Playtomic has told us both the capacity and the roster. */
  spotsLeft: number | null;
  full: boolean;
  /** The queue behind a full session, when one is open. */
  waitlistUrl: string | null;
};

/** Tag a Playtomic link so sign-ups from this page can be told from ones staff sent by
 *  hand (the same reasoning as PLAYTOMIC_MEMBERSHIP_URLS in constants/booking.ts). */
export function withCampaign(url: string): string {
  try {
    const u = new URL(url);
    u.searchParams.set("utm_source", "website");
    u.searchParams.set("utm_campaign", "preview-evening");
    return u.toString();
  } catch {
    return url;
  }
}

/**
 * Lay the live Playtomic sessions over the planned ones.
 *
 * The planned list is what the page shows before anything exists in Playtomic, and what
 * it falls back to if the feed is down: a newspaper reader must always see the times. A
 * feed event counts as a preview session when it is on the date and its title matches;
 * it replaces the planned session with the same start time, and any that match no
 * planned start (a fourth session added later) are appended.
 *
 * A link pasted into the constants wins over the feed's, because the feed hands out no
 * link at all while an event is still private. See PlannedSession.bookUrl.
 */
export function mergePreviewSessions(
  planned: PlannedSession[],
  events: PadelEvent[],
  date: string,
  titlePattern: RegExp,
): PreviewSession[] {
  const live = events.filter((e) => e.date === date && titlePattern.test(e.title));
  const used = new Set<PadelEvent>();

  const fromEvent = (e: PadelEvent | undefined, pasted: string | null) => {
    const full = e ? isFullEvent(e) : false;
    const url = pasted ?? e?.book_url ?? null;
    const capacity = e?.capacity ?? null;
    return {
      bookUrl: url ? withCampaign(url) : null,
      spotsLeft: e && capacity != null && capacity > 0 ? Math.max(0, capacity - e.signed_up) : null,
      full,
      waitlistUrl: full && e?.waitlist?.url ? e.waitlist.url : null,
    };
  };

  const merged: PreviewSession[] = planned.map((p) => {
    const e = live.find((x) => x.start_time === p.start && !used.has(x));
    if (e) used.add(e);
    return { start: p.start, end: e?.end_time ?? p.end, ...fromEvent(e, p.bookUrl) };
  });

  for (const e of live) {
    if (used.has(e)) continue;
    merged.push({ start: e.start_time, end: e.end_time, ...fromEvent(e, null) });
  }

  return merged.sort((a, b) => a.start.localeCompare(b.start));
}
