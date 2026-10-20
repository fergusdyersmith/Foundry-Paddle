/** @vitest-environment node */
import { describe, expect, it } from "vitest";
import express from "express";
import { cleanName, cleanTeam, createEntriesRouter, normalizeLeagueEntries, normalizeOpenEntries } from "./entries.js";

const OPEN = {
  updated_at: "2026-10-20T21:45:00Z", total: 7,
  levels: [
    { key: "advanced", label: "Advanced", count: 3, pairs: [["Michael M.", "Sheehan T."]], partner_pending: ["Kelly C."], looking: [] },
    { key: "beginner", label: "Beginner", count: 4, pairs: [["Kyle L.", "Rachael B."]], partner_pending: [], looking: ["Nathan M.", "Wanqi H."] },
  ],
};
const LEAGUE = {
  updated_at: "2026-10-20T21:45:00Z", total_teams: 2,
  leagues: [
    { key: "mens", label: "Men's", levels: [{ key: "intermediate", label: "Intermediate",
      teams: [{ name: "RAAS", players: ["Aaron R.", "Shiv A."] }, { name: null, players: ["Ameya S.", "Nate D."] }], looking: ["Sam T."] }] },
  ],
};

function app(deps) {
  const a = express(); a.use(createEntriesRouter(deps)); return a;
}
async function get(a, path) {
  const srv = a.listen(0); const port = srv.address().port;
  try {
    const res = await fetch(`http://127.0.0.1:${port}${path}`);
    return { status: res.status, cache: res.headers.get("cache-control"), json: await res.json() };
  } finally { srv.close(); }
}
const ok = (body) => async () => ({ ok: true, status: 200, json: async () => body });

describe("names on the page", () => {
  it("keeps a first name and initial", () => {
    expect(cleanName("Kyle L.")).toBe("Kyle L.");
    expect(cleanName("  Ana-María   S. ")).toBe("Ana-María S.");
    expect(cleanName("D'Andre W.")).toBe("D'Andre W.");
  });
  it("drops anything that is not a short plain name", () => {
    for (const bad of ["kelly@pm.me", "<b>x</b>", "Kyle 3.5", "", null, 42, "x".repeat(41), "https://evil.example"]) {
      expect(cleanName(bad)).toBeNull();
    }
  });
  it("lets a team name carry an ampersand or a digit, not markup", () => {
    expect(cleanTeam("B&D")).toBe("B&D");
    expect(cleanTeam("Cage Against the Machine")).toBe("Cage Against the Machine");
    expect(cleanTeam("<script>")).toBeNull();
    expect(cleanTeam(null)).toBeNull();
  });
});

describe("normalizeOpenEntries", () => {
  it("orders the levels and keeps only the fields the page shows", () => {
    const out = normalizeOpenEntries(OPEN);
    expect(out.available).toBe(true);
    expect(out.total).toBe(7);
    expect(out.levels.map((l) => l.key)).toEqual(["beginner", "advanced"]);
    expect(out.levels[0]).toEqual({ key: "beginner", label: "Beginner", count: 4, pairs: [["Kyle L.", "Rachael B."]], partner_pending: [], looking: ["Nathan M.", "Wanqi H."] });
  });
  it("drops bad names and half pairs, and counts what is left when no count is given", () => {
    const out = normalizeOpenEntries({ levels: [{ key: "intermediate", pairs: [["Kim H.", "karen@x.com"], ["Alex S.", "Derek N."]], looking: ["CJ N.", 7], rating: 2.5 }] });
    expect(out.levels[0].pairs).toEqual([["Alex S.", "Derek N."]]);
    expect(out.levels[0].looking).toEqual(["CJ N."]);
    expect(out.levels[0].count).toBe(3);
    expect(out.levels[0].rating).toBeUndefined();
    expect(out.total).toBe(3);
    expect(out.updated_at).toBeNull();
  });
  it("is null for a payload it cannot read", () => {
    expect(normalizeOpenEntries(null)).toBeNull();
    expect(normalizeOpenEntries({ levels: "x" })).toBeNull();
  });
});

describe("normalizeLeagueEntries", () => {
  it("keeps teams, their names and who is looking", () => {
    const out = normalizeLeagueEntries(LEAGUE);
    expect(out.total_teams).toBe(2);
    expect(out.leagues[0].levels[0].teams).toEqual([{ name: "RAAS", players: ["Aaron R.", "Shiv A."] }, { name: null, players: ["Ameya S.", "Nate D."] }]);
    expect(out.leagues[0].levels[0].looking).toEqual(["Sam T."]);
  });
  it("drops empty levels and leagues, and unknown keys", () => {
    const out = normalizeLeagueEntries({ leagues: [
      { key: "womens", levels: [{ key: "beginner", teams: [], looking: [] }] },
      { key: "mixed", levels: [{ key: "beginner", teams: [{ players: ["Ann B."] }] }] },
      { key: "mens", levels: [{ key: "advanced", teams: [{ name: "<i>", players: ["Jo K.", "bad@x"] }] }] },
    ] });
    expect(out.leagues.map((g) => g.key)).toEqual(["mens"]);
    expect(out.leagues[0].levels[0].teams).toEqual([{ name: null, players: ["Jo K."] }]);
    expect(out.total_teams).toBe(1);
  });
});

describe("GET /api/open/entries and /api/league/entries", () => {
  it("passes a good list through, cached for five minutes", async () => {
    let calls = 0; let t = 0;
    const a = app({ fetchImpl: async () => { calls++; return ok(OPEN)(); }, now: () => t });
    const r = await get(a, "/api/open/entries");
    expect(r.status).toBe(200);
    expect(r.cache).toBe("public, max-age=300");
    expect(r.json.available).toBe(true);
    expect(r.json.levels[0].looking).toEqual(["Nathan M.", "Wanqi H."]);
    t = 60_000; await get(a, "/api/open/entries");
    expect(calls).toBe(1);
    t = 6 * 60_000; await get(a, "/api/open/entries");
    expect(calls).toBe(2);
  });
  it("says unavailable when Kumi has no list yet", async () => {
    const a = app({ fetchImpl: async () => ({ ok: false, status: 503, json: async () => ({}) }) });
    expect((await get(a, "/api/open/entries")).json).toEqual({ available: false });
    expect((await get(a, "/api/league/entries")).json).toEqual({ available: false });
  });
  it("says unavailable for a payload it cannot read, or a network failure", async () => {
    expect((await get(app({ fetchImpl: ok({ nope: 1 }) }), "/api/league/entries")).json).toEqual({ available: false });
    expect((await get(app({ fetchImpl: async () => { throw new Error("down"); } }), "/api/open/entries")).json).toEqual({ available: false });
  });
  it("serves the last good list through a short outage, not forever", async () => {
    let up = true; let t = 0;
    const a = app({ fetchImpl: async () => { if (!up) throw new Error("down"); return ok(LEAGUE)(); }, now: () => t });
    await get(a, "/api/league/entries");
    up = false; t = 10 * 60_000;
    expect((await get(a, "/api/league/entries")).json.total_teams).toBe(2);
    t = 7 * 60 * 60_000;
    expect((await get(a, "/api/league/entries")).json).toEqual({ available: false });
  });
});
