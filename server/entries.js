// Who is in: the Open's paid entries and the league's teams, for the "Who's in so far" and
// "Teams so far" sections (Kelly, 20 Oct: Chris Seibel wanted to see who had signed up,
// and a list of who is still looking for a partner is the part people can act on).
//
// Kumi builds both lists, because only Kumi can see Playtomic's payments and both signup
// sheets; this proxies them like the class and tournament feeds in server.js, so the
// browser stays on our origin and padelmaps.org sits behind a short cache.
//
// Names arrive as "First L." and levels as bands, never ratings, and the normaliser below
// enforces it again on this side: anything that is not a short plain name is dropped, so a
// bad upstream payload can never put markup, an email or a paragraph on a public page.
// A list Kumi cannot give is { available: false }, and the page then shows nothing, the
// same honesty as the memberships bar. A list that was good five minutes ago is served
// stale for a few hours rather than vanishing during a Kumi deploy.
import express from "express";

export const LEVEL_ORDER = ["beginner", "intermediate", "advanced"];
const LEVEL_LABELS = { beginner: "Beginner", intermediate: "Intermediate", advanced: "Advanced" };
export const LEAGUE_ORDER = ["mens", "womens"];
const LEAGUE_LABELS = { mens: "Men's", womens: "Women's" };

const MAX_NAMES = 200;
// "Kyle L.", "Juan G.", "Ana-María S.", "D'Andre W.": letters, spaces, apostrophes,
// full stops and hyphens. No digits, no @, no < >.
const NAME_RE = /^[\p{L}\p{M}][\p{L}\p{M}'’ .-]{0,39}$/u;
// A team's own name may carry a digit or an ampersand ("B&D", "Team 2").
const TEAM_RE = /^[\p{L}\p{M}\p{N}][\p{L}\p{M}\p{N}'’ .&!?,+()-]{0,59}$/u;

const list = (v) => (Array.isArray(v) ? v : []);
const squash = (s) => (typeof s === "string" ? s.replace(/\s+/g, " ").trim() : "");

export function cleanName(v) {
  const s = squash(v);
  return NAME_RE.test(s) ? s : null;
}

export function cleanTeam(v) {
  const s = squash(v);
  return s && TEAM_RE.test(s) ? s : null;
}

function names(v) {
  return list(v).map(cleanName).filter(Boolean).slice(0, MAX_NAMES);
}

function count(v) {
  const n = Number(v);
  return Number.isInteger(n) && n >= 0 && n < 10000 ? n : null;
}

function when(v) {
  return typeof v === "string" && v.length <= 40 && !Number.isNaN(Date.parse(v)) ? v : null;
}

/** The Open's entries by level, or null when the payload is unusable. */
export function normalizeOpenEntries(raw) {
  if (!raw || typeof raw !== "object" || !Array.isArray(raw.levels)) return null;
  const byKey = {};
  for (const l of raw.levels) {
    const key = LEVEL_ORDER.includes(l?.key) ? l.key : null;
    if (!key || byKey[key]) continue;
    const pairs = list(l.pairs)
      .map((p) => list(p).map(cleanName))
      .filter((p) => p.length === 2 && p.every(Boolean))
      .slice(0, MAX_NAMES);
    const pending = names(l.partner_pending);
    const looking = names(l.looking);
    const shown = pairs.length * 2 + pending.length + looking.length;
    byKey[key] = { key, label: LEVEL_LABELS[key], count: count(l.count) ?? shown, pairs, partner_pending: pending, looking };
  }
  const levels = LEVEL_ORDER.filter((k) => byKey[k]).map((k) => byKey[k]);
  const total = count(raw.total) ?? levels.reduce((n, l) => n + l.count, 0);
  return { available: true, updated_at: when(raw.updated_at), total, levels };
}

/** The league's teams by league and level, or null when the payload is unusable. */
export function normalizeLeagueEntries(raw) {
  if (!raw || typeof raw !== "object" || !Array.isArray(raw.leagues)) return null;
  const byLeague = {};
  for (const g of raw.leagues) {
    const key = LEAGUE_ORDER.includes(g?.key) ? g.key : null;
    if (!key || byLeague[key]) continue;
    const byLevel = {};
    for (const l of list(g.levels)) {
      const lk = LEVEL_ORDER.includes(l?.key) ? l.key : null;
      if (!lk || byLevel[lk]) continue;
      const teams = list(l.teams)
        .map((t) => ({ name: cleanTeam(t?.name), players: names(t?.players).slice(0, 2) }))
        .filter((t) => t.players.length > 0)
        .slice(0, MAX_NAMES);
      const looking = names(l.looking);
      if (teams.length || looking.length) byLevel[lk] = { key: lk, label: LEVEL_LABELS[lk], teams, looking };
    }
    const levels = LEVEL_ORDER.filter((k) => byLevel[k]).map((k) => byLevel[k]);
    if (levels.length) byLeague[key] = { key, label: LEAGUE_LABELS[key], levels };
  }
  const leagues = LEAGUE_ORDER.filter((k) => byLeague[k]).map((k) => byLeague[k]);
  const counted = leagues.reduce((n, g) => n + g.levels.reduce((m, l) => m + l.teams.length, 0), 0);
  return { available: true, updated_at: when(raw.updated_at), total_teams: count(raw.total_teams) ?? counted, leagues };
}

/**
 * @param {object} deps
 * @param {string} deps.openUrl     Kumi's open-entries feed
 * @param {string} deps.leagueUrl   Kumi's league-entries feed
 * @param {number} deps.ttlMs       how long a good answer is reused
 * @param {number} deps.staleMs     how long a good answer may stand in for a failed fetch
 * @param {Function} deps.fetchImpl
 * @param {Function} deps.now       () => ms
 */
export function createEntriesRouter({
  openUrl = process.env.KUMI_OPEN_ENTRIES_URL || "https://padelmaps.org/api/coaching/open-entries?slug=foundry-padel",
  leagueUrl = process.env.KUMI_LEAGUE_ENTRIES_URL || "https://padelmaps.org/api/coaching/league-entries?slug=foundry-padel",
  ttlMs = 5 * 60 * 1000,
  staleMs = 6 * 60 * 60 * 1000,
  fetchImpl = (url, opts = {}) => fetch(url, { signal: AbortSignal.timeout(10_000), ...opts }),
  now = () => Date.now(),
} = {}) {
  const router = express.Router();

  function feed(name, url, normalize) {
    let cache = { data: null, at: 0 };
    return async (req, res) => {
      res.set("Cache-Control", "public, max-age=300");
      const t = now();
      if (cache.data && t - cache.at < ttlMs) return res.json(cache.data);
      try {
        const upstream = await fetchImpl(url, { headers: { Accept: "application/json" } });
        if (!upstream.ok) throw new Error(`HTTP ${upstream.status}`);
        const data = normalize(await upstream.json());
        if (!data) throw new Error("payload not usable");
        cache = { data, at: t };
        return res.json(data);
      } catch (e) {
        console.error(`[entries] ${name} feed failed:`, e?.message || e);
        if (cache.data && t - cache.at < staleMs) return res.json(cache.data);
        return res.json({ available: false });
      }
    };
  }

  router.get("/api/open/entries", feed("open", openUrl, normalizeOpenEntries));
  router.get("/api/league/entries", feed("league", leagueUrl, normalizeLeagueEntries));
  return router;
}
