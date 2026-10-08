import { describe, expect, it } from "vitest";
import express from "express";
import { createJuniorsRouter } from "./juniors.js";
import { ageOn, buildWaiverHtml, buildWaiverSlackText, cleanWaiver, waiverFilename, waiverSchema } from "./juniors-waiver.js";
import { WAIVER_SECTIONS } from "../shared/juniorWaiver.js";

const waiver = {
  parent: { name: "Sam Rivera", relationship: "Mother", phone: "(503) 555-0142", email: "sam@example.com" },
  emergency: [{ name: "Lee Rivera, father", phone: "(503) 555-0143" }, { name: "", phone: "" }],
  pickup: [{ name: "Lee Rivera", phone: "(503) 555-0143" }, { name: "", phone: "" }],
  children: [
    { name: "Josie Rivera", dob: "2015-03-20", sessionDates: "Friday, October 9", allergies: "Peanuts", conditions: "", medications: "EpiPen in her bag", insurer: "Kaiser", policy: "123", media: "yes", participantSigned: "Josie" },
    { name: "Max Rivera", dob: "2012-10-09", sessionDates: "Friday, October 9", leaveAlone: true, media: "no" },
  ],
  signature: "Samantha Rivera",
  agree: true,
  guardian: true,
};
const NOW = new Date("2026-10-08T23:30:00Z"); // 4:30 PM Portland, 8 October

function app(deps) {
  const a = express(); a.use(express.json());
  a.use(createJuniorsRouter({ sleep: async () => {}, slackToken: null, klaviyo: null, now: () => NOW, ...deps }));
  return a;
}
async function call(a, body) {
  const srv = a.listen(0); const port = srv.address().port;
  try {
    const res = await fetch(`http://127.0.0.1:${port}/api/juniors/waiver`, {
      method: "POST", headers: { "Content-Type": "application/json", "User-Agent": "vitest" }, body: JSON.stringify(body),
    });
    return { status: res.status, json: await res.json() };
  } finally { srv.close(); }
}
const scriptOk = (extra = {}) => async () => ({ ok: true, json: async () => ({ ok: true, files: [{ child: "Josie Rivera", url: "https://drive/x" }], matched: ["Josie Rivera"], unmatched: ["Max Rivera"], ...extra }) });

describe("ageOn", () => {
  it("counts whole years, birthday today included", () => {
    expect(ageOn("2015-03-20", NOW)).toBe(11);
    expect(ageOn("2012-10-09", NOW)).toBe(13); // turns 14 tomorrow, Portland time is still the 8th
    expect(ageOn("2012-10-08", NOW)).toBe(14);
    expect(ageOn("2015-02-30", NOW)).toBeNull();
  });
});

