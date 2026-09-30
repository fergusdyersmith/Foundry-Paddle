// Registration for the December open (the two-day, all-levels tournament).
//
// The club wants a name, phone, email, shirt size and the level someone wants to play
// BEFORE they see the Playtomic link that takes the money. Playtomic holds none of that
// (it knows a player's rating, not their shirt size or that a 3.0 wants to play up), so
// the page collects it here, and only a recorded registration is handed the link.
//
// Two records, in this order, and the link is only released if at least one of them
// took:
//   1. A Slack post to the club channel: the roster the organisers actually read, and
//      the audit trail if anything else is down.
//   2. A Klaviyo profile with the answers as properties, subscribed to the interest
//      list: the mailing list for the event, and a roster that can be exported.
// Nothing here charges anyone. The worst a crafted request can do is post a bogus line
// to Slack, which the escaping below keeps to text.
import express from "express";
import { z } from "zod";
import { escapeSlack, normalizePhone, sanitize } from "./notify.js";

export const LEVELS = ["beginner", "intermediate", "advanced"];
export const SHIRT_SIZES = ["XS", "S", "M", "L", "XL", "XXL"];

/** Price tiers by date, club local time. `from` is inclusive; the first tier whose
 *  `from` is on or before today wins, so keep them in ascending date order.
 *
 *  Two tiers and a hard close, not three (Jack, 27 Sep): a "late" price teaches people
 *  that registering late is normal. No member discount either: a tournament is a
 *  separate thing from a membership. */
export const DEFAULT_TIERS = [
  { key: "early", label: "Early bird", price: 75, from: "2026-09-27" },
  { key: "regular", label: "Regular", price: 100, from: "2026-11-01" },
];
/** First day registration is closed. */
export const DEFAULT_CLOSES = "2026-11-28";

export function todayInClub(now = new Date(), timeZone = "America/Los_Angeles") {
  return new Intl.DateTimeFormat("en-CA", { timeZone }).format(now);
}

/** Which tier applies today, or closed:true once registration has shut. */
export function currentTier(tiers = DEFAULT_TIERS, today = todayInClub(), closes = DEFAULT_CLOSES) {
  let tier = tiers[0];
  for (const t of tiers) if (t.from <= today) tier = t;
  return { ...tier, closed: today >= closes };
}

const E164 = /^\+[1-9]\d{6,14}$/;

// Only the level is required (30 Sep): Playtomic collects name, phone and email at
// payment, so asking again here was friction for nothing. The rest is welcome, and the
// club chases a missing shirt size after the booking.
const opt = (schema) => schema.optional().or(z.literal(""));
export const registrationSchema = z.object({
  level: z.enum(LEVELS),
  shirt: z.enum(SHIRT_SIZES).optional().or(z.literal("")),
  name: opt(z.string().trim().max(80)),
  email: opt(z.string().trim().email().max(255)),
  phone: opt(z.string().trim().max(30)),
  // Their own Playtomic rating, if they know it. Free text so "about 2.5" is fine.
  rating: opt(z.string().trim().max(20)),
  // The email on their Playtomic account: how this form's answers get matched to the
  // booking Playtomic takes.
  playtomicEmail: opt(z.string().trim().email().max(255)),
  // Their partner, if they are entering as a pair. Free text; the club pairs the rest.
  partner: opt(z.string().trim().max(80)),
  notes: opt(z.string().trim().max(500)),
  // Anti-spam: the honeypot must be empty and the arithmetic must be right, exactly as
  // the interest form does it.
  website: z.string().max(0).optional(),
});

export function buildSlackText(r, tier) {
  const who = [r.name, r.playtomicEmail || r.email, r.phone].filter(Boolean).map(escapeSlack).join("  ·  ");
  const bits = [
    `*New open registration*  ${who || "(no name given; match by the Playtomic booking)"}`,
    `Level: *${r.level}*${r.rating ? ` (rating ${escapeSlack(r.rating)})` : ""}`,
    `Shirt: ${r.shirt || "not given"}  ·  tier: ${tier.label} $${tier.price}  ·  partner: ${r.partner ? escapeSlack(r.partner) : "needs one"}`,
  ];
  if (r.notes) bits.push(`_${escapeSlack(r.notes)}_`);
  return bits.join("\n");
}

