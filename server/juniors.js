// The junior clinic's "tell me the next dates" list.
//
// /juniors shows one date at a time, so a parent who cannot make it had nowhere to go but
// the phone. This takes their name, email, an optional mobile and the age groups they have,
// and records it the way the December open's registration does (see server/open.js):
//   1. A Slack post to the club channel: the list the club actually reads.
//   2. A Klaviyo profile tagged juniors_dates_list, subscribed to the email list, so the
//      next dates can go to a segment rather than be typed out one parent at a time.
// Either record is enough. If neither takes, the page says so rather than thank a parent
// for a signup nobody has.
import express from "express";
import { z } from "zod";
import { escapeSlack, normalizePhone, sanitize } from "./notify.js";

/** The page's two sessions, in JUNIOR_SESSION_TIMES order. */
export const AGE_GROUPS = ["10-13", "14+"];

/** Days open for signups, YYYY-MM-DD -> the label people see. Mirrors the first entries
 *  of JUNIOR_DAYS in fullsite/src/constants/juniorClinic.ts (the page shows DAYS_SHOWN of
 *  them); add a day in both places when the club opens it. */
export const JUNIOR_SIGNUP_DAYS = {
  "2026-10-09": "Friday, October 9",
};

const E164 = /^\+[1-9]\d{6,14}$/;

export const signupSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  // The 10DLC checkbox. Only means anything with a phone number beside it.
  smsConsent: z.boolean().optional(),
  ages: z.array(z.enum(AGE_GROUPS)).min(1).max(AGE_GROUPS.length),
  notes: z.string().trim().max(300).optional().or(z.literal("")),
  // Honeypot: hidden from people, filled by bots.
  website: z.string().max(0).optional(),
});

/**
 * A clinic signup: one parent, one or more children, one day. Since 2 October the clinic
 * is free (a sponsor covers 100 places), so the website is the signup, not Playtomic.
 * `day` is a YYYY-MM-DD from JUNIOR_DAYS; `session` is the age group, which is also
 * the session time.
 */
export const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  smsConsent: z.boolean().optional(),
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  children: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(80),
        age: z.number().int().min(5).max(18),
        session: z.enum(AGE_GROUPS),
      }),
    )
    .min(1)
    .max(6),
  notes: z.string().trim().max(300).optional().or(z.literal("")),
  website: z.string().max(0).optional(),
});

export function buildRegistrationSlackText(r, dayLabel) {
  const who = [r.name, r.email, r.phone].filter(Boolean).map(escapeSlack).join("  ·  ");
  const kids = r.children.map((c) => `${escapeSlack(c.name)} (${c.age}, ${c.session === "10-13" ? "9 AM" : "10:30 AM"})`).join(", ");
  const bits = [`*Junior clinic signup*  ${dayLabel}`, who, `Kids: ${kids}`];
  if (r.phone) bits.push(r.smsConsent ? "Texts OK" : "No texts");
  if (r.notes) bits.push(`_${escapeSlack(r.notes)}_`);
  return bits.join("\n");
}

export function buildSlackText(s) {
  const bits = [
    `*Junior clinic: tell me the next dates*  ${escapeSlack(s.name)}`,
    `Ages: ${s.ages.join(", ")}`,
    `${escapeSlack(s.email)}${s.phone ? `  ·  ${escapeSlack(s.phone)} (${s.smsConsent ? "texts OK" : "no texts"})` : ""}`,
  ];
  if (s.notes) bits.push(`_${escapeSlack(s.notes)}_`);
  return bits.join("\n");
}

/**
 * @param {object} deps
 * @param {Function} deps.klaviyo      (method, path, body) => {status, json}; null disables
 * @param {string}   deps.listId       Klaviyo list to subscribe to
 * @param {string}   deps.slackToken   bot token; null disables Slack
 * @param {string}   deps.channel
 * @param {Function} deps.fetchImpl
 * @param {Function} deps.now
 */