describe("POST /api/juniors/waiver", () => {
  it("sends the script one document per child, with the age, the stamp and the agreement laid in", async () => {
    const posts = [];
    const fetchImpl = async (url, init) => { posts.push({ url, body: JSON.parse(init.body) }); return scriptOk()(); };
    const r = await call(app({ sheetUrl: "https://script/exec", sheetSecret: "s3cret", fetchImpl }), waiver);
    expect(r.status).toBe(200);
    expect(r.json).toEqual({ ok: true, children: ["Josie Rivera", "Max Rivera"], unmatched: ["Max Rivera"] });
    expect(posts).toHaveLength(1);
    const b = posts[0].body;
    expect(b).toMatchObject({ secret: "s3cret", action: "waiver", stamp: "10/8/26, 4:30 PM", parent: { name: "Sam Rivera", email: "sam@example.com" } });
    expect(b.children.map((c) => [c.name, c.age, c.media, c.leaveAlone, c.filename])).toEqual([
      ["Josie Rivera", 11, "yes", false, "Rivera, Josie 2026-10-08.pdf"],
      ["Max Rivera", 13, "no", true, "Rivera, Max 2026-10-08.pdf"],
    ]);
    // Blank medical lines are recorded as "None", as the paper form asks.
    expect(b.children[0]).toMatchObject({ allergies: "Peanuts", conditions: "None", medications: "EpiPen in her bag" });
    expect(b.children[1]).toMatchObject({ allergies: "None", conditions: "None", medications: "None" });
    const html = b.children[0].html;
    expect(html).toContain("Josie Rivera");
    expect(html).toContain("Samantha Rivera");
    expect(html).toContain("October 8, 2026");
    expect(html).toContain("Peanuts");
    for (const s of WAIVER_SECTIONS) expect(html).toContain(s.heading);
    // Josie: image consent given, cannot leave alone. Max: the other way round.
    expect(html).toMatch(/&#9746; I GIVE permission/);
    expect(html).toMatch(/&#9744; I DO NOT give/);
    expect(html).toMatch(/&#9744; My child may leave/);
    expect(b.children[1].html).toMatch(/&#9746; My child may leave/);
    expect(b.children[1].html).toMatch(/&#9746; I DO NOT give/);
    expect(b.children[1].html).toContain("Not signed by the participant");
  });

  it("refuses an 18-year-old, a nonsense birth date, an unticked box, a missing media choice and a filled honeypot", async () => {
    const a = app({ sheetUrl: "https://script/exec", fetchImpl: scriptOk() });
    const adult = { ...waiver, children: [{ ...waiver.children[0], dob: "2008-10-08" }] };
    expect((await call(a, adult)).status).toBe(400);
    expect((await call(a, adult)).json.error).toMatch(/18 or over/);
    const bad = { ...waiver, children: [{ ...waiver.children[0], dob: "2015-13-01" }] };
    expect((await call(a, bad)).status).toBe(400);
    expect((await call(a, { ...waiver, agree: false })).status).toBe(400);
    expect((await call(a, { ...waiver, children: [{ ...waiver.children[0], media: "" }] })).status).toBe(400);
    expect((await call(a, { ...waiver, website: "http://spam" })).status).toBe(400);
    expect((await call(a, { ...waiver, emergency: [{ name: "", phone: "" }, { name: "", phone: "" }] })).status).toBe(400);
  });

  it("tells the parent to try again or bring paper when the script does not take it, and shouts to Slack", async () => {
    const slack = [];
    const fetchImpl = async (url, init) => {
      if (url.includes("slack")) { slack.push(JSON.parse(init.body).text); return { json: async () => ({ ok: true }) }; }
      return { ok: true, json: async () => ({ ok: false, error: "Exception: quota" }) };
    };
    const r = await call(app({ sheetUrl: "https://script/exec", slackToken: "t", fetchImpl }), waiver);
    expect(r.status).toBe(502);
    expect(r.json.error).toMatch(/paper copy/);
    await new Promise((res) => setTimeout(res, 10));
    expect(slack).toHaveLength(1);
    expect(slack[0]).toContain("did NOT file");
    expect(slack[0]).toContain("quota");
  });

  it("fails loudly with no script configured rather than pretending it filed", async () => {
    const r = await call(app({ sheetUrl: null }), waiver);
    expect(r.status).toBe(502);
  });

  it("escapes what a parent typed before it goes into the document", () => {
    const w = cleanWaiver(waiverSchema.parse({ ...waiver, children: [{ ...waiver.children[0], allergies: "<script>alert(1)</script> & nuts" }] }));
    const html = buildWaiverHtml(w, w.children[0], { age: 11, signedAt: NOW, stamp: "x", ip: "1.2.3.4", userAgent: "" });
    expect(html).not.toContain("<script>alert");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("&amp; nuts");
  });
});

describe("the Slack line", () => {
  it("names the kids, the media choice and who was not on the list, and nothing medical", () => {
    const w = cleanWaiver(waiverSchema.parse(waiver));
    const t = buildWaiverSlackText(w, [11, 13], { matched: ["Josie Rivera"], unmatched: ["Max Rivera"], files: [{ child: "Josie Rivera", url: "https://drive/x" }] });
    expect(t).toContain("Josie Rivera (11, media yes)");
    expect(t).toContain("Max Rivera (13, media no)");
    expect(t).toContain("No signup row found for: Max Rivera");
    expect(t).toContain("<https://drive/x|Josie Rivera PDF>");
    expect(t).not.toContain("Peanuts");
    expect(t).not.toContain("EpiPen");
  });
});

describe("waiverFilename", () => {
  it("sorts by surname and strips what Drive would choke on", () => {
    expect(waiverFilename({ name: "Josie Rivera" }, NOW)).toBe("Rivera, Josie 2026-10-08.pdf");
    expect(waiverFilename({ name: "Ana María de la Cruz" }, NOW)).toBe("Cruz, Ana Mara de la 2026-10-08.pdf".replace("Mara", "Mara"));
    expect(waiverFilename({ name: "Cher" }, NOW)).toBe("Cher 2026-10-08.pdf");
  });
});
