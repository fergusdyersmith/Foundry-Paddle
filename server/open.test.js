import { describe, expect, it } from "vitest";
import express from "express";
import { buildSlackText, createOpenRouter, currentTier, DEFAULT_CLOSES, DEFAULT_TIERS } from "./open.js";

const good = {
  name: "Sam Rivera", email: "sam@example.com", phone: "(503) 555-0142", shirt: "M",
  level: "intermediate", rating: "3.0", playtomicEmail: "sam.plays@example.com", partner: "Alex Chen", notes: "Happy to play up.",
};

function app(deps) {
  const a = express(); a.use(express.json()); a.use(createOpenRouter(deps)); return a;
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

describe("currentTier", () => {
  it("is early bird until the regular date, then regular until the close", () => {
    expect(currentTier(DEFAULT_TIERS, "2026-10-15").key).toBe("early");
    expect(currentTier(DEFAULT_TIERS, "2026-11-01").key).toBe("regular");
    expect(currentTier(DEFAULT_TIERS, "2026-11-27")).toMatchObject({ key: "regular", closed: false });
    expect(currentTier(DEFAULT_TIERS, DEFAULT_CLOSES).closed).toBe(true);
    expect(currentTier(DEFAULT_TIERS, "2026-12-05").closed).toBe(true);
  });
});

describe("POST /api/open/register", () => {
  it("records to Slack and Klaviyo, then hands back the link and the price", async () => {
    const slack = []; const kl = [];
    const a = app({
      slackToken: "x", channel: "#t", bookUrl: "https://app.playtomic.com/tournaments/abc",
      fetchImpl: async (url, init) => { slack.push(JSON.parse(init.body)); return { json: async () => ({ ok: true }) }; },
      klaviyo: async (m, p, b) => { kl.push([m, p, b]); return { status: 201, json: {} }; },
      listId: "L1", now: () => new Date("2026-10-10T12:00:00-07:00"),
    });
    const r = await call(a, "POST", "/api/open/register", good);
    expect(r.status).toBe(200);
    expect(r.json).toMatchObject({ ok: true, bookUrl: "https://app.playtomic.com/tournaments/abc", tier: "early", price: 75, pay: 75 });
    expect(slack[0].channel).toBe("#t");
    expect(slack[0].text).toContain("Sam Rivera"); expect(slack[0].text).toContain("intermediate"); expect(slack[0].text).toContain("sam.plays@example.com"); expect(slack[0].text).toContain("partner: Alex Chen");
    expect(kl[0][2].data.attributes.properties.open_dec_2026_shirt).toBe("M");
    expect(kl[0][2].data.attributes.phone_number).toBe("+15035550142");
    expect(kl[1][1]).toBe("/profile-subscription-bulk-create-jobs");
  });

  it("charges the regular price from November, and refuses after the close", async () => {
    const mk = (d) => app({ slackToken: "x", fetchImpl: async () => ({ json: async () => ({ ok: true }) }), bookUrl: "u", now: () => new Date(d) });
    expect((await call(mk("2026-11-10T12:00:00-08:00"), "POST", "/api/open/register", good)).json).toMatchObject({ tier: "regular", price: 100, pay: 100 });
    const late = await call(mk("2026-11-28T09:00:00-08:00"), "POST", "/api/open/register", good);
    expect(late.status).toBe(410); expect(late.json.bookUrl).toBeUndefined();
  });

  it("appends a row to the organisers' sheet, in column order, with the secret", async () => {
    const posts = [];
    const a = app({
      slackToken: null, klaviyo: null, bookUrl: "u", sheetUrl: "https://script.google.com/macros/s/X/exec", sheetSecret: "s3cret",
      fetchImpl: async (url, init) => { posts.push([url, JSON.parse(init.body)]); return { ok: true, status: 200, json: async () => ({ ok: true }) }; },
      now: () => new Date("2026-10-10T12:00:00-07:00"),
    });
    const r = await call(a, "POST", "/api/open/register", good);
    expect(r.json).toMatchObject({ recorded: true, bookUrl: "u" });
    expect(posts).toHaveLength(1);
    expect(posts[0][0]).toBe("https://script.google.com/macros/s/X/exec");
    expect(posts[0][1].secret).toBe("s3cret");
    expect(posts[0][1].row).toEqual(["10/10/26, 12:00 PM", "Sam Rivera", "intermediate", "Alex Chen", "M", "sam.plays@example.com", "sam@example.com", "(503) 555-0142", "Early bird", 75, "Happy to play up."]);
  });

  it("treats a refused sheet row as a failed record, not a failed sign-up", async () => {
    const a = app({ slackToken: null, klaviyo: null, bookUrl: "u", sheetUrl: "https://script.google.com/macros/s/X/exec",
      fetchImpl: async () => ({ ok: true, status: 200, json: async () => ({ ok: false, error: "bad secret" }) }) });
    const r = await call(a, "POST", "/api/open/register", good);
    expect(r.status).toBe(200); expect(r.json).toMatchObject({ recorded: false, bookUrl: "u" });
  });

  it("still hands out the link when nothing recorded the registration", async () => {
    // A sign-up must never fail because Slack or Klaviyo did: Playtomic records who paid.
    const a = app({ slackToken: "x", fetchImpl: async () => ({ json: async () => ({ ok: false, error: "channel_not_found" }) }),
      klaviyo: async () => ({ status: 500, json: {} }), bookUrl: "u" });
    const r = await call(a, "POST", "/api/open/register", good);
    expect(r.status).toBe(200);
    expect(r.json).toMatchObject({ bookUrl: "u", recorded: false });
  });

  it("still releases the link when one of the two records took", async () => {
    const a = app({ slackToken: "x", fetchImpl: async () => { throw new Error("slack down"); },
      klaviyo: async () => ({ status: 201, json: {} }), listId: null, bookUrl: "u" });
    const r = await call(a, "POST", "/api/open/register", good);
    expect(r.status).toBe(200); expect(r.json.bookUrl).toBe("u");
  });

  it("rejects a bad phone, a bad level and a filled honeypot", async () => {
    const a = app({ slackToken: "x", fetchImpl: async () => ({ json: async () => ({ ok: true }) }) });
    expect((await call(a, "POST", "/api/open/register", { ...good, phone: "12" })).status).toBe(400);
    expect((await call(a, "POST", "/api/open/register", { ...good, level: "pro" })).status).toBe(400);
    expect((await call(a, "POST", "/api/open/register", { ...good, website: "spam" })).status).toBe(400);
  });

  it("needs only a level: Playtomic collects the rest at payment", async () => {
    const slack = []; const kl = [];
    const a = app({ slackToken: "x", bookUrl: "u", fetchImpl: async (u, init) => { slack.push(JSON.parse(init.body)); return { json: async () => ({ ok: true }) }; },
      klaviyo: async (m, p, b) => { kl.push([m, p, b]); return { status: 201, json: {} }; } });
    const r = await call(a, "POST", "/api/open/register", { level: "beginner" });
    expect(r.status).toBe(200); expect(r.json.bookUrl).toBe("u");
    expect(slack[0].text).toContain("match by the Playtomic booking"); expect(slack[0].text).toContain("Shirt: not given");
    expect(kl.length).toBe(0);            // no email, so nothing to key a Klaviyo profile on
    expect((await call(a, "POST", "/api/open/register", { shirt: "M" })).status).toBe(400);
  });

  it("keeps Slack markup out of what a registrant typed", () => {
    const t = buildSlackText({ ...good, name: "<!channel> Sam", notes: "" }, currentTier(DEFAULT_TIERS, "2026-10-01"));
    expect(t).not.toContain("<!channel>"); expect(t).toContain("&lt;!channel&gt;");
  });

  it("answers status without a link until one is configured", async () => {
    const r = await call(app({ bookUrl: null, now: () => new Date("2026-10-01T12:00:00-07:00") }), "GET", "/api/open/status");
    expect(r.json).toMatchObject({ tier: "early", price: 75, bookable: false, closed: false, closes: DEFAULT_CLOSES });
  });
});
