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
 *  `from` is on or before today wins, so keep them in ascending date order. */
export const DEFAULT_TIERS = [
  { key: "early", label: "Early bird", price: 75, from: "2026-09-27", membersEligible: false },
  { key: "regular", label: "Regular", price: 100, from: "2026-11-01", membersEligible: true },
  { key: "late", label: "Late", price: 125, from: "2026-11-23", membersEligible: true },
];
export const MEMBER_DISCOUNT = 0.25;

export function todayInClub(now = new Date(), timeZone = "America/Los_Angeles") {
  return new Intl.DateTimeFormat("en-CA", { timeZone }).format(now);
}

/** Which tier applies today, and what a member would pay for it. */
export function currentTier(tiers = DEFAULT_TIERS, today = todayInClub()) {
  let tier = tiers[0];
  for (const t of tiers) if (t.from <= today) tier = t;
  const memberPrice = tier.membersEligible ? Math.round(tier.price * (1 - MEMBER_DISCOUNT)) : null;
  return { ...tier, memberPrice };
}

const E164 = /^\+[1-9]\d{6,14}$/;

export const registrationSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().min(7).max(30),
  shirt: z.enum(SHIRT_SIZES),
  level: z.enum(LEVELS),
  // Their own Playtomic rating, if they know it. Free text so "about 2.5" is fine.
  rating: z.string().trim().max(20).optional().or(z.literal("")),
  member: z.boolean().optional(),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
  // Anti-spam: the honeypot must be empty and the arithmetic must be right, exactly as
  // the interest form does it.
  website: z.string().max(0).optional(),
});

export function buildSlackText(r, tier) {
  const bits = [
    `*New open registration*  ${escapeSlack(r.name)}`,
    `Level: *${r.level}*${r.rating ? ` (rating ${escapeSlack(r.rating)})` : ""}`,
    `Shirt: ${r.shirt}  ·  ${r.member ? "MEMBER" : "non-member"}  ·  tier: ${tier.label} $${tier.price}`,
    `${escapeSlack(r.email)}  ·  ${escapeSlack(r.phone)}`,
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
    if (!klaviyo) return false;
    const properties = {
      open_dec_2026_level: r.level,
      open_dec_2026_shirt: r.shirt,
      open_dec_2026_member: Boolean(r.member),
      open_dec_2026_tier: tier.key,
      open_dec_2026_rating: r.rating || null,
      open_dec_2026_notes: r.notes || null,
      open_dec_2026_registered_at: now().toISOString(),
      signup_source: "open-dec-2026",
    };
    const attrs = { email: r.email, properties, first_name: r.name.split(" ")[0] };
    const phone = normalizePhone(r.phone);
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
            profiles: { data: [{ type: "profile", attributes: { email: r.email, subscriptions: { email: { marketing: { consent: "SUBSCRIBED" } } } } }] },
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
    const tier = currentTier(tiers, todayInClub(now()));
    res.json({ tier: tier.key, label: tier.label, price: tier.price, memberPrice: tier.memberPrice, bookable: Boolean(bookUrl) });
  });

  router.post("/api/open/register", async (req, res) => {
    const parsed = registrationSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Please check the form: every field except notes is required." });
    }
    const r = {
      ...parsed.data,
      name: sanitize(parsed.data.name, 80),
      phone: sanitize(parsed.data.phone, 30),
      rating: sanitize(parsed.data.rating || "", 20),
      notes: sanitize(parsed.data.notes || "", 500),
    };
    if (!E164.test(normalizePhone(r.phone) || "")) {
      return res.status(400).json({ error: "That phone number does not look right. Include the area code." });
    }
    const tier = currentTier(tiers, todayInClub(now()));

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
      memberPrice: tier.memberPrice,
      pay: r.member && tier.memberPrice != null ? tier.memberPrice : tier.price,
    });
  });

  return router;
}
