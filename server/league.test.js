import { describe, expect, it } from "vitest";
import express from "express";
import { buildSlackText, createLeagueRouter, DEFAULT_CLOSES } from "./league.js";

const good = {
  level: "intermediate", name: "Sam Rivera", email: "sam@example.com", phone: "(503) 555-0142", smsConsent: true,
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
    expect(slack[0].text).toContain("Net Gains"); expect(slack[0].text).toContain("Alex Chen"); expect(slack[0].text).toContain("intermediate"); expect(slack[0].text).toContain("texts OK");
    // Two profiles, then one subscription job for both.
    const profiles = kl.filter(([, p]) => p.startsWith("/profiles") || p.startsWith("/profile-import"));
    expect(profiles.length).toBe(2);
    expect(kl[0][2].data.attributes.properties.league_fall_2026_team).toBe("Net Gains");
    expect(kl[0][2].data.attributes.phone_number).toBe("+15035550142");
    const sub = kl.find(([, p]) => p === "/profile-subscription-bulk-create-jobs");
    expect(sub[2].data.attributes.profiles.data.map((d) => d.attributes.email)).toEqual(["sam@example.com", "alex@example.com"]);
    expect(sheet).toHaveLength(1);
    expect(sheet[0].secret).toBe("s3cret");
    expect(sheet[0].row).toEqual(["10/15/26, 12:00 PM", "Net Gains", "Sam Rivera", "sam@example.com", "(503) 555-0142", "yes",
      "Alex Chen", "alex@example.com", "", "intermediate", "2.5", "Weeknights after 7, Sunday mornings", "Away Thanksgiving week.", "", ""]);
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
    expect((await call(a, "POST", "/api/league/register", { level: "beginner", name: "Pat Lee", email: "pat@example.com" })).status).toBe(200);
    expect(slack[0]).toContain("needs a partner");
    expect((await call(a, "POST", "/api/league/register", { level: "beginner", email: "pat@example.com" })).status).toBe(400);
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
