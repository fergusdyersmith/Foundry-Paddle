import { describe, expect, it } from "vitest";
import express from "express";
import { buildSlackText, createJuniorsRouter } from "./juniors.js";

const good = {
  name: "Sam Rivera", email: "sam@example.com", phone: "(503) 555-0142", smsConsent: true,
  ages: ["10-13", "14+"], notes: "Two kids, 11 and 14.",
};

function app(deps) {
  const a = express(); a.use(express.json()); a.use(createJuniorsRouter(deps)); return a;
}
async function call(a, body) {
  const srv = a.listen(0); const port = srv.address().port;
  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/juniors/notify`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    return { status: res.status, json: await res.json() };
  } finally { srv.close(); }
}
const slackOk = async () => ({ json: async () => ({ ok: true }) });

describe("POST /api/juniors/notify", () => {
  it("records to Slack and Klaviyo, tagged for the junior dates segment", async () => {
    const slack = []; const kl = [];
    const a = app({
      slackToken: "x", channel: "#t",
      fetchImpl: async (url, init) => { slack.push(JSON.parse(init.body)); return slackOk(); },
      klaviyo: async (m, p, b) => { kl.push([m, p, b]); return { status: 201, json: {} }; },
      listId: "L1", now: () => new Date("2026-10-01T12:00:00-07:00"),
    });
    const r = await call(a, good);
    expect(r.status).toBe(200);
    expect(r.json).toEqual({ ok: true });
    expect(slack[0].channel).toBe("#t");
    expect(slack[0].text).toContain("Sam Rivera"); expect(slack[0].text).toContain("10-13, 14+"); expect(slack[0].text).toContain("texts OK");
    const attrs = kl[0][2].data.attributes;
    expect(attrs.properties).toMatchObject({ juniors_dates_list: true, juniors_age_groups: ["10-13", "14+"], sms_consent: true, signup_source: "juniors" });
    expect(attrs.phone_number).toBe("+15035550142");
    expect(kl[1][1]).toBe("/profile-subscription-bulk-create-jobs");
    expect(kl[1][2].data.relationships.list.data.id).toBe("L1");
  });

  it("tags an existing profile without taking over its signup source or its consent", async () => {
    const kl = [];
    const a = app({
      klaviyo: async (m, p, b) => {
        kl.push([m, p, b]);
        return m === "POST" && p === "/profiles" ? { status: 409, json: { errors: [{ meta: { duplicate_profile_id: "P9" } }] } } : { status: 202, json: {} };
      },
      listId: null,
    });
    const r = await call(a, { ...good, smsConsent: false });
    expect(r.status).toBe(200);
    expect(kl[1][0]).toBe("PATCH"); expect(kl[1][1]).toBe("/profiles/P9");
    const props = kl[1][2].data.attributes.properties;
    expect(props.juniors_dates_list).toBe(true);
    expect(props).not.toHaveProperty("signup_source");
    expect(props).not.toHaveProperty("sms_consent");
  });

  it("takes an email alone, with no phone", async () => {
    const slack = [];
    const a = app({ slackToken: "x", fetchImpl: async (u, init) => { slack.push(JSON.parse(init.body)); return slackOk(); } });
    const r = await call(a, { name: "Sam Rivera", email: "sam@example.com", ages: ["14+"] });
    expect(r.status).toBe(200);
    expect(slack[0].text).not.toContain("texts");
  });

  it("still says yes when one of the two records took", async () => {
    const a = app({ slackToken: "x", fetchImpl: async () => { throw new Error("slack down"); },
      klaviyo: async () => ({ status: 201, json: {} }), listId: null });
    expect((await call(a, good)).status).toBe(200);
  });

  it("says no when nothing recorded the signup", async () => {
    const a = app({ slackToken: "x", fetchImpl: async () => ({ json: async () => ({ ok: false, error: "channel_not_found" }) }),
      klaviyo: async () => ({ status: 500, json: {} }) });
    expect((await call(a, good)).status).toBe(502);
    expect((await call(app({}), good)).status).toBe(502);
  });

  it("rejects a bad phone, no age group, an unknown age group and a filled honeypot", async () => {
    const a = app({ slackToken: "x", fetchImpl: slackOk });
    expect((await call(a, { ...good, phone: "12" })).status).toBe(400);
    expect((await call(a, { ...good, ages: [] })).status).toBe(400);
    expect((await call(a, { ...good, ages: ["under-10"] })).status).toBe(400);
    expect((await call(a, { ...good, website: "spam" })).status).toBe(400);
  });

  it("keeps Slack markup out of what a parent typed", () => {
    const t = buildSlackText({ ...good, name: "<!channel> Sam", notes: "" });
    expect(t).not.toContain("<!channel>"); expect(t).toContain("&lt;!channel&gt;");
  });
});
