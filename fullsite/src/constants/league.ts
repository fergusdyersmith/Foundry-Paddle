/**
 * The club league: six weeks of doubles, one fixture a week, teams book their own court.
 * The facts /league, its poster, its Instagram set and the announcement email state, in
 * one place. The printed pieces cannot be corrected once they run, so a change here means
 * a change in the poster source (compose.py, LEAGUE_* constants) and vice versa.
 *
 * Decided in the organisers' chat, 13 Oct 2026: Jack's six-week calendar ("works for me",
 * Monica), $70 a team (Jake: "most of the people are members and can schedule their games
 * at really low rates, so we should charge something for the admin"), weekly fixtures set
 * by Ryan with the teams scheduling the court themselves (Ryan's option B), signups through
 * the site the way the Open does it, then a deadline and Ryan makes the schedule.
 */

export const LEAGUE_NAME = "The Foundry League";
export const LEAGUE_SEASON = "Fall 2026";
/** Ryan sets the fixtures and keeps the table; named for that reason, as on the Open. */
export const LEAGUE_HOST = "Ryan Chin";
export const LEAGUE_WEEKS = 6;
export const LEAGUE_DATES_LABEL = "November 2 to December 13, 2026";
export const LEAGUE_DATE_START = "2026-11-02";
export const LEAGUE_DATE_END = "2026-12-13";

/** Per team of two, one price, no tiers: the fee pays for running it, not for court time. */
export const LEAGUE_PRICE_TEAM = 70;
export const LEAGUE_PRICE_PLAYER = 35;

/** First day signups are closed. Ryan (13 Oct): "give them maybe until end of next week",
 *  so the deadline is the Sunday after, and he makes the schedule the week before week 1. */
export const LEAGUE_CLOSES = "2026-10-26";
export const LEAGUE_CLOSES_LABEL = "Sunday, October 25";

/** The six weeks, Monday to Sunday (Jack, 13 Oct). One match a week, played any time in
 *  the week the two teams agree on. Week 5 holds the Foundry Open weekend. */
export const LEAGUE_CALENDAR = [
  { week: 1, from: "2026-11-02", to: "2026-11-08", label: "Nov 2 to 8" },
  { week: 2, from: "2026-11-09", to: "2026-11-15", label: "Nov 9 to 15" },
  { week: 3, from: "2026-11-16", to: "2026-11-22", label: "Nov 16 to 22" },
  { week: 4, from: "2026-11-23", to: "2026-11-29", label: "Nov 23 to 29", note: "Thanksgiving week" },
  { week: 5, from: "2026-11-30", to: "2026-12-06", label: "Nov 30 to Dec 6", note: "The Foundry Open is that weekend" },
  { week: 6, from: "2026-12-07", to: "2026-12-13", label: "Dec 7 to 13", note: "Final week" },
] as const;

/** Match rules (Jack, 13 Oct): three sets a match, every set counts, golden point. */
export const LEAGUE_RULES = [
  { head: "One match a week", body: "Ryan posts who you play each week. The two teams pick a day and a time that suits them both, inside that week, and book the court like any other game." },
  { head: "Three sets, every set counts", body: "Every match is three full sets, and a team scores one point in the table for each set it wins. A 2 to 1 loss still earns a point, so every set is worth playing for." },
  { head: "Golden point", body: "At deuce, the next point decides the game. No advantage, no long deuce battles, matches finish in a predictable time." },
  { head: "Report the score", body: "Winners send the set scores the same day, through the score form on this site. The table on this page updates each week." },
  { head: "Cannot make a week?", body: "Talk to the other team and move the match into another week; you will just play twice that week. A match nobody plays is a forfeit." },
] as const;

/** Two leagues, men's and women's, no mixed (Ryan, 14 Oct): the results decide the NPL
 *  pairings, which are gendered. Both players on a team are in the same league. */
export type LeagueGroup = { key: "mens" | "womens"; label: string; blurb: string };
export const LEAGUE_GROUPS: LeagueGroup[] = [
  { key: "mens", label: "Men's league", blurb: "Two men to a team." },
  { key: "womens", label: "Women's league", blurb: "Two women to a team." },
];

/** Levels, the same bands as the Open. Divisions are set once signups are in (Ryan,
 *  14 Oct): with enough teams at a level it gets its own table, otherwise levels share one. */
export type LeagueLevel = { key: "beginner" | "intermediate" | "advanced"; label: string; rating: string; blurb: string };
export const LEAGUE_LEVELS: LeagueLevel[] = [
  { key: "beginner", label: "Beginner", rating: "0 to 1.75", blurb: "New to padel, or still learning the walls. Rallies over results." },
  { key: "intermediate", label: "Intermediate", rating: "1.75 to 3.5", blurb: "You play regularly and know your way around a lob and a bandeja." },
  { key: "advanced", label: "Advanced", rating: "3.5 and up", blurb: "Competitive, consistent, and happy to play three full sets." },
];

/** What the league leads to. Jake (13 Oct): the league is how the club picks who it
 *  sends to the National Padel League, and the fees go towards the winning team's travel.
 *  Keep this one line, and keep it honest: nothing is promised beyond a prize and a look. */
export const LEAGUE_NPL_LINE =
  "This season is also how we pick the pairings Foundry sends to the National Padel League.";
export const LEAGUE_PRIZE_LINE = "A prize for the winning team, handed over at the club after the final week.";

/** Where the standings come from once the league is under way: a JSON file Ryan updates
 *  each week. The page shows a placeholder until it has content. */
export const LEAGUE_TABLE_URL = "/league-data/table.json";

/** Set once the club decides how the fee is paid; null means the signup records the team
 *  and the club follows up with the payment link. Mirrors OPEN_PLAYTOMIC_URL on the Open. */
export const LEAGUE_PAY_URL: string | null = null;
