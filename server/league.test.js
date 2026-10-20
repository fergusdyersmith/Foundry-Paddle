import { describe, expect, it } from "vitest";
import express from "express";
import { buildSlackText, checkConfirmQuery, confirmToken, createLeagueRouter, DEFAULT_CLOSES, newRef, teamDisplayName } from "./league.js";

const good = {
  league: "mens", level: "intermediate", name: "Sam Rivera", email: "sam@example.com", phone: "(503) 555-0142", smsConsent: true,
  partner: "Alex Chen", partnerEmail: "alex@example.com", team: "Net Gains", rating: "2.5",
  availability: "Weeknights after 7, Sunday mornings", notes: "Away Thanksgiving week.",
};

function app(deps) {
  const a = express(); a.use(express.json()); a.use(createLeagueRouter({ sleep: async () => {}, ...deps })); return a;
}
async function call(a, method, path, body) {
  const srv = a.listen(0); const port = srv.address().port;
  try {
    const res = await fetch(`http://127.0.0.1:${port}${path}`, {
      method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined,
    });
    return { status: res.status, json: await res.json() };
  } finally { srv.close(); }
}
const okSlack = async () => ({ json: async () => ({ ok: true }) });

describe("POST /api/league/register", () => {
  it("records to Slack, Klaviyo (both players) and the sheet, then answers with the pay link", async () => {
    const slack = []; const kl = []; const sheet = [];
    const a = app({
      slackToken: "x", channel: "#t", payUrl: "https://square.link/u/abc", listId: "L1",
      sheetUrl: "https://script.google.com/macros/s/X/exec", sheetSecret: "s3cret",
      fetchImpl: async (url, init) => {
        if (url.startsWith("https://script.google.com")) { sheet.push(JSON.parse(init.body)); return { ok: true, status: 200, json: async () => ({ ok: true }) }; }
        slack.push(JSON.parse(init.body)); return { json: async () => ({ ok: true }) };
      },
      klaviyo: async (m, p, b) => { kl.push([m, p, b]); return { status: 201, json: {} }; },
      now: () => new Date("2026-10-15T12:00:00-07:00"),
    });
    const r = await call(a, "POST", "/api/league/register", good);
    expect(r.status).toBe(200);
    expect(r.json).toMatchObject({ ok: true, recorded: true, payUrl: "https://square.link/u/abc", priceTeam: 70, partner: "Alex Chen" });
    expect(slack[0].channel).toBe("#t");
    expect(slack[0].text).toContain("Net Gains"); expect(slack[0].text).toContain("Alex Chen"); expect(slack[0].text).toContain("Men's league"); expect(slack[0].text).toContain("intermediate"); expect(slack[0].text).toContain("texts OK");
    // Two profiles, then one subscription job for both.
    const profiles = kl.filter(([, p]) => p.startsWith("/profiles") || p.startsWith("/profile-import"));
    expect(profiles.length).toBe(2);
    expect(kl[0][2].data.attributes.properties.league_fall_2026_team).toBe("Net Gains");
    expect(kl[0][2].data.attributes.phone_number).toBe("+15035550142");
    const sub = kl.find(([, p]) => p === "/profile-subscription-bulk-create-jobs");
    expect(sub[2].data.attributes.profiles.data.map((d) => d.attributes.email)).toEqual(["sam@example.com", "alex@example.com"]);
    expect(sheet).toHaveLength(1);
    expect(sheet[0].secret).toBe("s3cret");
    expect(sheet[0].row).toEqual(["10/15/26, 12:00 PM", "Men's", "Net Gains", "Sam Rivera", "sam@example.com", "(503) 555-0142", "yes",
      "Alex Chen", "alex@example.com", "", "intermediate", "2.5", "Weeknights after 7, Sunday mornings", "Away Thanksgiving week.", "", ""]);
  });

  it("emails the signer and the partner their place on the list, with the pay button", async () => {
    const mail = [];
    const a = app({ slackToken: null, klaviyo: null, sheetUrl: "https://sheet", sheetSecret: "s", payUrl: "https://square.link/u/abc",
      mailUrl: "https://kumi/league-mail", mailSecret: "m41l",
      fetchImpl: async (url, init) => {
        if (url === "https://kumi/league-mail") { mail.push({ headers: init.headers, body: JSON.parse(init.body) }); return { ok: true, status: 200, json: async () => ({ ok: true }) }; }
        return { ok: true, status: 200, json: async () => ({ ok: true }) };
      } });
    const r = await call(a, "POST", "/api/league/register", good);
    expect(r.status).toBe(200); expect(r.json.mailed).toBe(true);
    expect(mail).toHaveLength(2);
    expect(mail[0].headers["X-League-Secret"]).toBe("m41l");
    const [me, partner] = mail.map((m) => m.body);
    expect(me.to).toEqual(["sam@example.com"]); expect(me.intro[0]).toBe("Hi Sam,");
    expect(me.intro[1]).toBe("That is you and Alex Chen down for the men's league, intermediate.");
    expect(me.cta_text).toBe("Pay your $35"); expect(me.cta_url).toBe("https://square.link/u/abc");
    expect(me.details.map((d) => d[1]).join(" ")).toContain("three full sets");
    expect(partner.to).toEqual(["alex@example.com"]); expect(partner.intro[0]).toBe("Hi Alex,");
    expect(partner.intro[1]).toBe("Sam Rivera has signed you both up for the men's league, intermediate.");
  });

  it("asks Kumi for one pay link per player and hands each their own, in the answer and the emails", async () => {
    const mail = []; const asked = [];
    const a = app({ slackToken: null, klaviyo: null, sheetUrl: "https://sheet", sheetSecret: "s", payUrl: null,
      mailUrl: "https://kumi/league-mail", mailSecret: "m41l",
      fetchImpl: async (url, init) => {
        if (url === "https://kumi/league-pay-link") {
          const body = JSON.parse(init.body); asked.push({ headers: init.headers, body });
          return { ok: true, status: 200, json: async () => ({ ok: true, url: `https://square.link/u/${body.email.split("@")[0]}`, id: "L" }) };
        }
        if (url === "https://kumi/league-mail") { mail.push(JSON.parse(init.body)); return { ok: true, status: 200, json: async () => ({ ok: true }) }; }
        return { ok: true, status: 200, json: async () => ({ ok: true }) };
      } });
    const r = await call(a, "POST", "/api/league/register", good);
    expect(r.status).toBe(200);
    expect(asked.map((q) => q.body)).toEqual([{ email: "sam@example.com", name: "Sam Rivera" }, { email: "alex@example.com", name: "Alex Chen" }]);
    expect(asked[0].headers["X-League-Secret"]).toBe("m41l");
    expect(r.json.payUrl).toBe("https://square.link/u/sam");
    expect(mail[0].cta_url).toBe("https://square.link/u/sam"); expect(mail[0].cta_text).toBe("Pay your $35");
    expect(mail[1].cta_url).toBe("https://square.link/u/alex");
  });

  it("falls back to the shared link when Kumi cannot mint one, and to the league page when there is none", async () => {
    const mail = [];
    const mk = (payUrl) => app({ slackToken: null, klaviyo: null, sheetUrl: "https://sheet", payUrl, mailUrl: "https://kumi/league-mail", mailSecret: "m",
      fetchImpl: async (url, init) => {
        if (url === "https://kumi/league-pay-link") return { ok: false, status: 502, json: async () => ({ detail: "Square refused" }) };
        if (url === "https://kumi/league-mail") { mail.push(JSON.parse(init.body)); return { ok: true, status: 200, json: async () => ({ ok: true }) }; }
        return { ok: true, status: 200, json: async () => ({ ok: true }) };
      } });
    const shared = await call(mk("https://square.link/u/shared"), "POST", "/api/league/register", good);
    expect(shared.status).toBe(200); expect(shared.json.payUrl).toBe("https://square.link/u/shared"); expect(mail[0].cta_url).toBe("https://square.link/u/shared");
    const none = await call(mk(null), "POST", "/api/league/register", good);
    expect(none.status).toBe(200); expect(none.json.payUrl).toBe(null); expect(mail[2].cta_url).toBe("https://www.foundrypadel.com/league");
  });

  it("without a pay link the email points at the league page, and a mail failure never fails the signup", async () => {
    const mail = [];
    const a = app({ slackToken: null, klaviyo: null, sheetUrl: "https://sheet", payUrl: null, mailUrl: "https://kumi/league-mail", mailSecret: "m",
      fetchImpl: async (url, init) => {
        if (url === "https://kumi/league-mail") { mail.push(JSON.parse(init.body)); return { ok: false, status: 502 }; }
        return { ok: true, status: 200, json: async () => ({ ok: true }) };
      } });
    const r = await call(a, "POST", "/api/league/register", { ...good, partner: "", partnerEmail: "", team: "" });
    expect(r.status).toBe(200); expect(r.json.recorded).toBe(true); expect(r.json.mailed).toBe(false);
    expect(mail[0].cta_url).toBe("https://www.foundrypadel.com/league");
    expect(mail[0].intro[1]).toContain("find you a partner");
  });

  it("retries a cold sheet once, and counts it as recorded when the retry takes", async () => {
    let n = 0;
    const a = app({ slackToken: null, klaviyo: null, sheetUrl: "https://sheet",
      fetchImpl: async () => { n += 1; if (n === 1) throw new Error("socket hang up"); return { ok: true, status: 200, json: async () => ({ ok: true }) }; } });
    const r = await call(a, "POST", "/api/league/register", good);
    expect(r.status).toBe(200); expect(r.json.recorded).toBe(true); expect(n).toBe(2);
  });

  it("refuses to thank someone for a signup nothing recorded", async () => {
    // No Playtomic behind this form: an unrecorded signup is a team nobody knows about.
    const a = app({ slackToken: "x", fetchImpl: async () => ({ json: async () => ({ ok: false, error: "channel_not_found" }) }),
      klaviyo: async () => { throw new Error("down"); }, sheetUrl: null });
    const r = await call(a, "POST", "/api/league/register", good);
    expect(r.status).toBe(502); expect(r.json.error).toContain("try again");
  });

  it("stands on one record", async () => {
    const a = app({ slackToken: "x", fetchImpl: async () => { throw new Error("slack down"); },
      klaviyo: async () => ({ status: 201, json: {} }), listId: null });
    const r = await call(a, "POST", "/api/league/register", good);
    expect(r.status).toBe(200); expect(r.json.recorded).toBe(true);
  });

  it("needs a name, an email and a level, and no partner is fine", async () => {
    const slack = [];
    const a = app({ slackToken: "x", fetchImpl: async (u, init) => { slack.push(JSON.parse(init.body).text); return { json: async () => ({ ok: true }) }; } });
    expect((await call(a, "POST", "/api/league/register", { league: "womens", level: "beginner", name: "Pat Lee", email: "pat@example.com" })).status).toBe(200);
    expect(slack[0]).toContain("needs a partner"); expect(slack[0]).toContain("Women's league");
    expect((await call(a, "POST", "/api/league/register", { league: "womens", level: "beginner", email: "pat@example.com" })).status).toBe(400);
    expect((await call(a, "POST", "/api/league/register", { level: "beginner", name: "Pat Lee", email: "pat@example.com" })).status).toBe(400);
    expect((await call(a, "POST", "/api/league/register", { ...good, league: "mixed" })).status).toBe(400);
    expect((await call(a, "POST", "/api/league/register", { level: "pro", name: "Pat Lee", email: "pat@example.com" })).status).toBe(400);
    expect((await call(a, "POST", "/api/league/register", { ...good, phone: "12" })).status).toBe(400);
    expect((await call(a, "POST", "/api/league/register", { ...good, partnerPhone: "12" })).status).toBe(400);
    expect((await call(a, "POST", "/api/league/register", { ...good, website: "spam" })).status).toBe(400);
  });

  it("closes on the deadline", async () => {
    const a = app({ slackToken: "x", fetchImpl: okSlack, now: () => new Date(`${DEFAULT_CLOSES}T09:00:00-07:00`) });
    expect((await call(a, "POST", "/api/league/register", good)).status).toBe(410);
    expect((await call(a, "GET", "/api/league/status")).json).toMatchObject({ closed: true, closes: DEFAULT_CLOSES, priceTeam: 70, payable: false });
    const open = app({ now: () => new Date("2026-10-20T09:00:00-07:00"), payUrl: "u" });
    expect((await call(open, "GET", "/api/league/status")).json).toMatchObject({ closed: false, payable: true });
  });

  it("keeps Slack markup out of what a player typed", () => {
    const t = buildSlackText({ ...good, name: "<!channel> Sam", team: "" });
    expect(t).not.toContain("<!channel>"); expect(t).toContain("&lt;!channel&gt;");
  });
});

