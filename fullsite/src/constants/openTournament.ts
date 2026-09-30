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
/** A Foundry event with Ryan Chin as its face: he directs it and is on the floor both
 *  days. Named on the page and the flyer for that reason, and no other. */
export const OPEN_HOST = "Ryan Chin";
export const OPEN_HOST_LINE = "Hosted by Ryan Chin, on the floor running it both days.";
export const OPEN_DATES_LABEL = "December 5 and 6, 2026";
export const OPEN_DATE_START = "2026-12-05";
export const OPEN_DATE_END = "2026-12-06";

/** Two tiers and a hard close (Jack, 27 Sep): no "late" price, because it teaches people
 *  that registering late is normal. No member discount: a tournament is its own thing. */
export const OPEN_TIERS = [
  { key: "early", label: "Early bird", price: 75, from: "2026-09-27", until: "October 31" },
  { key: "regular", label: "Regular", price: 100, from: "2026-11-01", until: "November 27" },
] as const;
export const OPEN_CLOSES = "2026-11-28";
export const OPEN_CLOSES_LABEL = "Friday, November 27";
export const OPEN_CAPACITY = 100;
/** The headline figure only (Jake, 30 Sep): how it splits across levels stays off the page
 *  and the flyer until sign-ups show what to expect. Raise it when sponsor money lands. */
export const OPEN_PRIZE_POOL: string | null = "$3,500";

export const OPEN_INCLUDES = [
  "Two days of padel: Saturday round robin, Sunday double elimination",
  "A tournament t-shirt",
  // Vouchers, not a free-for-all (Ryan and Monica, 28 Sep): players eat and drink a lot.
  "A brat and a drink on us each day, by voucher at check-in",
  OPEN_PRIZE_POOL ? `${OPEN_PRIZE_POOL} in prizes across the three levels` : "Prizes in every level",
] as const;

export const OPEN_SUPPLIERS = [
  { role: "Beer by", name: "Occidental Brewing", src: "/preview-evening/occidental-brewing.png" },
  { role: "Brats by", name: "Urban German Wursthaus", src: "/preview-evening/urban-german-wursthaus.png" },
  { role: "Oregon wine by", name: "Scambiare Cellars", src: null },
  { role: "Oregon wine by", name: "Conur Wines", src: null },
  { role: "Balls by", name: "Wilson", src: null },
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
