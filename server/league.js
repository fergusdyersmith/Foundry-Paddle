// Signups for the club league (six weeks of doubles, one fixture a week, teams of two).
//
// Built on the Open's registration (server/open.js) with one difference that matters: the
// league is not in Playtomic. Playtomic's league feature books the courts itself and charges
// nothing for them (Ryan, 13 Oct), and the whole idea is that teams book their own court at
// whatever hour suits them, so Playtomic holds nothing about the league. This form IS the
// signup. The $70 team fee is collected separately: LEAGUE_PAY_URL, once set, is handed
// back after a recorded signup, the way the Open hands back its Playtomic link; until then
// the page says the club will follow up.
//
// Three records, any one of which makes the signup stand:
//   1. A Slack post to the club channel: the list the organisers read.
//   2. A Klaviyo profile per player with the answers as properties, subscribed to the
//      interest list, so the league's emails go to a segment.
//   3. A row in the organisers' Google Sheet (Ryan makes the schedule and keeps the table
//      from it), through the Apps Script web app in league-sheet.gs: no Google credentials
//      here, just the script's URL and a shared secret it checks.
// Nothing here charges anyone.
import express from "express";
import { z } from "zod";
import { escapeSlack, normalizePhone, sanitize } from "./notify.js";
import { rateLimit, sheetCell } from "./abuse.js";
import { upsertProfile } from "./klaviyoProfile.js";

export const LEVELS = ["beginner", "intermediate", "advanced"];
/** Per team of two. One price, no tiers. */
export const DEFAULT_PRICE_TEAM = 70;
/** First day signups are closed. Mirrors LEAGUE_CLOSES in fullsite/src/constants/league.ts. */
export const DEFAULT_CLOSES = "2026-10-26";
export const SEASON_KEY = "league_fall_2026";

export function todayInClub(now = new Date(), timeZone = "America/Los_Angeles") {
  return new Intl.DateTimeFormat("en-CA", { timeZone }).format(now);
}

const E164 = /^\+[1-9]\d{6,14}$/;
const opt = (schema) => schema.optional().or(z.literal(""));

// One form, one team. The first player is the one filling it in, so their name and email
// are needed; the partner's name is needed (a team is two people), the partner's contact
// details are welcome. A player without a partner can still sign up and say so.
export const signupSchema = z.object({
  level: z.enum(LEVELS),
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(255),
  phone: opt(z.string().trim().max(30)),
  smsConsent: z.boolean().optional(),
  // Their partner. Blank means "pair me up".
  partner: opt(z.string().trim().max(80)),
  partnerEmail: opt(z.string().trim().email().max(255)),
  partnerPhone: opt(z.string().trim().max(30)),
  team: opt(z.string().trim().max(60)),
  // Their own Playtomic rating, if they know it. Free text so "about 2.5" is fine.
  rating: opt(z.string().trim().max(20)),
  // When they can usually play: Ryan uses it to pair the weeks that need pairing.
  availability: opt(z.string().trim().max(300)),
  notes: opt(z.string().trim().max(500)),
  // Anti-spam: the honeypot must be empty, exactly as the other forms do it.
  website: z.string().max(0).optional(),
});

export function buildSlackText(r) {
  const who = [r.name, r.email, r.phone].filter(Boolean).map(escapeSlack).join("  ·  ");
  const partner = r.partner
    ? [r.partner, r.partnerEmail, r.partnerPhone].filter(Boolean).map(escapeSlack).join("  ·  ")
    : "needs a partner";
  const bits = [
    `*New league signup*  ${r.team ? `*${escapeSlack(r.team)}*  ` : ""}${who}`,
    `Partner: ${partner}`,
    `Level: *${r.level}*${r.rating ? ` (rating ${escapeSlack(r.rating)})` : ""}${r.phone ? `  ·  ${r.smsConsent ? "texts OK" : "no texts"}` : ""}`,
  ];
  if (r.availability) bits.push(`Plays: ${escapeSlack(r.availability)}`);
  if (r.notes) bits.push(`_${escapeSlack(r.notes)}_`);
  return bits.join("\n");
}