describe("POST /api/league/score", () => {
  const score = { week: 2, team: "Net Gains", opponent: "Wall Street", sets: [[6, 4], [3, 6], [7, 6]], name: "Sam Rivera", email: "sam@example.com", notes: "" };

  it("posts the result to Slack and the Scores tab, and answers with the sets won", async () => {
    const slack = []; const sheet = [];
    const teams = [{ league: "Men's", team: "Net Gains", p1: "Sam Rivera", e1: "sam@example.com", p2: "Alex Chen", e2: "alex@example.com" },
                   { league: "Men's", team: "Wall Street", p1: "Jo Park", e1: "jo@example.com", p2: "Kim Lee", e2: "kim@example.com" }];
    const a = app({ slackToken: "x", channel: "#t", klaviyo: null, sheetUrl: "https://sheet", sheetSecret: "s3cret", mailUrl: null,
      fetchImpl: async (url, init) => {
        if (url === "https://sheet") {
          const body = JSON.parse(init.body); sheet.push(body);
          return { ok: true, status: 200, json: async () => (body.action === "roster" ? { ok: true, teams } : { ok: true }) };
        }
        slack.push(JSON.parse(init.body).text); return { json: async () => ({ ok: true }) };
      }, now: () => new Date("2026-11-12T19:30:00-08:00") });
    const r = await call(a, "POST", "/api/league/score", score);
    expect(r.status).toBe(200); expect(r.json).toMatchObject({ ok: true, won: 2, lost: 1, team: "Net Gains", opponent: "Wall Street", confirmBy: "Wall Street", mailed: false });
    expect(slack[0]).toContain("week 2"); expect(slack[0]).toContain("Net Gains 2-1 Wall Street"); expect(slack[0]).toContain("6-4, 3-6, 7-6");
    const s0 = sheet.find((b) => b.action === "score");
    expect(s0.secret).toBe("s3cret");
    expect(s0.row).toEqual(["11/12/26, 7:30 PM", "2", "Net Gains", "Wall Street", "6-4", "3-6", "7-6", "2", "1", "Sam Rivera", "sam@example.com", "", "awaiting Wall Street", r.json.ref]);
  });

  it("without a sheet there is no roster, so the typed team names stand and nothing is emailed", async () => {
    const slack = [];
    const a = app({ slackToken: "x", channel: "#t", klaviyo: null, sheetUrl: null, fetchImpl: async (url, init) => { slack.push(JSON.parse(init.body).text); return { json: async () => ({ ok: true }) }; } });
    const r = await call(a, "POST", "/api/league/score", score);
    expect(r.status).toBe(200); expect(r.json).toMatchObject({ ok: true, won: 2, lost: 1, team: "Net Gains", confirmBy: null, ref: null });
    expect((await call(a, "POST", "/api/league/score", { ...score, team: "" })).status).toBe(400);
  });

  it("refuses scores a padel set cannot end on", async () => {
    const a = app({ slackToken: "x", fetchImpl: okSlack });
    for (const sets of [[[6, 5], [6, 4], [6, 4]], [[8, 6], [6, 4], [6, 4]], [[6, 6], [6, 4], [6, 4]], [[7, 4], [6, 4], [6, 4]], [[6, 4], [6, 4]]]) {
      expect((await call(a, "POST", "/api/league/score", { ...score, sets })).status).toBe(400);
    }
    expect((await call(a, "POST", "/api/league/score", { ...score, sets: [[7, 5], [6, 0], [0, 6]] })).status).toBe(200);
    expect((await call(a, "POST", "/api/league/score", { ...score, week: 7 })).status).toBe(400);
    expect((await call(a, "POST", "/api/league/score", { ...score, website: "spam" })).status).toBe(400);
  });

  it("refuses rather than thank for a score nothing recorded", async () => {
    const a = app({ slackToken: "x", fetchImpl: async () => ({ json: async () => ({ ok: false, error: "channel_not_found" }) }), sheetUrl: null });
    expect((await call(a, "POST", "/api/league/score", score)).status).toBe(502);
  });

  // With a roster (the signups sheet), the reporter is identified by email, the opponent
  // is picked from the list, and the other team is emailed a confirm-or-dispute link.
  const ROSTER = { ok: true, teams: [
    { league: "Men's", team: "Net Gains", p1: "Sam Rivera", e1: "Sam@Example.com", p2: "Alex Chen", e2: "alex@example.com" },
    { league: "Men's", team: "", p1: "Ameya Shashank", e1: "ameya@example.com", p2: "Nate DePoint", e2: "" },
    { league: "Women's", team: "Wall Street", p1: "Jo Park", e1: "jo@example.com", p2: "Kim Lee", e2: "kim@example.com" },
  ] };
  function rosterApp(extra = {}) {
    const calls = { sheet: [], slack: [], mail: [] };
    const a = app({ slackToken: "x", channel: "#t", klaviyo: null, sheetUrl: "https://sheet", sheetSecret: "s3cret",
      mailUrl: "https://kumi/league-mail", mailSecret: "m41l", siteUrl: "https://www.foundrypadel.com",
      fetchImpl: async (url, init) => {
        const body = JSON.parse(init.body);
        if (url === "https://sheet") {
          calls.sheet.push(body);
          if (body.action === "roster") return { ok: true, status: 200, json: async () => ROSTER };
          if (body.action === "score-get" || body.action === "score-confirm") return { ok: true, status: 200, json: async () => extra.sheetAnswer?.(body) ?? { ok: true, row: { week: "2", team: "Net Gains", opponent: "Ameya S. and Nate D.", sets: "6-4, 3-6, 7-6", won: "2", lost: "1", status: body.status || "awaiting", ref: body.ref } } };
          return { ok: true, status: 200, json: async () => ({ ok: true }) };
        }
        if (url === "https://kumi/league-mail") { calls.mail.push({ headers: init.headers, body }); if (extra.mailDown) return { ok: false, status: 502 }; return { ok: true, status: 200, json: async () => ({ ok: true }) }; }
        calls.slack.push(body.text); return { json: async () => ({ ok: true }) };
      }, now: () => new Date("2026-11-12T19:30:00-08:00"), ...extra.deps });
    return { a, calls };
  }

  it("names the teams from the roster, emails the other team a signed confirm link, and files the row as awaiting", async () => {
    const { a, calls } = rosterApp();
    const r = await call(a, "POST", "/api/league/score", { ...score, team: "", opponent: "ameya s. and nate d.", email: "sam@example.com" });
    expect(r.status).toBe(200);
    expect(r.json).toMatchObject({ ok: true, won: 2, lost: 1, team: "Net Gains", opponent: "Ameya S. and Nate D.", confirmBy: "Ameya S. and Nate D.", mailed: true });
    expect(r.json.ref).toMatch(/^[A-Z2-9]{8}$/);
    const row = calls.sheet.find((b) => b.action === "score").row;
    expect(row.slice(2, 4)).toEqual(["Net Gains", "Ameya S. and Nate D."]);
    expect(row[12]).toBe("awaiting Ameya S. and Nate D."); expect(row[13]).toBe(r.json.ref);
    expect(calls.mail).toHaveLength(1);
    expect(calls.mail[0].headers["X-League-Secret"]).toBe("m41l");
    const m = calls.mail[0].body;
    expect(m.to).toEqual(["ameya@example.com"]);
    expect(m.intro[0]).toBe("Hi Ameya and Nate,");
    expect(m.cta_url).toBe(`https://www.foundrypadel.com/league/confirm?ref=${r.json.ref}&t=${confirmToken("s3cret", r.json.ref, "confirm")}&a=confirm`);
    expect(m.cta_note).toContain(`&t=${confirmToken("s3cret", r.json.ref, "dispute")}&a=dispute`);
    expect(calls.slack[0]).toContain("Awaiting confirmation from Ameya S. and Nate D. (emailed)");
  });

  it("refuses a reporter whose email is on no team, and an opponent not on the list", async () => {
    const { a } = rosterApp();
    const r = await call(a, "POST", "/api/league/score", { ...score, email: "stranger@example.com", opponent: "Net Gains" });
    expect(r.status).toBe(403); expect(r.json.error).toContain("not on a league team");
    expect((await call(a, "POST", "/api/league/score", { ...score, email: "sam@example.com", opponent: "Nobody" })).status).toBe(400);
    // Same league only, and not yourself.
    expect((await call(a, "POST", "/api/league/score", { ...score, email: "sam@example.com", opponent: "Wall Street" })).status).toBe(400);
    expect((await call(a, "POST", "/api/league/score", { ...score, email: "alex@example.com", opponent: "Net Gains" })).status).toBe(400);
  });

  it("still records the score when the confirmation email fails, and says so on Slack", async () => {
    const { a, calls } = rosterApp({ mailDown: true });
    const r = await call(a, "POST", "/api/league/score", { ...score, email: "sam@example.com", opponent: "Ameya S. and Nate D." });
    expect(r.status).toBe(200); expect(r.json.mailed).toBe(false);
    expect(calls.slack[0]).toContain("confirmation email did not go out");
  });

  it("lists the teams by name only", async () => {
    const { a } = rosterApp();
    const r = await call(a, "GET", "/api/league/teams");
    expect(r.json.teams).toEqual([{ league: "mens", name: "Net Gains" }, { league: "mens", name: "Ameya S. and Nate D." }, { league: "womens", name: "Wall Street" }]);
    expect(JSON.stringify(r.json)).not.toContain("@");
  });

  it("confirms or disputes with the signed link, once", async () => {
    const { a, calls } = rosterApp();
    const ref = "ABCDEFGH";
    const t = confirmToken("s3cret", ref, "confirm");
    expect((await call(a, "GET", `/api/league/confirm?ref=${ref}&t=${t}&a=dispute`)).status).toBe(403);
    expect((await call(a, "GET", `/api/league/confirm?ref=${ref}&t=deadbeef&a=confirm`)).status).toBe(403);
    const g = await call(a, "GET", `/api/league/confirm?ref=${ref}&t=${t}&a=confirm`);
    expect(g.status).toBe(200); expect(g.json.row.team).toBe("Net Gains");
    expect(calls.sheet.at(-1)).toMatchObject({ action: "score-get", ref });
    const p = await call(a, "POST", "/api/league/confirm", { ref, t, a: "confirm" });
    expect(p.status).toBe(200); expect(p.json.action).toBe("confirm");
    expect(calls.sheet.at(-1)).toMatchObject({ action: "score-confirm", ref, status: "confirmed 11/12" });
    expect(calls.slack.at(-1)).toContain("*League score confirmed*");
    const d = await call(a, "POST", "/api/league/confirm", { ref, t: confirmToken("s3cret", ref, "dispute"), a: "dispute" });
    expect(d.status).toBe(200); expect(calls.sheet.at(-1).status).toBe("DISPUTED 11/12"); expect(calls.slack.at(-1)).toContain("DISPUTED");
  });

  it("token helpers: refs are 8 safe chars, tokens are bound to ref, action and secret", () => {
    expect(newRef()).toMatch(/^[A-Z2-9]{8}$/);
    expect(newRef(Buffer.from([0, 1, 2, 3, 4, 5, 6, 7]))).toBe("ABCDEFGH");
    const t = confirmToken("s", "ABCDEFGH", "confirm");
    expect(checkConfirmQuery("s", { ref: "abcdefgh", t, a: "confirm" })).toEqual({ ref: "ABCDEFGH", action: "confirm" });
    expect(checkConfirmQuery("s", { ref: "ABCDEFGH", t, a: "dispute" })).toBeNull();
    expect(checkConfirmQuery("other", { ref: "ABCDEFGH", t, a: "confirm" })).toBeNull();
    expect(checkConfirmQuery("s", { ref: "ABCDEFG1", t, a: "confirm" })).toBeNull();
    expect(teamDisplayName({ team: "", p1: "Ameya Shashank", p2: "Nate DePoint" })).toBe("Ameya S. and Nate D.");
    expect(teamDisplayName({ team: "", p1: "Solo", p2: "" })).toBe("Solo");
  });
});

