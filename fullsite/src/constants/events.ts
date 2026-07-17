/** Display labels for Playtomic booking types. */
export const TYPE_LABELS: Record<string, string> = {
  COURSE_CLASS: "Course",
  PUBLIC_CLASS: "Clinic",
  PRIVATE_CLASS: "Private Class",
  TOURNAMENT: "Tournament",
  OPEN_MATCH: "Open Match",
};

/** Padel open matches are always 4 players; Playtomic doesn't expose a max, so
 *  this is the assumed capacity for "spots left" display and full-match hiding. */
export const OPEN_MATCH_CAPACITY = 4;

/** Badge color classes per booking type (Tailwind, tinted-on-dark). */
export const TYPE_COLORS: Record<string, string> = {
  COURSE_CLASS: "bg-primary/15 text-primary",
  PUBLIC_CLASS: "bg-emerald-500/15 text-emerald-400",
  PRIVATE_CLASS: "bg-amber-500/15 text-amber-400",
  TOURNAMENT: "bg-violet-500/15 text-violet-400",
  OPEN_MATCH: "bg-sky-500/15 text-sky-400",
};

/** Solid dot color per type, for compact calendar-grid event chips. */
export const TYPE_DOT_COLORS: Record<string, string> = {
  COURSE_CLASS: "bg-primary",
  PUBLIC_CLASS: "bg-emerald-400",
  PRIVATE_CLASS: "bg-amber-400",
  TOURNAMENT: "bg-violet-400",
  OPEN_MATCH: "bg-sky-400",
};

/** Stable display order for type filters / legends. */
export const EVENT_TYPE_ORDER = [
  "COURSE_CLASS",
  "PUBLIC_CLASS",
  "PRIVATE_CLASS",
  "TOURNAMENT",
  "OPEN_MATCH",
];
