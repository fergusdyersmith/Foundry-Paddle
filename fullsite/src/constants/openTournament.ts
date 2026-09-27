/**
 * The December open: a two-day, all-levels tournament. The facts /open, its flyers and
 * its Instagram post state, in one place. The printed pieces cannot be corrected once
 * they run, so a change here means a change in the flyer source (compose.py, OPEN_*
 * constants) and vice versa.
 *
 * Money is NOT decided here. The server (server/open.js) computes the price tier when a
 * registration comes in, so a stale prerender can never quote a price the club will not
 * honour. The tiers below are the same table, for what the page says before anyone
 * registers; keep the two in step.
 */

export const OPEN_NAME = "The Foundry Open";
export const OPEN_DATES_LABEL = "December 5 and 6, 2026";
export const OPEN_DATE_START = "2026-12-05";
export const OPEN_DATE_END = "2026-12-06";

export const OPEN_TIERS = [
  { key: "early", label: "Early bird", price: 75, from: "2026-09-27", until: "October 31", membersEligible: false },
  { key: "regular", label: "Regular", price: 100, from: "2026-11-01", until: "November 22", membersEligible: true },
  { key: "late", label: "Late", price: 125, from: "2026-11-23", until: "December 4", membersEligible: true },
] as const;
export const OPEN_MEMBER_DISCOUNT = 0.25;
export const OPEN_CAPACITY = 100;

export const OPEN_INCLUDES = [
  "Two days of padel: Saturday round robin, Sunday double elimination",
  "A tournament t-shirt",
  "An Urban German brat and one drink ticket (Occidental beer or wine)",
  "Prizes for the finalists and runners-up in every level",
] as const;

export type OpenLevel = { key: "beginner" | "intermediate" | "advanced"; label: string; rating: string; blurb: string };
export const OPEN_LEVELS: OpenLevel[] = [
  { key: "beginner", label: "Beginner", rating: "0 to 1.75", blurb: "New to padel, or still learning the walls. Rallies over results." },
  { key: "intermediate", label: "Intermediate", rating: "1.75 to 3.5", blurb: "You play regularly and know your way around a lob and a bandeja." },
  { key: "advanced", label: "Advanced", rating: "3.5 and up", blurb: "Competitive, consistent, and ready for a long Sunday." },
];

export const SHIRT_SIZES = ["XS", "S", "M", "L", "XL", "XXL"] as const;

export const OPEN_SCHEDULE = [
  { day: "Saturday, December 5", what: "Round robin in every level. Everybody plays several matches; results seed Sunday's bracket." },
  { day: "Sunday, December 6", what: "Double elimination by level. Lose once and you are still in. Finals in the afternoon, prizes after." },
] as const;

/** Where the brackets come from once the tournament is under way. A JSON file the club
 *  updates during the weekend; the page shows a placeholder until it has content. */
export const OPEN_BRACKETS_URL = "/open-data/brackets.json";
export const OPEN_STREAM_LABEL = "Live stream powered by Clutch";
export const OPEN_STREAM_URL: string | null = null;
