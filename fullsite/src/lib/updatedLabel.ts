import { CLUB_TIMEZONE } from "@/lib/clubTime";

/** "Updated 2:45 PM" today, "Updated Oct 19, 2:45 PM" before that, Portland time. */
export function updatedLabel(iso: string | null, now: Date = new Date()): string | null {
  if (!iso) return null;
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return null;
  const day = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: CLUB_TIMEZONE }).format(d);
  const time = new Intl.DateTimeFormat("en-US", { timeZone: CLUB_TIMEZONE, hour: "numeric", minute: "2-digit" }).format(at);
  if (day(at) === day(now)) return `Updated ${time}`;
  const date = new Intl.DateTimeFormat("en-US", { timeZone: CLUB_TIMEZONE, month: "short", day: "numeric" }).format(at);
  return `Updated ${date}, ${time}`;
}