describe("POST /api/league/pay-link", () => {
  const kumi = (asked, slack, { fail = false } = {}) => async (url, init) => {
    if (url === "https://kumi/league-pay-link") {
      asked.push(JSON.parse(init.body));
      return fail ? { ok: false, status: 502, json: async () => ({ detail: "Square refused" }) }
        : { ok: true, status: 200, json: async () => ({ ok: true, url: "https://square.link/u/own", id: "L" }) };
    }
    if (url === "https://slack.com/api/chat.postMessage") { slack.push(JSON.parse(init.body)); return { json: async () => ({ ok: true }) }; }
    return { ok: true, status: 200, json: async () => ({ ok: true }) };
  };
  const base = { slackToken: "x", channel: "#league", klaviyo: null, payUrl: null, mailUrl: "https://kumi/league-mail", mailSecret: "m41l" };

  it("mints a link with nothing filled in, asking Kumi with no email and no name", async () => {
    const asked = []; const slack = [];
    const r = await call(app({ ...base, fetchImpl: kumi(asked, slack) }), "POST", "/api/league/pay-link", {});
    expect(r.status).toBe(200);
    expect(r.json).toEqual({ ok: true, payUrl: "https://square.link/u/own", each: 35 });
    expect(asked).toEqual([{ email: null, name: null }]);
    expect(slack[0].channel).toBe("#league"); expect(slack[0].text).toBe("*Pay link only (League)*  (no name or email given)");
  });

  it("a name alone still reaches Kumi, with email null, and the name and partner go on Slack escaped", async () => {
    const asked = []; const slack = [];
    const r = await call(app({ ...base, fetchImpl: kumi(asked, slack) }), "POST", "/api/league/pay-link", { name: "Tariq Eltayeb", partner: "Alois <D>" });
    expect(r.json.payUrl).toBe("https://square.link/u/own");
    expect(asked).toEqual([{ email: null, name: "Tariq Eltayeb" }]);
    expect(slack[0].text).toBe("*Pay link only (League)*  Tariq Eltayeb  ·  partner of Alois &lt;D&gt;");
  });

  it("passes the email through, and works after signups close", async () => {
    const asked = []; const slack = [];
    const a = app({ ...base, fetchImpl: kumi(asked, slack), now: () => new Date("2026-11-03T12:00:00-08:00") });
    const r = await call(a, "POST", "/api/league/pay-link", { name: "Luz Leiton", email: "luz@example.com" });
    expect(r.status).toBe(200); expect(asked).toEqual([{ email: "luz@example.com", name: "Luz Leiton" }]);
  });

  it("answers null when no link can be made, and Slack says so; a Slack failure never stops a link", async () => {
    const asked = []; const slack = [];
    const none = await call(app({ ...base, fetchImpl: kumi(asked, slack, { fail: true }) }), "POST", "/api/league/pay-link", { name: "Dwight" });
    expect(none.status).toBe(200); expect(none.json.payUrl).toBe(null);
    expect(slack[0].text).toContain("No pay link could be made");
    const down = await call(app({ ...base, fetchImpl: async (url, init) => {
      if (url === "https://kumi/league-pay-link") return { ok: true, status: 200, json: async () => ({ url: "https://square.link/u/x" }) };
      throw new Error("slack down");
    } }), "POST", "/api/league/pay-link", {});
    expect(down.status).toBe(200); expect(down.json.payUrl).toBe("https://square.link/u/x");
  });

  it("refuses the honeypot and a bad email", async () => {
    const a = app({ ...base, fetchImpl: kumi([], []) });
    expect((await call(a, "POST", "/api/league/pay-link", { website: "spam" })).status).toBe(400);
    expect((await call(a, "POST", "/api/league/pay-link", { email: "nope" })).status).toBe(400);
  });
});
