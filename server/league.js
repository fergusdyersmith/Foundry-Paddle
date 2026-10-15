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
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { escapeSlack, normalizePhone, sanitize } from "./notify.js";
import { rateLimit, sheetCell } from "./abuse.js";
import { upsertProfile } from "./klaviyoProfile.js";

export const LEVELS = ["beginner", "intermediate", "advanced"];
/** Men's and women's, no mixed (Ryan, 14 Oct): the results decide the NPL pairings. */
export const GROUPS = ["mens", "womens"];
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
  league: z.enum(GROUPS),
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

/** The six weeks, Monday to Sunday. Mirrors LEAGUE_CALENDAR in fullsite/src/constants/league.ts. */
export const WEEKS = [
  { week: 1, from: "2026-11-02", to: "2026-11-08" }, { week: 2, from: "2026-11-09", to: "2026-11-15" },
  { week: 3, from: "2026-11-16", to: "2026-11-22" }, { week: 4, from: "2026-11-23", to: "2026-11-29" },
  { week: 5, from: "2026-11-30", to: "2026-12-06" }, { week: 6, from: "2026-12-07", to: "2026-12-13" },
];

// A set score: games to each side. A set is won at 6 with a two-game margin, or at 7
// (7-5 or a 7-6 tiebreak), which is as far as padel sets go; anything else is a typo.
const games = z.number().int().min(0).max(7);
export function validSet([a, b]) {
  const hi = Math.max(a, b), lo = Math.min(a, b);
  if (hi === 6) return lo <= 4;
  if (hi === 7) return lo === 5 || lo === 6;
  return false;
}

// One match, reported by either team: the week it belonged to, the two teams as the
// schedule names them, the three sets as "us" then "them", and who is reporting so Ryan
// can ask about a score that does not add up.
export const scoreSchema = z.object({
  week: z.number().int().min(1).max(WEEKS.length),
  // Who is reporting is known from the email once the roster exists; the name is only
  // needed where there is no roster to check against (no sheet configured).
  team: opt(z.string().trim().max(60)),
  opponent: z.string().trim().min(1).max(60),
  sets: z.array(z.tuple([games, games])).length(3),
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(255),
  notes: opt(z.string().trim().max(300)),
  website: z.string().max(0).optional(),
});

export function tally(sets) {
  let won = 0, lost = 0;
  for (const [a, b] of sets) { if (a > b) won += 1; else lost += 1; }
  return { won, lost };
}

export function buildScoreSlackText(r) {
  const { won, lost } = tally(r.sets);
  const line = r.sets.map(([a, b]) => `${a}-${b}`).join(", ");
  const bits = [
    `*League score, week ${r.week}*  ${escapeSlack(r.team)} ${won}-${lost} ${escapeSlack(r.opponent)}  (${line})`,
    `Reported by ${escapeSlack(r.name)}  ·  ${escapeSlack(r.email)}${r.ref ? `  ·  ref ${r.ref}` : ""}`,
  ];
  if (r.notes) bits.push(`_${escapeSlack(r.notes)}_`);
  if (r.status) bits.push(r.mailed === false ? `${escapeSlack(r.status)}, but their confirmation email did not go out: ask them.` : `Awaiting confirmation from ${escapeSlack(r.opponent)} (emailed).`);
  return bits.join("\n");
}

// ---- Who may report, and who confirms ----------------------------------------------
// A score counts once the OTHER team has confirmed it (or two days pass without a
// dispute, which Foundry applies by hand from the sheet). The reporter is identified by
// the email they signed up with, so nobody reports for a team they are not on, and the
// opposing team is picked from the roster so the confirmation goes to the right inboxes.
// The roster is the signups sheet, read through the same Apps Script (action "roster").
//
// Confirmation links carry a stateless HMAC token: the server keeps nothing, the sheet
// row's Ref column is the record, and the key is derived from the sheet secret so there
// is no second secret to keep in step.

const REF_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const REF_RE = /^[A-Z2-9]{8}$/;
export function newRef(bytes = randomBytes(8)) {
  let out = "";
  for (let i = 0; i < 8; i++) out += REF_ALPHABET[bytes[i] % 32];
  return out;
}

export function confirmToken(secret, ref, action) {
  const key = createHmac("sha256", String(secret || "")).update("league-confirm").digest();
  return createHmac("sha256", key).update(`${ref}:${action}`).digest("hex").slice(0, 32);
}

export function checkConfirmQuery(secret, q = {}) {
  const ref = String(q.ref || "").toUpperCase();
  const action = String(q.a || "");
  const t = String(q.t || "");
  if (!REF_RE.test(ref) || !["confirm", "dispute"].includes(action)) return null;
  const want = confirmToken(secret, ref, action);
  if (t.length !== want.length || !timingSafeEqual(Buffer.from(t), Buffer.from(want))) return null;
  return { ref, action };
}

