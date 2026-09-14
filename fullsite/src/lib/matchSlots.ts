/** Shaping the open-match fill-rate feed for /find-players.
 *
 *  The numbers come from Kumi (/api/coaching/match-slots), which measures how often an
 *  open match posted at a given weekday and hour actually reached four players. Kumi
 *  does the statistics — the window, the smoothing, and the decision about which slots
 *  carry enough evidence to publish at all. Everything here is presentation: ordering,
 *  labelling, and turning a rate into a shade.
 *
 *  Deliberately no fallback data. A slot Kumi omitted is one it will not stand behind,
 *  and inventing a number for it here is exactly the failure the minimum-sample rule
 *  exists to prevent.
 */

export interface MatchSlot {
  /** Club-local. Monday = 0, matching Date#getDay() shifted, not raw getDay(). */
  weekday: number;
  /** Club-local hour, 0-23. */
  hour: number;
  /** How many matches this rate is computed from. */
  matches: number;
  /** Smoothed toward the club average — the one to show. */
  fill_rate: number;
  /** Unsmoothed. Present so we can show our working, never rendered as the headline. */
  fill_rate_raw: number;
}

export interface MatchSlotFeed {
  club_fill_rate: number | null;
  window_days: number | null;
  sample_matches: number;
  min_sample: number;
  computed_at: string | null;
  slots: MatchSlot[];
}

export const DAY_NAMES = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"] as const;

/** "7 PM", "10 AM", "12 PM" — no minutes, because every slot is on the hour. */
export function hourLabel(hour: number): string {
  const suffix = hour < 12 ? "AM" : "PM";
  const h = hour % 12 === 0 ? 12 : hour % 12;
  return `${h} ${suffix}`;
}

/** Compact column header for the grid: "6a", "12p", "9p".
 *
 *  Bare numbers were ambiguous — a row reading 6 7 8 9 10 11 12 1 2 gives the reader no
 *  marker for where morning turns into afternoon, and the club is open across both. */
export function hourTick(hour: number): string {
  const h = hour % 12 === 0 ? 12 : hour % 12;
  return `${h}${hour < 12 ? "a" : "p"}`;
}

export function slotLabel(slot: Pick<MatchSlot, "weekday" | "hour">): string {
  return `${DAY_NAMES[slot.weekday] ?? "?"} ${hourLabel(slot.hour)}`;
}

export function percent(rate: number): number {
  return Math.round(rate * 100);
}

/** Best slots first; ties broken by the bigger sample, because more evidence for the
 *  same rate is a better recommendation. */
export function rankSlots(slots: MatchSlot[]): MatchSlot[] {
  return [...slots].sort(
    (a, b) => b.fill_rate - a.fill_rate || b.matches - a.matches || a.weekday - b.weekday,
  );
}

/** The hours the grid needs columns for: the span the club actually has data across,
 *  not a fixed 0-23 that would render eight empty dawn columns. */
export function hourRange(slots: MatchSlot[]): number[] {
  if (!slots.length) return [];
  const hours = slots.map((s) => s.hour);
  const lo = Math.min(...hours);
  const hi = Math.max(...hours);
  return Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);
}

export function slotMap(slots: MatchSlot[]): Map<string, MatchSlot> {
  return new Map(slots.map((s) => [`${s.weekday}-${s.hour}`, s]));
}

/** How strongly to paint a cell, 0-1, scaled across the range actually present.
 *
 *  Scaled rather than absolute on purpose. Smoothing compresses the published rates into
 *  a band (Foundry's run 0.45-0.80), so painting 0->1 would render every cell in the
 *  middle third of the ramp and the chart would say nothing. The legend carries the real
 *  percentages so the compression cannot mislead.
 *
 *  A single slot, or several identical ones, gets full intensity rather than a
 *  divide-by-zero.
 */
export function intensity(rate: number, slots: MatchSlot[]): number {
  if (!slots.length) return 0;
  const rates = slots.map((s) => s.fill_rate);
  const lo = Math.min(...rates);
  const hi = Math.max(...rates);
  if (hi === lo) return 1;
  return (rate - lo) / (hi - lo);
}

/** "Updated today" / "Updated yesterday" / "Updated 12 Sep" from the feed's computed_at.
 *
 *  Worth showing for a reason beyond tidiness: the figures are recomputed nightly, and if
 *  that job ever stops, this line is the only thing on the page that would tell a visitor
 *  the numbers have frozen. Everything else would keep rendering, confidently, forever.
 *
 *  Relative for the first week because that is the question being asked ("is this
 *  current?"), then an absolute date, where the exact age starts mattering more than the
 *  gist. `now` is injectable so the test does not depend on the day it runs.
 */
export function updatedLabel(iso: string | null | undefined, now: Date = new Date()): string {
  if (!iso) return "";
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return "";

  // Compare calendar days in the viewer's own timezone, not elapsed hours: a run at
  // 04:40 read at 09:00 the same morning is "today", and 23 hours later is "yesterday".
  const dayOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((dayOf(now) - dayOf(then)) / 86_400_000);

  if (days <= 0) return "Updated today";
  if (days === 1) return "Updated yesterday";
  if (days < 7) return `Updated ${days} days ago`;
  return `Updated ${then.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
}

/** Plain words for a rate, for the people who will not read a percentage.
 *  Anchored on the club's own average, so "ABOVE AVERAGE" means above THIS club. */
export function verdict(rate: number, baseline: number | null): string {
  if (baseline === null) return "";
  const delta = rate - baseline;
  if (delta >= 0.08) return "Fills most often";
  if (delta >= 0.02) return "Above average";
  if (delta > -0.02) return "About average";
  if (delta > -0.08) return "Below average";
  return "Often goes unfilled";
}
