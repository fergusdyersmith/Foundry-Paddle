/** Which day a calendar week starts on, and the matching column headers.
 *
 * These two MUST agree: change one and the grid silently labels every day wrong, which
 * no type or lint error catches. Kept together in one file, with no imports, so the pair
 * is testable without dragging a React component (and its `@/` aliases) into the test.
 *
 * Sunday-first (2026-08-10) — the US convention, and what every other calendar the club
 * uses looks like. The grid shipped Monday-first, which read as subtly wrong to anyone
 * scanning for a weekend session.
 */
export const WEEK_STARTS_ON = 0 as const; // 0 = Sunday, in date-fns terms

export const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
