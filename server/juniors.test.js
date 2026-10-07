import { describe, expect, it } from "vitest";
import express from "express";
import { buildRegistrationSlackText, buildSlackText, createJuniorsRouter } from "./juniors.js";

const reg = {
  name: "Sam Rivera", email: "sam@example.com", phone: "(503) 555-0142", smsConsent: true,
  day: "2026-10-09", notes: "Josie has played tennis.",
  children: [{ name: "Josie Rivera", age: 11, session: "10-13" }, { name: "Max Rivera", age: 14, session: "14+" }],
};
const DAYS = { "2026-10-09": "Friday, October 9" };

async function callRegister(a, body) {
  const srv = a.listen(0); const port = srv.address().port;
  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/juniors/register`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    return { status: res.status, json: await res.json() };
  } finally { srv.close(); }
}

describe("POST /api/juniors/register", () => {
  it("appends one sheet row per child, in column order, with the secret, and answers with the day", async () => {
    const posts = [];
    const fetchImpl = async (url, init) => { posts.push({ url, body: JSON.parse(init.body) }); return { ok: true, json: async () => ({ ok: true }) }; };
    const a = app({ slackToken: null, klaviyo: null, days: DAYS, sheetUrl: "https://script.google.com/macros/s/X/exec", sheetSecret: "s3cret", fetchImpl, now: () => new Date("2026-10-02T17:00:00Z") });
    const r = await callRegister(a, reg);
    expect(r.status).toBe(200);
    expect(r.json).toMatchObject({ ok: true, day: "2026-10-09", dayLabel: "Friday, October 9", children: 2 });
    expect(posts).toHaveLength(2);
    expect(posts[0].body.secret).toBe("s3cret");
    expect(posts[0].body.row).toEqual([
      "10/2/26, 10:00 AM", "Sam Rivera", "sam@example.com", "(503) 555-0142", "yes",
      "Josie Rivera", "11", "Friday, October 9", "9 to 10:30 AM (ages 10 to 13)", "Josie has played tennis.", "",
    ]);
    expect(posts[1].body.row.slice(5, 9)).toEqual(["Max Rivera", "14", "Friday, October 9", "10:30 AM to noon (ages 14 and up)"]);
  });

  it("refuses a day the club has not opened", async () => {
    const a = app({ slackToken: null, klaviyo: null, days: DAYS, sheetUrl: "https://x/exec", fetchImpl: async () => ({ ok: true, json: async () => ({ ok: true }) }) });
    const r = await callRegister(a, { ...reg, day: "2026-10-29" });
    expect(r.status).toBe(400);
    expect(r.json.error).toMatch(/not open/);
  });

  it("needs at least one child with a name and a sensible age", async () => {
    const a = app({ slackToken: null, klaviyo: null, days: DAYS });
    expect((await callRegister(a, { ...reg, children: [] })).status).toBe(400);
    expect((await callRegister(a, { ...reg, children: [{ name: "Kid", age: 3, session: "10-13" }] })).status).toBe(400);
  });

  it("fails loudly when nothing recorded it: the form is the signup", async () => {
    const a = app({ slackToken: null, klaviyo: null, days: DAYS, sheetUrl: "https://x/exec", fetchImpl: async () => ({ ok: false, status: 500, json: async () => ({}) }) });
    const r = await callRegister(a, reg);
    expect(r.status).toBe(502);
  });

  it("still succeeds when only Slack took it", async () => {
    const a = app({ slackToken: "t", klaviyo: null, days: DAYS, sheetUrl: "https://x/exec",
      fetchImpl: async (url) => (/slack/.test(url) ? { json: async () => ({ ok: true }) } : { ok: false, status: 500, json: async () => ({}) }) });
    const r = await callRegister(a, reg);
    expect(r.status).toBe(200);
  });

  it("writes the Slack post with the day, the parent and each child's session", () => {
    const t = buildRegistrationSlackText({ ...reg, name: "<!channel> Sam" }, "Friday, October 9");
    expect(t).toContain("Friday, October 9");
    expect(t).not.toContain("<!channel>");
    expect(t).toContain("Josie Rivera (11, 9 AM)");
    expect(t).toContain("Max Rivera (14, 10:30 AM)");
    expect(t).toContain("Texts OK");
  });
});

const good = {
  name: "Sam Rivera", email: "sam@example.com", phone: "(503) 555-0142", smsConsent: true,
  ages: ["10-13", "14+"], notes: "Two kids, 11 and 14.",
};

function app(deps) {
  // No real waiting between sheet retries. The backoff is production behaviour, not
  // something to spend seconds of every test run on.
  const a = express(); a.use(express.json());
  a.use(createJuniorsRouter({ sleep: async () => {}, ...deps }));
  return a;
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

describe("the confirmation email", () => {
  const SHEET = "https://script.google.com/macros/s/X/exec";
  const CONFIRM = "https://padelmaps.org/api/internal/juniors-confirmation";

  function appWith({ sheetOk = true, confirmOk = true, confirmSecret = "k3y" } = {}) {
    const calls = [];
    const fetchImpl = async (url, init) => {
      calls.push({ url, headers: init.headers || {}, body: JSON.parse(init.body) });
      if (url === SHEET) return { ok: sheetOk, json: async () => ({ ok: sheetOk }) };
      return { ok: confirmOk, status: confirmOk ? 200 : 502, json: async () => ({ ok: confirmOk }) };
    };
    return {
      calls,
      app: app({ slackToken: null, klaviyo: null, days: DAYS, sheetUrl: SHEET,
                 sheetSecret: "s3cret", confirmUrl: CONFIRM, confirmSecret, fetchImpl,
                 now: () => new Date("2026-10-02T17:00:00Z") }),
    };
  }

  it("sends one confirmation naming every child and its session", async () => {
    const { app: a, calls } = appWith();
    const r = await callRegister(a, reg);
    expect(r.status).toBe(200);
    const conf = calls.filter((c) => c.url === CONFIRM);
    expect(conf).toHaveLength(1);
    expect(conf[0].headers["X-Juniors-Secret"]).toBe("k3y");
    expect(conf[0].body).toMatchObject({
      parent_name: "Sam Rivera",
      email: "sam@example.com",
      day_label: "Friday, October 9",
    });
    expect(conf[0].body.children).toEqual([
      { name: "Josie Rivera", age: 11, session: "10-13" },
      { name: "Max Rivera", age: 14, session: "14+" },
    ]);
  });

  it("does NOT confirm when the sheet row failed", async () => {
    // The Sheet is the list the desk works from. A parent told "you're in" because Slack
    // went through could arrive to find nobody expecting them.
    const { app: a, calls } = appWith({ sheetOk: false });
    await callRegister(a, reg);
    expect(calls.filter((c) => c.url === CONFIRM)).toHaveLength(0);
  });

  it("still signs them up when the confirmation send fails", async () => {
    // The place is already held by the time the email is attempted. A sender outage is a
    // missing email, never a failed signup.
    const { app: a } = appWith({ confirmOk: false });
    const r = await callRegister(a, reg);
    expect(r.status).toBe(200);
    expect(r.json).toMatchObject({ ok: true });
  });

  it("sends nothing when no secret is configured, and the signup still works", async () => {
    const { app: a, calls } = appWith({ confirmSecret: null });
    const r = await callRegister(a, reg);
    expect(r.status).toBe(200);
    expect(calls.filter((c) => c.url === CONFIRM)).toHaveLength(0);
  });
});

describe("a sheet row that will not land", () => {
  const SHEET = "https://script.google.com/macros/s/X/exec";
  const CONFIRM = "https://padelmaps.org/api/internal/juniors-confirmation";

  /** Fails the sheet POST for `failFor` children, by child name. */
  function appWith({ failFor = [], failTimes = Infinity } = {}) {
    const calls = [];
    const attempts = {};
    const fetchImpl = async (url, init) => {
      const body = JSON.parse(init.body);
      calls.push({ url, body });
      if (url !== SHEET) return { ok: true, status: 200, json: async () => ({ ok: true }) };
      const child = body.row[5];
      attempts[child] = (attempts[child] || 0) + 1;
      if (failFor.includes(child) && attempts[child] <= failTimes) {
        return { ok: false, status: 500, json: async () => ({ ok: false, error: "boom" }) };
      }
      return { ok: true, status: 200, json: async () => ({ ok: true }) };
    };
    return {
      calls, attempts,
      app: app({ slackToken: "x", klaviyo: null, days: DAYS, sheetUrl: SHEET,
                 sheetSecret: "s", confirmUrl: CONFIRM, confirmSecret: "k",
                 fetchImpl, now: () => new Date("2026-10-02T17:00:00Z") }),
    };
  }

  const sheetRows = (calls) => calls.filter((c) => c.url === SHEET).map((c) => c.body.row[5]);

  it("THE CASE: a failure on the first child still writes the second", async () => {
    // Jessica Tatum, 6 Oct. Samuel's row landed, Avangelina's did not, and the loop threw
    // rather than carrying on. Klaviyo had both children, the sheet had one, and the
    // parent was told she was signed up.
    const { app: a, calls } = appWith({ failFor: ["Josie Rivera"] });
    const r = await callRegister(a, reg);
    expect(r.status).toBe(200);
    expect(sheetRows(calls)).toContain("Max Rivera");
  });

  it("retries a row before giving up on it", async () => {
    // The failures this sees are transient: Apps Script cold starts and contention.
    const { app: a, attempts } = appWith({ failFor: ["Josie Rivera"] });
    await callRegister(a, reg);
    expect(attempts["Josie Rivera"]).toBe(3);
  });

  it("a row that fails once and then succeeds is NOT reported as missing", async () => {
    const { app: a, calls } = appWith({ failFor: ["Josie Rivera"], failTimes: 1 });
    await callRegister(a, reg);
    const slack = calls.filter((c) => c.url.includes("slack.com"));
    expect(slack.some((c) => /did not reach the sheet/.test(c.body.text || ""))).toBe(false);
    expect(calls.some((c) => c.url === CONFIRM)).toBe(true);   // all rows landed in the end
  });

  it("shouts to Slack, naming the child, when a row really will not land", async () => {
    // The old code logged this to a console nobody reads.
    const { app: a, calls } = appWith({ failFor: ["Josie Rivera"] });
    await callRegister(a, reg);
    const alert = calls.filter((c) => c.url.includes("slack.com"))
      .map((c) => c.body.text || "").find((t) => /did not reach the sheet/.test(t));
    expect(alert).toBeTruthy();
    expect(alert).toContain("Josie Rivera");
    expect(alert).toContain("Sam Rivera");
  });

  it("sends NO confirmation when a child is missing from the sheet", async () => {
    // A confirmation naming two children when one is not on the list is worse than no
    // confirmation: it is the thing that stops anyone asking.
    const { app: a, calls } = appWith({ failFor: ["Josie Rivera"] });
    await callRegister(a, reg);
    expect(calls.filter((c) => c.url === CONFIRM)).toHaveLength(0);
  });

  it("still tells the parent they are signed up, because they are", async () => {
    // One row landed and Klaviyo has the lot. The place is held; the list is what needs
    // a human.
    const { app: a } = appWith({ failFor: ["Josie Rivera"] });
    const r = await callRegister(a, reg);
    expect(r.status).toBe(200);
    expect(r.json).toMatchObject({ ok: true });
  });

  it("fails the signup only when NOTHING recorded it", async () => {
    const { app: a } = appWith({ failFor: ["Josie Rivera", "Max Rivera"] });
    const r = await callRegister(a, { ...reg, name: "Sam Rivera" });
    // Slack still took it, so the signup stands; the sheet alert covers the gap.
    expect(r.status).toBe(200);
  });
});
