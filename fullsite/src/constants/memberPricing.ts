/** When the club is at peak, and what a member saves off peak.
 *
 *  ONE definition, because this decides two things that must agree: the windows printed
 *  on /memberships, and the member price the schedule computes for a session. Two copies
 *  of "4pm" would eventually disagree, and the disagreement would be a wrong price on a
 *  public page rather than a test failure.
 *
 *  The ladder between tiers is the PEAK side (a court discount and a monthly credit, both
 *  per tier). Off peak, clinics and tournaments are discounted the same on every tier
 *  (Jake, 2026-08-17), which is the only reason a single "members pay X" figure can be
 *  shown against a session at all.
 */

/** Peak hours, as the club publishes them. `days` uses date-fns getDay(): 0 = Sunday.
 *  `end` is exclusive, so a 10pm Monday session is off peak. */
export const PEAK_WINDOWS = [
  { days: [1, 2, 3, 4, 5], start: "16:00", end: "22:00" },
  { days: [0, 6], start: "06:00", end: "16:00" },
] as const;

/** The same windows in words, for /memberships. Kept beside the ranges above so the page
 *  and the arithmetic cannot drift; the tests pin the sample times each line implies. */
export const PEAK_LABELS = [
  "Monday to Friday, 4pm–10pm",
  "Saturday & Sunday, 6am–4pm",
];

export const OFF_PEAK_LABELS = [
  "Monday to Friday, 6am–4pm and 10pm–midnight",
  "Saturday & Sunday, 4pm–midnight",
];

/** What a member pays off peak, by booking type: half price on tournaments, a quarter off
 *  clinics, courses and lessons. The same on all three tiers.
 *
 *  Open matches are deliberately absent. A match spot is court time, and there the benefit
 *  is per tier — free off peak, then 25% or 50% off a member's share at peak, or nothing
 *  on Student — so no single figure is true for "members". Better to say nothing than to
 *  quote a number two thirds of members do not get. */
export const OFF_PEAK_MEMBER_DISCOUNT: Record<string, number> = {
  TOURNAMENT: 0.5,
  PUBLIC_CLASS: 0.25,
  COURSE_CLASS: 0.25,
  PRIVATE_CLASS: 0.25,
};