/**
 * @param {object} deps
 * @param {Function} deps.klaviyo      (method, path, body) => {status, json}; null disables
 * @param {string}   deps.listId       Klaviyo list to subscribe to
 * @param {string}   deps.slackToken   bot token; null disables Slack
 * @param {string}   deps.channel
 * @param {string|null} deps.payUrl    where the team fee is paid, null until the club decides
 * @param {string|null} deps.sheetUrl  the Apps Script web app that appends a row; null disables
 * @param {string|null} deps.sheetSecret  shared secret the script checks
 * @param {string}   deps.closes       first day signups are closed, YYYY-MM-DD
 * @param {Function} deps.fetchImpl
 * @param {Function} deps.now
 */
export function createLeagueRouter({
  klaviyo = null,
  listId = process.env.KLAVIYO_INTEREST_LIST_ID,
  slackToken = process.env.SLACK_BOT_TOKEN,
  // Where the Open's roster already lands, unless told otherwise.
  channel = process.env.LEAGUE_SLACK_CHANNEL || process.env.OPEN_SLACK_CHANNEL || process.env.SLACK_CHANNEL || "#front-desk",
  payUrl = process.env.LEAGUE_PAY_URL || null,
  sheetUrl = process.env.LEAGUE_SHEET_WEBHOOK || null,
  sheetSecret = process.env.LEAGUE_SHEET_SECRET || null,
  priceTeam = DEFAULT_PRICE_TEAM,
  closes = DEFAULT_CLOSES,
  // Retries for the sheet row: an Apps Script cold start fails the first POST and
  // succeeds on the second (the junior clinic's lesson, 6 Oct).
  sheetAttempts: SHEET_ATTEMPTS = 3,
  sheetRetryMs: SHEET_RETRY_MS = 300,
  sleep = (ms) => new Promise((res) => setTimeout(res, ms)),
  fetchImpl = (url, opts = {}) => fetch(url, { signal: AbortSignal.timeout(10_000), ...opts }),
  now = () => new Date(),
} = {}) {
  const router = express.Router();
  const registerLimit = rateLimit({ name: "league", max: 6, windowMs: 10 * 60 * 1000 });

  const stamp = () =>
    new Intl.DateTimeFormat("en-US", { timeZone: "America/Los_Angeles", dateStyle: "short", timeStyle: "short" }).format(now());

  async function postSlack(text) {
    if (!slackToken) return false;
    const res = await fetchImpl("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: { Authorization: `Bearer ${slackToken}`, "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({ channel, text, unfurl_links: false }),
    });
    const json = await res.json().catch(() => ({}));
    if (!json.ok) throw new Error(`slack ${json.error || res.status}`);
    return true;
  }

  // One profile per player we have an email for: the signer always, the partner when
  // their email was given. Both carry the team, so a league email can go to the segment.
  async function recordKlaviyo(r) {
    if (!klaviyo) return false;
    const at = now().toISOString();
    const people = [
      { email: r.email, name: r.name, phone: r.phone, role: "player", partner: r.partner || null },
      ...(r.partnerEmail ? [{ email: r.partnerEmail, name: r.partner, phone: r.partnerPhone, role: "partner", partner: r.name }] : []),
    ];
    for (const p of people) {
      const properties = {
        [`${SEASON_KEY}_level`]: r.level,
        [`${SEASON_KEY}_team`]: r.team || null,
        [`${SEASON_KEY}_partner`]: p.partner,
        [`${SEASON_KEY}_role`]: p.role,
        [`${SEASON_KEY}_rating`]: p.role === "player" ? r.rating || null : null,
        [`${SEASON_KEY}_availability`]: r.availability || null,
        [`${SEASON_KEY}_registered_at`]: at,
        signup_source: "league-fall-2026",
      };
      const attrs = { email: p.email, properties };
      if (p.name) attrs.first_name = p.name.split(" ")[0];
      const phone = p.phone ? normalizePhone(p.phone) : null;
      if (phone) attrs.phone_number = phone;
      await upsertProfile(klaviyo, attrs);
    }
    if (listId) {
      await klaviyo("POST", "/profile-subscription-bulk-create-jobs", {
        data: {
          type: "profile-subscription-bulk-create-job",
          attributes: {
            custom_source: "League signup",
            profiles: { data: people.map((p) => ({ type: "profile", attributes: { email: p.email, subscriptions: { email: { marketing: { consent: "SUBSCRIBED" } } } } })) },
          },
          relationships: { list: { data: { type: "list", id: listId } } },
        },
      });
    }
    return true;
  }

  // One flat row, in the sheet's column order (HEADERS in league-sheet.gs). Retried,
  // because the failures this sees are Apps Script cold starts.
  async function appendSheetRow(r) {
    if (!sheetUrl) return false;
    const row = [
      stamp(), r.team || "", r.name, r.email, r.phone || "", r.phone ? (r.smsConsent ? "yes" : "no") : "",
      r.partner || "", r.partnerEmail || "", r.partnerPhone || "", r.level, r.rating || "",
      r.availability || "", r.notes || "", "", "",
    ].map(sheetCell);
    let lastError = null;
    for (let attempt = 1; attempt <= SHEET_ATTEMPTS; attempt++) {
      try {
        const res = await fetchImpl(sheetUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ secret: sheetSecret || "", row }),
        });
        if (!res.ok) throw new Error(`sheet ${res.status}`);
        const json = await res.json().catch(() => ({}));
        if (json.ok === false) throw new Error(`sheet ${json.error || "refused"}`);
        return true;
      } catch (e) {
        lastError = e;
        if (attempt < SHEET_ATTEMPTS) await sleep(SHEET_RETRY_MS * attempt);
      }
    }
    throw lastError;
  }

  // What the page needs before anyone fills the form in: whether signups are open and
  // whether there is somewhere to pay yet.
  router.get("/api/league/status", (req, res) => {
    const closed = todayInClub(now()) >= closes;
    res.json({ closed, closes, priceTeam, payable: Boolean(payUrl) });
  });

  router.post("/api/league/register", async (req, res) => {
    const parsed = signupSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Your name, an email and the level you want to play are needed." });
    }
    if (registerLimit(req, res)) return;
    const r = {
      ...parsed.data,
      name: sanitize(parsed.data.name, 80),
      phone: sanitize(parsed.data.phone || "", 30),
      partner: sanitize(parsed.data.partner || "", 80),
      partnerPhone: sanitize(parsed.data.partnerPhone || "", 30),
      team: sanitize(parsed.data.team || "", 60),
      rating: sanitize(parsed.data.rating || "", 20),
      availability: sanitize(parsed.data.availability || "", 300),
      notes: sanitize(parsed.data.notes || "", 500),
    };
    for (const p of [r.phone, r.partnerPhone]) {
      if (p && !E164.test(normalizePhone(p) || "")) {
        return res.status(400).json({ error: "That phone number does not look right. Include the area code." });
      }
    }
    if (todayInClub(now()) >= closes) {
      return res.status(410).json({ error: "Signups have closed and the schedule is being made. Email portland@foundrypadel.com if you think there is still a place." });
    }

    const outcomes = await Promise.allSettled([postSlack(buildSlackText(r)), recordKlaviyo(r), appendSheetRow(r)]);
    const recorded = outcomes.some((o) => o.status === "fulfilled" && o.value === true);
    for (const o of outcomes) {
      if (o.status === "rejected") console.error("[league] record failed:", o.reason?.message || o.reason);
    }
    if (!recorded) {
      // Unlike the Open there is no Playtomic behind this form: an unrecorded signup is a
      // team nobody knows about. Say so, rather than thank them for a place they do not have.
      console.error("[league] signup NOT recorded anywhere", { level: r.level, email: r.email });
      return res.status(502).json({ error: "We could not save your signup just now. Please try again in a minute, or email portland@foundrypadel.com." });
    }
    return res.json({ ok: true, recorded, payUrl, priceTeam, partner: r.partner || null });
  });

  return router;
}