/**
 * @param {object} deps
 * @param {Function} deps.klaviyo      (method, path, body) => {status, json}; null disables
 * @param {string}   deps.listId       Klaviyo list to subscribe to
 * @param {string}   deps.slackToken   bot token; null disables Slack
 * @param {string}   deps.channel
 * @param {string|null} deps.bookUrl   the Playtomic tournament link, null until it exists
 * @param {Array}    deps.tiers
 * @param {Function} deps.fetchImpl
 * @param {Function} deps.now
 */
export function createOpenRouter({
  klaviyo = null,
  listId = process.env.KLAVIYO_INTEREST_LIST_ID,
  slackToken = process.env.SLACK_BOT_TOKEN,
  channel = process.env.OPEN_SLACK_CHANNEL || "#club-ops",
  bookUrl = process.env.OPEN_PLAYTOMIC_URL || null,
  tiers = DEFAULT_TIERS,
  closes = DEFAULT_CLOSES,
  fetchImpl = (...args) => fetch(...args),
  now = () => new Date(),
} = {}) {
  const router = express.Router();

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

  async function recordKlaviyo(r, tier) {
    // Klaviyo keys on an email; with none given, Slack is the record.
    const email = r.playtomicEmail || r.email;
    if (!klaviyo || !email) return false;
    const properties = {
      open_dec_2026_level: r.level,
      open_dec_2026_shirt: r.shirt || null,
      open_dec_2026_playtomic_email: r.playtomicEmail || null,
      open_dec_2026_tier: tier.key,
      open_dec_2026_rating: r.rating || null,
      open_dec_2026_partner: r.partner || null,
      open_dec_2026_notes: r.notes || null,
      open_dec_2026_registered_at: now().toISOString(),
      signup_source: "open-dec-2026",
    };
    const attrs = { email, properties };
    if (r.name) attrs.first_name = r.name.split(" ")[0];
    const phone = r.phone ? normalizePhone(r.phone) : null;
    if (phone) attrs.phone_number = phone;
    const create = await klaviyo("POST", "/profiles", { data: { type: "profile", attributes: attrs } });
    if (create.status === 409) {
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
            custom_source: "December open registration",
            profiles: { data: [{ type: "profile", attributes: { email, subscriptions: { email: { marketing: { consent: "SUBSCRIBED" } } } } }] },
          },
          relationships: { list: { data: { type: "list", id: listId } } },
        },
      });
    }
    return true;
  }

  // What the page needs before anyone fills the form in: the tier and whether booking
  // exists yet. Prices are also in the page's constants for the prerender; this is the
  // live answer.
  router.get("/api/open/status", (req, res) => {
    const tier = currentTier(tiers, todayInClub(now()), closes);
    res.json({ tier: tier.key, label: tier.label, price: tier.price, closed: tier.closed, closes, bookable: Boolean(bookUrl) });
  });

  router.post("/api/open/register", async (req, res) => {
    const parsed = registrationSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Please pick the level you want to play." });
    }
    const r = {
      ...parsed.data,
      name: sanitize(parsed.data.name || "", 80),
      phone: sanitize(parsed.data.phone || "", 30),
      rating: sanitize(parsed.data.rating || "", 20),
      playtomicEmail: sanitize(parsed.data.playtomicEmail || "", 255),
      partner: sanitize(parsed.data.partner || "", 80),
      notes: sanitize(parsed.data.notes || "", 500),
    };
    if (r.phone && !E164.test(normalizePhone(r.phone) || "")) {
      return res.status(400).json({ error: "That phone number does not look right. Include the area code." });
    }
    const tier = currentTier(tiers, todayInClub(now()), closes);
    if (tier.closed) {
      return res.status(410).json({ error: "Registration has closed. Call the club if you think there is still a place." });
    }

    const outcomes = await Promise.allSettled([postSlack(buildSlackText(r, tier)), recordKlaviyo(r, tier)]);
    const recorded = outcomes.some((o) => o.status === "fulfilled" && o.value === true);
    for (const o of outcomes) {
      if (o.status === "rejected") console.error("[open] record failed:", o.reason?.message || o.reason);
    }
    if (!recorded) {
      // Neither record took, so nobody at the club knows this person exists. Handing
      // out the payment link now would take their money for a place nobody has written
      // down. Refuse, and say so plainly.
      return res.status(502).json({ error: "We could not save your registration. Nothing has been charged; please try again in a minute or call the club." });
    }
    return res.json({
      ok: true,
      bookUrl,
      tier: tier.key,
      price: tier.price,
      pay: tier.price,
    });
  });

  return router;
}
