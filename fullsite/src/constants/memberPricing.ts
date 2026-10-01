/** When the club is at peak, and what a member saves off peak.
 *
 *  ONE definition, because this decides two things that must agree: the windows printed
 *  on /memberships, and the member price the schedule computes for a session. Two copies
 *  of "4pm" would eventually disagree, and the disagreement would be a wrong price on a
 *  public page rather than a test failure.
 *
 *  The ladder between tiers is the PEAK side (a court discount and, since 2026-10-01, a
 *  tournament discount, both per tier). Off peak, clinics and tournaments are the same
 *  on every tier
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

/** What a member pays off PEAK on a tournament, by tier.
 *
 *  New on 2026-10-01, replacing the $25/$50 monthly credit. Each tier gets the same
 *  percentage off a peak tournament that it already gets off a peak court booking, so a
 *  tier is one number rather than a percentage plus a credit with its own rules.
 *
 *  The credit was not failing on cost, it was failing on delivery: Playtomic cannot split
 *  one payment between wallet balance and card, so a balance smaller than the thing you
 *  wanted to book could not be spent at all, and whatever was left expired monthly.
 *
 *  Student is absent on purpose. That tier is peak at standard rates.
 *
 *  Note this breaks the assumption below that one "members pay X" figure can stand for a
 *  session: it can off peak, where every tier is the same, but a PEAK tournament is two
 *  different prices. Anything showing a single member price must say which tier it means,
 *  or show the range.
 */
export const PEAK_TOURNAMENT_MEMBER_DISCOUNT: Record<string, number> = {
  regular: 0.25,
  padelhead: 0.5,
};

/** What a member pays off peak, by booking type: half price on tournaments, a quarter off
 *  clinics, courses and lessons, and nothing at all for an open match. The same on all
 *  three tiers, which is what lets one figure stand for "members".
 *
 *  An open match is 1 (a whole hundred per cent) because unlimited off-peak play covers a
 *  member's place in one. The club states it in as many words: "free off-peak play is one
 *  player's place in an open match". It is the tier ladder's one exception — everything
 *  else about court time varies by tier, which is why PEAK says nothing for any type. */
export const OFF_PEAK_MEMBER_DISCOUNT: Record<string, number> = {
  OPEN_MATCH: 1,
  TOURNAMENT: 0.5,
  // Same benefit as a tournament: Playtomic prices open play exactly like one, and only
  // the badge differs. Omitting it here would silently drop the member price off the card.
  OPEN_PLAY: 0.5,
  PUBLIC_CLASS: 0.25,
  COURSE_CLASS: 0.25,
  PRIVATE_CLASS: 0.25,
};