export function createJuniorsRouter({
  klaviyo = null,
  listId = process.env.KLAVIYO_INTEREST_LIST_ID,
  slackToken = process.env.SLACK_BOT_TOKEN,
  channel = process.env.JUNIORS_SLACK_CHANNEL || "#club-ops",
  // The signups sheet shared with Monica: an Apps Script web app, see juniors-sheet.gs.
  sheetUrl = process.env.JUNIORS_SHEET_WEBHOOK || null,
  sheetSecret = process.env.JUNIORS_SHEET_SECRET || null,
  // Which days take signups, YYYY-MM-DD -> label shown to people. The page sends the
  // date; the server refuses one it does not know so a stale tab cannot book a day
  // the club has not opened.
  days = JUNIOR_SIGNUP_DAYS,
  fetchImpl = (...args) => fetch(...args),
  now = () => new Date(),
} = {}) {
  const router = express.Router();

  const stamp = () =>
    new Intl.DateTimeFormat("en-US", { timeZone: "America/Los_Angeles", dateStyle: "short", timeStyle: "short" }).format(now());

  // One row per child, in the sheet's column order (HEADERS in juniors-sheet.gs).
  async function appendSheetRows(r, dayLabel) {
    if (!sheetUrl) return false;
    for (const c of r.children) {
      const res = await fetchImpl(sheetUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          secret: sheetSecret || "",
          row: [
            stamp(), r.name, r.email, r.phone || "", r.phone ? (r.smsConsent ? "yes" : "no") : "",
            c.name, String(c.age), dayLabel, c.session === "10-13" ? "9 to 10:30 AM (ages 10 to 13)" : "10:30 AM to noon (ages 14 and up)",
            r.notes || "", "",
          ],
        }),
      });
      if (!res.ok) throw new Error(`sheet ${res.status}`);
      const json = await res.json().catch(() => ({}));
      if (json.ok === false) throw new Error(`sheet ${json.error || "refused"}`);
    }
    return true;
  }

  async function recordRegistrationKlaviyo(r, phone, dayLabel) {
    if (!klaviyo) return false;
    const properties = {
      juniors_registered: true,
      juniors_registered_day: r.day,
      juniors_registered_day_label: dayLabel,
      juniors_children: r.children.map((c) => `${c.name} (${c.age})`),
      juniors_age_groups: [...new Set(r.children.map((c) => c.session))],
      juniors_registered_at: now().toISOString(),
    };
    if (phone && r.smsConsent) properties.sms_consent = true;
    const attrs = { email: r.email, properties: { ...properties, signup_source: "juniors" }, first_name: r.name.split(" ")[0] };
    if (phone) attrs.phone_number = phone;
    const create = await klaviyo("POST", "/profiles", { data: { type: "profile", attributes: attrs } });
    if (create.status === 409) {
      const id = create.json?.errors?.[0]?.meta?.duplicate_profile_id;
      if (id) await klaviyo("PATCH", `/profiles/${id}`, { data: { type: "profile", id, attributes: { properties } } });
    } else if (create.status !== 201) {
      throw new Error(`klaviyo profile ${create.status}`);
    }
    return true;
  }

  router.post("/api/juniors/register", async (req, res) => {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Please check the form: your name, an email, the day and each child's name and age are needed." });
    }
    const r = {
      ...parsed.data,
      name: sanitize(parsed.data.name, 80),
      phone: sanitize(parsed.data.phone || "", 30),
      notes: sanitize(parsed.data.notes || "", 300),
      children: parsed.data.children.map((c) => ({ ...c, name: sanitize(c.name, 80) })),
    };
    const dayLabel = days[r.day];
    if (!dayLabel) {
      return res.status(400).json({ error: "That day is not open for signups yet. Pick one of the dates on the page." });
    }
    const phone = r.phone ? normalizePhone(r.phone) : null;
    if (r.phone && !E164.test(phone || "")) {
      return res.status(400).json({ error: "That phone number does not look right. Include the area code, or leave it blank." });
    }

    const outcomes = await Promise.allSettled([
      postSlack(buildRegistrationSlackText(r, dayLabel)),
      recordRegistrationKlaviyo(r, phone, dayLabel),
      appendSheetRows(r, dayLabel),
    ]);
    const recorded = outcomes.some((o) => o.status === "fulfilled" && o.value === true);
    for (const o of outcomes) {
      if (o.status === "rejected") console.error("[juniors] register record failed:", o.reason?.message || o.reason);
    }
    if (!recorded) {
      // Unlike the open, there is no Playtomic booking behind this to fall back on: the
      // form IS the signup. A place nobody has written down is not a place.
      return res.status(502).json({ error: "We could not save the signup. Please try again in a minute or call the club." });
    }
    return res.json({ ok: true, day: r.day, dayLabel, children: r.children.length });
  });

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

  async function recordKlaviyo(s, phone) {
    if (!klaviyo) return false;
    const properties = {
      juniors_dates_list: true,
      juniors_age_groups: s.ages,
      juniors_notes: s.notes || null,
      juniors_signed_up_at: now().toISOString(),
    };
    // Written only when given: an unticked box here must not undo consent given elsewhere.
    if (phone && s.smsConsent) properties.sms_consent = true;
    const attrs = { email: s.email, properties: { ...properties, signup_source: "juniors" }, first_name: s.name.split(" ")[0] };
    if (phone) attrs.phone_number = phone;
    const create = await klaviyo("POST", "/profiles", { data: { type: "profile", attributes: attrs } });
    if (create.status === 409) {
      // An existing profile keeps the signup_source it came in with.
      const id = create.json?.errors?.[0]?.meta?.duplicate_profile_id;
      if (id) await klaviyo("PATCH", `/profiles/${id}`, { data: { type: "profile", id, attributes: { properties } } });
    } else if (create.status !== 201) {
      throw new Error(`klaviyo profile ${create.status}`);
    }
    if (listId) {
      await klaviyo("POST", "/profile-subscription-bulk-create-jobs", {
        data: {
          type: "profile-subscription-bulk-create-job",
          attributes: {
            custom_source: "Junior clinic dates list",
            profiles: { data: [{ type: "profile", attributes: { email: s.email, subscriptions: { email: { marketing: { consent: "SUBSCRIBED" } } } } }] },
          },
          relationships: { list: { data: { type: "list", id: listId } } },
        },
      });
    }
    return true;
  }

  router.post("/api/juniors/notify", async (req, res) => {
    const parsed = signupSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Please check the form: a name, an email and at least one age group are needed." });
    }
    const s = {
      ...parsed.data,
      ages: [...new Set(parsed.data.ages)],
      name: sanitize(parsed.data.name, 80),
      phone: sanitize(parsed.data.phone || "", 30),
      notes: sanitize(parsed.data.notes || "", 300),
    };
    const phone = s.phone ? normalizePhone(s.phone) : null;
    if (s.phone && !E164.test(phone || "")) {
      return res.status(400).json({ error: "That phone number does not look right. Include the area code, or leave it blank." });
    }

    const outcomes = await Promise.allSettled([postSlack(buildSlackText(s)), recordKlaviyo(s, phone)]);
    const recorded = outcomes.some((o) => o.status === "fulfilled" && o.value === true);
    for (const o of outcomes) {
      if (o.status === "rejected") console.error("[juniors] record failed:", o.reason?.message || o.reason);
    }
    if (!recorded) {
      return res.status(502).json({ error: "We could not save your details. Please try again in a minute or call the club." });
    }
    return res.json({ ok: true });
  });

  return router;
}