const norm = (v) => String(v || "").trim().toLowerCase();
const firstName = (n) => String(n || "").trim().split(/\s+/)[0] || "";

/** How a team is shown and picked: its chosen name, else "Sam R. and Alex C.". */
export function teamDisplayName(t) {
  if (t.team) return t.team;
  const short = (n) => {
    const parts = String(n || "").trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return "";
    return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0]}.` : parts[0];
  };
  const a = short(t.p1), b = short(t.p2);
  return a && b ? `${a} and ${b}` : a || b || "";
}

/** The email to the opposing team: the score as reported, one tap to confirm, a link to dispute. */
export function buildConfirmMail(r, theirs, siteUrl, secret) {
  const { won, lost } = tally(r.sets);
  const line = r.sets.map(([a, b]) => `${a}-${b}`).join(", ");
  const link = (a) => `${siteUrl}/league/confirm?ref=${r.ref}&t=${confirmToken(secret, r.ref, a)}&a=${a}`;
  const names = [firstName(theirs.p1), firstName(theirs.p2)].filter(Boolean);
  return {
    to: [theirs.e1, theirs.e2].filter(Boolean),
    subject: `Confirm the score, week ${r.week}, ${r.team} v ${r.opponent}`,
    title: "CONFIRM THE SCORE",
    preview: `${r.team} reported ${won} sets to ${lost}. One tap to confirm.`,
    intro: [
      `Hi ${names.join(" and ") || r.opponent},`,
      `${r.name} of ${r.team} has sent in your week ${r.week} result. One tap to confirm it and it goes into the table.`,
    ],
    details: [["\u{1F3BE}", `${r.team} ${won}, ${r.opponent} ${lost}. Sets ${line}, games to ${r.team} first.`]],
    cta_text: "Confirm the score",
    cta_url: link("confirm"),
    cta_note: `Not right? [Say so here](${link("dispute")}) and Foundry will sort it out with both teams. If we hear nothing in two days the score stands.`,
  };
}

export function buildSlackText(r) {
  const who = [r.name, r.email, r.phone].filter(Boolean).map(escapeSlack).join("  ·  ");
  const partner = r.partner
    ? [r.partner, r.partnerEmail, r.partnerPhone].filter(Boolean).map(escapeSlack).join("  ·  ")
    : "needs a partner";
  const bits = [
    `*New league signup*  ${r.team ? `*${escapeSlack(r.team)}*  ` : ""}${who}`,
    `Partner: ${partner}`,
    `${r.league === "womens" ? "Women's" : "Men's"} league  ·  level: *${r.level}*${r.rating ? ` (rating ${escapeSlack(r.rating)})` : ""}${r.phone ? `  ·  ${r.smsConsent ? "texts OK" : "no texts"}` : ""}`,
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
 * @param {string|null} deps.mailUrl   Kumi's internal league-mail endpoint; null disables the confirmation email
 * @param {string|null} deps.mailSecret
 * @param {string}   deps.siteUrl      where the confirmation links point
 * @param {number}   deps.rosterTtlMs  how long the roster read from the sheet is reused
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
  mailUrl = process.env.LEAGUE_MAIL_URL || "https://padelmaps.org/api/internal/league-mail",
  mailSecret = process.env.LEAGUE_MAIL_SECRET || null,
  siteUrl = process.env.SITE_URL || "https://www.foundrypadel.com",
  rosterTtlMs: ROSTER_TTL_MS = 60 * 1000,
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
        [`${SEASON_KEY}_league`]: r.league,
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
  function appendSheetRow(r) {
    return postRow([
      stamp(), r.league === "womens" ? "Women's" : "Men's", r.team || "", r.name, r.email, r.phone || "", r.phone ? (r.smsConsent ? "yes" : "no") : "",
      r.partner || "", r.partnerEmail || "", r.partnerPhone || "", r.level, r.rating || "",
      r.availability || "", r.notes || "", "", "",
    ]);
  }

  // SCORE_HEADERS order in league-sheet.gs; the Scores tab.
  function appendScoreRow(r) {
    const { won, lost } = tally(r.sets);
    return postRow([
      stamp(), String(r.week), r.team, r.opponent, ...r.sets.map(([a, b]) => `${a}-${b}`),
      String(won), String(lost), r.name, r.email, r.notes || "", r.status || "", r.ref || "",
    ], "score");
  }

  async function postRow(cells, action) {
    if (!sheetUrl) return false;
    await sheetAction(action, { row: cells.map(sheetCell) });
    return true;
  }

  // One call to the Apps Script, retried through its cold starts. Returns its JSON
  // answer; throws when it never answered ok.
  async function sheetAction(action, body) {
    let lastError = null;
    for (let attempt = 1; attempt <= SHEET_ATTEMPTS; attempt++) {
      try {
        const res = await fetchImpl(sheetUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ secret: sheetSecret || "", ...(action ? { action } : {}), ...body }),
        });
        if (!res.ok) throw new Error(`sheet ${res.status}`);
        const json = await res.json().catch(() => ({}));
        if (json.ok === false) throw new Error(`sheet ${json.error || "refused"}`);
        return json;
      } catch (e) {
        lastError = e;
        if (attempt < SHEET_ATTEMPTS) await sleep(SHEET_RETRY_MS * attempt);
      }
    }
    throw lastError;
  }

  // The roster: every signed-up team with its two emails, from the signups sheet.
  // Cached briefly so a burst of score reports is not a burst of Apps Script calls.
  // null when there is no sheet, which means there is nothing to check against.
  let rosterCache = { at: 0, teams: null };
  async function fetchRoster() {
    if (!sheetUrl) return null;
    if (rosterCache.teams && now().getTime() - rosterCache.at < ROSTER_TTL_MS) return rosterCache.teams;
    const json = await sheetAction("roster", {});
    const teams = (json.teams || [])
      .map((t) => ({
        league: norm(t.league).startsWith("women") ? "womens" : "mens",
        team: String(t.team || "").trim(), p1: String(t.p1 || "").trim(), e1: norm(t.e1), p2: String(t.p2 || "").trim(), e2: norm(t.e2),
      }))
      .filter((t) => t.p1)
      .map((t) => ({ ...t, name: teamDisplayName(t) }));
    rosterCache = { at: now().getTime(), teams };
    return teams;
  }

  async function sendConfirmMail(r, theirs) {
    if (!mailUrl || !mailSecret) return false;
    const mail = buildConfirmMail(r, theirs, siteUrl, sheetSecret);
    if (!mail.to.length) return false;
    const res = await fetchImpl(mailUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-League-Secret": mailSecret },
      body: JSON.stringify(mail),
    });
    if (!res.ok) throw new Error(`league-mail ${res.status}`);
    return true;
  }

  const dateShort = () => new Intl.DateTimeFormat("en-US", { timeZone: "America/Los_Angeles", month: "numeric", day: "numeric" }).format(now());

  // What the page needs before anyone fills the form in: whether signups are open and
  // whether there is somewhere to pay yet.
  router.get("/api/league/status", (req, res) => {
    const closed = todayInClub(now()) >= closes;
    res.json({ closed, closes, priceTeam, payable: Boolean(payUrl) });
  });

  router.post("/api/league/register", async (req, res) => {
    const parsed = signupSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "The league, your name, an email and the level you want to play are needed." });
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

  // A match result from either team. Nothing to pay and nothing to hold: the record is
  // the point, so like the signup it refuses rather than thank someone for a lost score.
  const scoreLimit = rateLimit({ name: "league-score", max: 10, windowMs: 10 * 60 * 1000 });
  router.post("/api/league/score", async (req, res) => {
    const parsed = scoreSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "The week, both teams, three set scores, your name and an email are needed." });
    }
    if (!parsed.data.sets.every(validSet)) {
      return res.status(400).json({ error: "A set ends 6-0 to 6-4, 7-5 or 7-6. Check the scores." });
    }
    if (scoreLimit(req, res)) return;

    // With a roster, the reporter must be on a team (by the email they signed up with)
    // and the opponent must be a team in the same league; the names come from the
    // roster, not the form. Without one there is nothing to check, so the typed names
    // are taken as they are.
    let roster = null;
    if (sheetUrl) {
      try {
        roster = await fetchRoster();
      } catch (e) {
        console.error("[league] roster unavailable:", e?.message || e);
        return res.status(502).json({ error: "We could not check the team list just now. Please try again in a minute." });
      }
    }
    let team = sanitize(parsed.data.team || "", 60);
    let opponent = sanitize(parsed.data.opponent, 60);
    let theirs = null;
    if (roster) {
      const email = norm(parsed.data.email);
      const mine = roster.find((t) => t.e1 === email || t.e2 === email);
      if (!mine) {
        return res.status(403).json({ error: "That email is not on a league team. Use the email you signed up with, or email portland@foundrypadel.com." });
      }
      team = mine.name;
      theirs = roster.find((t) => t !== mine && t.league === mine.league && norm(t.name) === norm(opponent)) || null;
      if (!theirs) return res.status(400).json({ error: "Pick the other team from the list." });
      opponent = theirs.name;
    } else if (!team) {
      return res.status(400).json({ error: "Your team name is needed." });
    }
    const r = {
      ...parsed.data,
      team,
      opponent,
      name: sanitize(parsed.data.name, 80),
      notes: sanitize(parsed.data.notes || "", 300),
      ref: theirs ? newRef() : "",
      status: theirs ? `awaiting ${theirs.name}` : "",
      mailed: null,
    };
    // The email to the other team goes first, so the Slack line can say whether it went.
    if (theirs) {
      try {
        r.mailed = await sendConfirmMail(r, theirs);
      } catch (e) {
        console.error("[league] confirmation email failed:", e?.message || e);
        r.mailed = false;
      }
    }
    const outcomes = await Promise.allSettled([postSlack(buildScoreSlackText(r)), appendScoreRow(r)]);
    const recorded = outcomes.some((o) => o.status === "fulfilled" && o.value === true);
    for (const o of outcomes) {
      if (o.status === "rejected") console.error("[league] score record failed:", o.reason?.message || o.reason);
    }
    if (!recorded) {
      console.error("[league] score NOT recorded anywhere", { week: r.week, team: r.team });
      return res.status(502).json({ error: "We could not save the score just now. Please try again in a minute, or email it to portland@foundrypadel.com." });
    }
    return res.json({ ok: true, ...tally(r.sets), team, opponent, ref: r.ref || null, confirmBy: theirs ? theirs.name : null, mailed: r.mailed });
  });

  // The teams, for the score form's picker. Names only, never emails.
  router.get("/api/league/teams", async (req, res) => {
    try {
      const teams = (await fetchRoster()) || [];
      res.set("Cache-Control", "public, max-age=60");
      res.json({ teams: teams.map((t) => ({ league: t.league, name: t.name })) });
    } catch (e) {
      console.error("[league] teams unavailable:", e?.message || e);
      res.json({ teams: [] });
    }
  });

  // The other team's confirm-or-dispute link. GET shows the score the link is about;
  // POST records the answer in the Scores tab (the Checked column) and tells Slack.
  // The token in the link is the proof, so these sit outside Turnstile.
  const confirmLimit = rateLimit({ name: "league-confirm", max: 20, windowMs: 10 * 60 * 1000 });
  router.get("/api/league/confirm", async (req, res) => {
    if (!sheetUrl) return res.status(503).json({ error: "Confirmation is not set up." });
    const ok = checkConfirmQuery(sheetSecret, req.query);
    if (!ok) return res.status(403).json({ error: "That link is not valid. Use the one from the email." });
    try {
      const json = await sheetAction("score-get", { ref: ok.ref });
      if (!json.row) return res.status(404).json({ error: "We could not find that score. It may have been removed." });
      return res.json({ ok: true, action: ok.action, row: json.row });
    } catch (e) {
      console.error("[league] score-get failed:", e?.message || e);
      return res.status(502).json({ error: "We could not read the score just now. Please try again in a minute." });
    }
  });
  router.post("/api/league/confirm", async (req, res) => {
    if (!sheetUrl) return res.status(503).json({ error: "Confirmation is not set up." });
    if (confirmLimit(req, res)) return;
    const ok = checkConfirmQuery(sheetSecret, req.body || {});
    if (!ok) return res.status(403).json({ error: "That link is not valid. Use the one from the email." });
    const status = ok.action === "confirm" ? `confirmed ${dateShort()}` : `DISPUTED ${dateShort()}`;
    let json;
    try {
      json = await sheetAction("score-confirm", { ref: ok.ref, status });
    } catch (e) {
      console.error("[league] score-confirm failed:", e?.message || e);
      return res.status(502).json({ error: "We could not save that just now. Please try again in a minute." });
    }
    if (!json.row) return res.status(404).json({ error: "We could not find that score. It may have been removed." });
    if (!json.already) {
      const row = json.row;
      const head = ok.action === "confirm" ? "*League score confirmed*" : "*League score DISPUTED*";
      postSlack(`${head}  week ${escapeSlack(row.week)}  ${escapeSlack(row.team)} ${escapeSlack(row.won)}-${escapeSlack(row.lost)} ${escapeSlack(row.opponent)}  (${escapeSlack(row.sets)})  ·  ref ${ok.ref}${ok.action === "dispute" ? "\nAsk both teams and fix the row." : ""}`)
        .catch((e) => console.error("[league] confirm slack failed:", e?.message || e));
    }
    return res.json({ ok: true, action: ok.action, row: json.row, already: Boolean(json.already) });
  });

  return router;
}
