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
import {
  ageOn, buildWaiverHtml, buildWaiverSlackText, cleanWaiver, waiverFilename, waiverSchema,
} from "./juniors-waiver.js";

/** The page's two sessions, in JUNIOR_SESSION_TIMES order. */
export const AGE_GROUPS = ["10-13", "14+"];

/** Days open for signups, YYYY-MM-DD -> the label people see. Mirrors the first entries
 *  of JUNIOR_DAYS in fullsite/src/constants/juniorClinic.ts (the page shows DAYS_SHOWN of
 *  them); add a day in both places when the club opens it. */
export const JUNIOR_SIGNUP_DAYS = {
  // "2026-10-09": "Friday, October 9", closed by Monica on 8 Oct, the evening before.
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
  // Where the confirmation email is sent from. Unset = no confirmations, and the signup
  // still works: this is the one record a parent sees, not one the club depends on.
  confirmUrl = process.env.JUNIORS_CONFIRM_URL
    || "https://padelmaps.org/api/internal/juniors-confirmation",
  confirmSecret = process.env.JUNIORS_CONFIRM_SECRET || null,
  // Retries for one sheet row. Three attempts over ~0.9s: enough for an Apps Script cold
  // start, short enough that a parent is not left watching a spinner.
  sheetAttempts: SHEET_ATTEMPTS = 3,
  sheetRetryMs: SHEET_RETRY_MS = 300,
  sleep = (ms) => new Promise((res) => setTimeout(res, ms)),
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
  //
  // EVERY CHILD IS ATTEMPTED, and that is the whole point of the shape here. This used to
  // `throw` on the first bad response, inside the loop, which abandoned every child after
  // it. On 6 October Jessica Tatum signed up two children; Samuel's row landed, something
  // failed on Avangelina's, and the loop gave up. Klaviyo had both (it writes the array in
  // one call), the Sheet had one, the parent was told she was signed up, and nobody found
  // out for three days.
  //
  // Each row is retried, because the failures this sees are transient: Apps Script cold
  // starts and momentary contention, which succeed on a second go.
  //
  // Returns a result rather than true/false. A partial write is neither success nor
  // failure and the caller has to be able to tell: it holds some of the places, so the
  // signup stands, but the confirmation email must not promise a child who is not on the
  // list.
  async function appendSheetRows(r, dayLabel) {
    if (!sheetUrl) return { configured: false, written: 0, failed: [] };
    const failed = [];
    let written = 0;
    for (const c of r.children) {
      let lastError = null;
      for (let attempt = 1; attempt <= SHEET_ATTEMPTS; attempt++) {
        try {
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
          lastError = null;
          break;
        } catch (e) {
          lastError = e?.message || String(e);
          if (attempt < SHEET_ATTEMPTS) await sleep(SHEET_RETRY_MS * attempt);
        }
      }
      if (lastError) failed.push({ child: c.name, error: lastError });
      else written += 1;
    }
    return { configured: true, written, failed };
  }

  // The confirmation email, sent through padelmaps.org because this server has no email
  // transport of its own and should not grow one: a second sender here means a second key,
  // a second template and a second place for a bounce to hide. The API end uses Resend
  // (one address per request, one message id) rather than a Klaviyo campaign, which
  // resolves its audience asynchronously and once put sixteen guest-pass codes in the
  // wrong inboxes.
  async function sendConfirmation(r, dayLabel) {
    if (!confirmUrl || !confirmSecret) return false;
    const res = await fetchImpl(confirmUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Juniors-Secret": confirmSecret },
      body: JSON.stringify({
        parent_name: r.name,
        email: r.email,
        day_label: dayLabel,
        children: r.children.map((c) => ({ name: c.name, age: c.age, session: c.session })),
      }),
    });
    if (!res.ok) throw new Error(`confirmation ${res.status}`);
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
    const sheet = outcomes[2].status === "fulfilled"
      ? outcomes[2].value
      : { configured: true, written: 0, failed: r.children.map((c) => ({ child: c.name, error: String(outcomes[2].reason?.message || outcomes[2].reason) })) };
    const recorded =
      outcomes.slice(0, 2).some((o) => o.status === "fulfilled" && o.value === true) ||
      sheet.written > 0;
    for (const o of outcomes) {
      if (o.status === "rejected") console.error("[juniors] register record failed:", o.reason?.message || o.reason);
    }

    // A ROW THAT WOULD NOT LAND MUST BE SHOUTED ABOUT, not swallowed. The desk works from
    // the Sheet, so a child missing from it is a child nobody is expecting, and the old
    // code logged that to a console nobody reads. Slack is where the club actually looks.
    if (sheet.configured && sheet.failed.length) {
      const who = sheet.failed.map((f) => `${f.child} (${f.error})`).join(", ");
      console.error("[juniors] sheet rows FAILED:", who);
      postSlack(
        `:rotating_light: *Junior clinic: a signup did not reach the sheet*\n` +
        `${escapeSlack(r.name)} <${escapeSlack(r.email)}>, ${escapeSlack(dayLabel)}\n` +
        `Missing: ${escapeSlack(who)}\n` +
        `${sheet.written} of ${r.children.length} row(s) written. Add the missing ` +
        `child by hand — they are signed up and are NOT on the list.`,
      ).catch((e) => console.error("[juniors] could not report the sheet failure:", e?.message || e));
    }

    // CONFIRM THE SHEET, NOTHING ELSE, AND ONLY IN FULL. The Sheet row is the list the
    // desk works from on the day; Slack is a notification and Klaviyo is a marketing
    // record. A parent told "you're in" because a Slack post went through could arrive to
    // find nobody expecting them.
    //
    // "In full" because of Jessica Tatum on 6 October: a confirmation naming two children
    // when only one reached the list is worse than no confirmation, since it is the thing
    // that stops anyone asking. A partial write alerts instead, and the email can be sent
    // with `force` once a human has fixed the row.
    const sheetOk = sheet.configured && sheet.failed.length === 0 && sheet.written > 0;
    if (sheetOk) {
      // Never fails the signup. The place is already held by the time this runs, so a
      // sender outage is a missing email and a logged error, not an error shown to a
      // parent who IS signed up.
      try {
        await sendConfirmation(r, dayLabel);
      } catch (e) {
        console.error("[juniors] confirmation email failed:", e?.message || e);
      }
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

  // The waiver. One Apps Script call does everything that counts (PDFs, Drive, the email,
  // the Waivers tab, the Status column), so unlike a signup it either lands whole or not at
  // all. No retry: a call that timed out AFTER the script filed everything would file it
  // twice and email the desk twice, and the script is well inside its own limits.
  router.post("/api/juniors/waiver", async (req, res) => {
    const parsed = waiverSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Please check the form: every required field, each child's name and date of birth, and both boxes above the signature are needed." });
    }
    const w = cleanWaiver(parsed.data);
    const signedAt = now();
    const ages = [];
    for (const c of w.children) {
      const age = ageOn(c.dob, signedAt);
      if (age == null || age < 3) {
        return res.status(400).json({ error: `${c.name}'s date of birth does not look right.` });
      }
      if (age >= 18) {
        return res.status(400).json({ error: `${c.name} is 18 or over, so this form does not apply: they sign the adult waiver at the club.` });
      }
      ages.push(age);
    }
    if (!sheetUrl) {
      console.error("[juniors] waiver: JUNIORS_SHEET_WEBHOOK is not set");
      return res.status(502).json({ error: "We could not file the waiver. Please try again later, or fill in the paper copy when you arrive." });
    }

    const stamp_ = stamp();
    const ip = String(req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "").split(",")[0].trim();
    const userAgent = sanitize(String(req.headers["user-agent"] || ""), 200);
    const body = {
      secret: sheetSecret || "",
      action: "waiver",
      signedAt: signedAt.toISOString(),
      stamp: stamp_,
      parent: w.parent,
      emergency: w.emergency,
      pickup: w.pickup,
      children: w.children.map((c, i) => ({
        name: c.name, dob: c.dob, age: ages[i], sessionDates: c.sessionDates, media: c.media,
        leaveAlone: c.leaveAlone, allergies: c.allergies, conditions: c.conditions, medications: c.medications,
        filename: waiverFilename(c, signedAt),
        html: buildWaiverHtml(w, c, { age: ages[i], signedAt, stamp: stamp_, ip, userAgent }),
      })),
    };

    let filed;
    try {
      const r = await fetchImpl(sheetUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        // Three PDFs and two emails take the script a few seconds; this is well past that.
        // (Guarded: the test runner's DOM shim has no AbortSignal.timeout.)
        signal: typeof AbortSignal.timeout === "function" ? AbortSignal.timeout(50_000) : undefined,
      });
      if (!r.ok) throw new Error(`sheet ${r.status}`);
      filed = await r.json().catch(() => ({}));
      if (filed.ok !== true) throw new Error(`sheet ${filed.error || "refused"}`);
    } catch (e) {
      console.error("[juniors] waiver not filed:", e?.message || e);
      postSlack(
        `:rotating_light: *Junior waiver did NOT file*  ${escapeSlack(w.parent.name)} <${escapeSlack(w.parent.email)}> ` +
        `for ${w.children.map((c) => escapeSlack(c.name)).join(", ")}: ${escapeSlack(e?.message || String(e))}. ` +
        `They were told to try again or bring the paper copy.`,
      ).catch((err) => console.error("[juniors] could not report the waiver failure:", err?.message || err));
      return res.status(502).json({ error: "We could not file the waiver just now. Please try again in a minute, or fill in the paper copy when you arrive." });
    }

    postSlack(buildWaiverSlackText(w, ages, filed)).catch((e) => console.error("[juniors] waiver slack failed:", e?.message || e));
    return res.json({ ok: true, children: w.children.map((c) => c.name), unmatched: filed.unmatched || [] });
  });

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
