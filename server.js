import express from "express";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { existsSync } from "fs";
import { z } from "zod";
import { createChatRouter } from "./server/chat.js";
import { createVoiceRouter } from "./server/voice.js";
import { createNotifier } from "./server/notify.js";
import { createLinkSender } from "./server/smslink.js";
import { createCallPoller } from "./server/callpoller.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// SITE_DIST exists so the routing tests can point at a fixture tree instead of
// a real build; production never sets it.
const dist = process.env.SITE_DIST
  ? path.resolve(process.env.SITE_DIST)
  : path.join(__dirname, "dist");
const indexHtml = path.join(dist, "index.html");

const app = express();
app.use(express.json({ limit: "32kb" }));

// Canonical host: once the apex domain points here (instead of Squarespace,
// whose redirect drops paths), send it to www WITH the path intact.
app.use((req, res, next) => {
  if (req.hostname === "foundrypadel.com") {
    return res.redirect(301, `https://www.foundrypadel.com${req.originalUrl}`);
  }
  next();
});

/**
 * Signup delivery. We prefer subscribing the lead straight to Klaviyo (robust,
 * no third-party relay). The legacy Make.com webhook is kept only as a fallback
 * for when KLAVIYO_API_KEY is not yet set — Make returns 410 once its scenario
 * hook is deleted/rotated, which silently dropped signups (the bug this fixes).
 */
const interestWebhookUrl = process.env.MAKE_INTEREST_WEBHOOK_URL?.trim();
const KLAVIYO_API_KEY = process.env.KLAVIYO_API_KEY?.trim();
// The Klaviyo list interest signups join. Defaults to Foundry's "Email List".
const KLAVIYO_INTEREST_LIST_ID =
  process.env.KLAVIYO_INTEREST_LIST_ID?.trim() || "T4pSUu";
const KLAVIYO_REVISION = "2026-04-15";

const E164_MOBILE_REGEX = /^\+[1-9]\d{6,14}$/;

const interestPayloadSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(255),
  mobile: z.preprocess(
    (v) => {
      if (v === undefined || v === null) return undefined;
      if (typeof v === "string" && v.trim() === "") return undefined;
      return v;
    },
    z.string().regex(E164_MOBILE_REGEX).optional(),
  ),
  source: z.enum(["home", "memberships", "contact", "book"]).optional(),
  // SMS opt-in consent captured at the form (10DLC). Recorded so the lead record
  // shows whether the person agreed to receive texts.
  sms_consent: z.boolean().optional(),
  // What the lead wants to hear about — drives Klaviyo segmentation. Multi-select;
  // replaces the old self-reported skill level (which leads grow out of).
  interests: z
    .array(
      z.enum([
        "coaching",
        "clinics",
        "open_play",
        "tournaments",
        "events",
        "memberships",
      ]),
    )
    .max(6)
    .optional(),
});

async function klaviyo(method, apiPath, body) {
  const res = await fetch(`https://a.klaviyo.com/api${apiPath}`, {
    method,
    headers: {
      Authorization: `Klaviyo-API-Key ${KLAVIYO_API_KEY}`,
      revision: KLAVIYO_REVISION,
      accept: "application/json",
      ...(body ? { "content-type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text };
  }
  return { status: res.status, json };
}

/**
 * Upsert the profile (so source/level/consent properties stick — segments key
 * off them) and subscribe it to the interest list with email marketing consent.
 */
async function subscribeToKlaviyo({ email, mobile, source, interests, sms_consent }) {
  const properties = {};
  if (source) properties.signup_source = source;
  // Store interests as a list property so segments can match "interests contains X".
  if (interests?.length) properties.interests = [...new Set(interests)];
  // Record the SMS opt-in for 10DLC proof-of-consent (audit trail on the profile).
  if (sms_consent !== undefined) properties.sms_consent = sms_consent;

  const attrs = { email, properties };
  if (mobile) attrs.phone_number = mobile;

  const create = await klaviyo("POST", "/profiles", {
    data: { type: "profile", attributes: attrs },
  });
  if (create.status === 409) {
    const id = create.json?.errors?.[0]?.meta?.duplicate_profile_id;
    if (id && Object.keys(properties).length) {
      await klaviyo("PATCH", `/profiles/${id}`, {
        data: { type: "profile", id, attributes: { properties } },
      });
    }
  } else if (create.status !== 201) {
    throw new Error(
      `profile upsert ${create.status}: ${JSON.stringify(create.json).slice(0, 200)}`,
    );
  }

  const sub = await klaviyo("POST", "/profile-subscription-bulk-create-jobs", {
    data: {
      type: "profile-subscription-bulk-create-job",
      attributes: {
        custom_source: "Website interest form",
        profiles: {
          data: [
            {
              type: "profile",
              attributes: {
                email,
                subscriptions: { email: { marketing: { consent: "SUBSCRIBED" } } },
              },
            },
          ],
        },
      },
      relationships: {
        list: { data: { type: "list", id: KLAVIYO_INTEREST_LIST_ID } },
      },
    },
  });
  if (![200, 201, 202].includes(sub.status)) {
    throw new Error(
      `subscribe ${sub.status}: ${JSON.stringify(sub.json).slice(0, 200)}`,
    );
  }
}

app.post("/api/register-interest", async (req, res) => {
  const parsed = interestPayloadSchema.safeParse(req.body);
  if (!parsed.success) {
    console.warn("[register-interest] Validation failed", {
      issues: parsed.error.issues.map((issue) => ({
        path: issue.path.join("."),
        code: issue.code,
      })),
    });
    return res.status(400).json({ error: "Invalid request payload." });
  }

  // Preferred path: subscribe directly to Klaviyo (no fragile Make.com relay).
  if (KLAVIYO_API_KEY) {
    try {
      await subscribeToKlaviyo(parsed.data);
      return res.status(200).json({ ok: true });
    } catch (error) {
      console.error("[register-interest] Klaviyo subscribe failed", {
        message: error instanceof Error ? error.message : String(error),
      });
      return res.status(502).json({ error: "Signup service unavailable." });
    }
  }

  if (!interestWebhookUrl) {
    console.error(
      "[register-interest] No KLAVIYO_API_KEY and no MAKE_INTEREST_WEBHOOK_URL — cannot store signup.",
    );
    return res.status(503).json({ error: "Signup service is not configured." });
  }

  let webhookHost = "unknown";
  try {
    webhookHost = new URL(interestWebhookUrl).host;
  } catch {
    // ignore — already validated upstream by env config
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10_000);
    const upstreamResponse = await fetch(interestWebhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed.data),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!upstreamResponse.ok) {
      const responseText = await upstreamResponse.text();
      console.error("[register-interest] Upstream webhook failure", {
        status: upstreamResponse.status,
        host: webhookHost,
        bodyPreview: responseText.slice(0, 300),
        hint:
          upstreamResponse.status === 410
            ? "Make.com hook URL is gone (410) — create a new scenario webhook and set MAKE_INTEREST_WEBHOOK_URL."
            : undefined,
      });
      return res.status(502).json({ error: "Upstream service unavailable." });
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    // Node `fetch` (undici) wraps the real reason in `error.cause`. Surface it
    // so we can tell DNS / connect / TLS / timeout failures apart on Railway.
    const cause = error instanceof Error ? error.cause : undefined;
    console.error("[register-interest] Unexpected error", {
      host: webhookHost,
      name: error instanceof Error ? error.name : typeof error,
      message: error instanceof Error ? error.message : String(error),
      causeName: cause instanceof Error ? cause.name : undefined,
      causeCode:
        cause && typeof cause === "object" && "code" in cause
          ? cause.code
          : undefined,
      causeMessage:
        cause instanceof Error ? cause.message : undefined,
      causeErrno:
        cause && typeof cause === "object" && "errno" in cause
          ? cause.errno
          : undefined,
    });
    return res.status(500).json({ error: "Internal server error." });
  }
});

// ---------------------------------------------------------------------------
// Playtomic API integration (replaces Neon-backed events)
// ---------------------------------------------------------------------------

const PLAYTOMIC_CLIENT_ID = process.env.PLAYTOMIC_CLIENT_ID;
const PLAYTOMIC_CLIENT_SECRET = process.env.PLAYTOMIC_CLIENT_SECRET;
const PLAYTOMIC_TENANT_ID =
  process.env.PLAYTOMIC_TENANT_ID || "70cae734-e32f-4e3a-9f72-516d9f025125";

// Playtomic booking types surfaced in the public Events widget. OPEN_MATCH is a
// 4-player open match (players requesting others to fill a court) — distinct from
// "open play" group sessions, which arrive as classes. The rest are academy
// programming (clinics/courses/private/tournaments).
// Booking types surfaced on the public schedule. PRIVATE_CLASS is intentionally
// excluded — private lessons are personal bookings, not public events.
const EVENT_BOOKING_TYPES = new Set([
  "COURSE_CLASS",
  "PUBLIC_CLASS",
  "TOURNAMENT",
  "OPEN_MATCH",
]);

// Padel is 2v2. Used both to hide full matches and to split the court price.
const OPEN_MATCH_SIZE = 4;

const BOOKING_TYPE_LABELS = {
  COURSE_CLASS: "Course",
  PUBLIC_CLASS: "Clinic",
  PRIVATE_CLASS: "Private Class",
  TOURNAMENT: "Tournament",
  OPEN_MATCH: "Open Match",
};

// Playtomic reports manager-created social events (e.g. the weekly "Midday
// Social") with booking_type UNKNOWN, even though Kumi's tournaments feed lists
// them as tournaments under the same id. Left alone they are filtered out and
// never reach the public schedule.
//
// UNKNOWN is a catch-all, so only rows carrying a tournament_id are promoted —
// anything else Playtomic labels UNKNOWN stays off the public site rather than
// risking a private booking being published.
function effectiveBookingType(booking) {
  if (booking.booking_type === "UNKNOWN" && booking.tournament_id) {
    return "TOURNAMENT";
  }
  return booking.booking_type;
}

let tokenCache = { accessToken: null, expiresAt: 0 };

async function getPlaytomicToken() {
  if (tokenCache.accessToken && Date.now() < tokenCache.expiresAt) {
    return tokenCache.accessToken;
  }

  const res = await fetch("https://thirdparty.playtomic.io/api/v1/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: PLAYTOMIC_CLIENT_ID,
      secret: PLAYTOMIC_CLIENT_SECRET,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error("[playtomic] Token request failed", {
      status: res.status,
      bodyPreview: body.slice(0, 300),
    });
    throw new Error(`Playtomic token request failed (${res.status})`);
  }

  const data = await res.json();
  const bufferMs = 5 * 60 * 1000;
  tokenCache = {
    accessToken: data.token,
    expiresAt: Date.now() + (data.expires_in || 3600) * 1000 - bufferMs,
  };

  console.log("[playtomic] Token refreshed, expires in ~%d min",
    Math.round(((data.expires_in || 3600) - 300) / 60));

  return tokenCache.accessToken;
}

const BOOKINGS_CACHE_TTL = 5 * 60 * 1000;
// Longest session Playtomic reports here is 120 min; 3h gives that headroom.
const BOOKINGS_LOOKBACK_MS = 3 * 60 * 60 * 1000;
let bookingsCache = { data: [], fetchedAt: 0 };

async function fetchPlaytomicBookings() {
  if (bookingsCache.data.length && Date.now() - bookingsCache.fetchedAt < BOOKINGS_CACHE_TTL) {
    return bookingsCache.data;
  }

  const token = await getPlaytomicToken();

  const now = new Date();
  // Look back before "now", or bookings already under way are never returned and
  // a court in use reads as free. "Can I come down right now" is one of the most
  // common calls a club takes, so this matters. The longest session is 2 hours.
  const start = new Date(now.getTime() - BOOKINGS_LOOKBACK_MS)
    .toISOString()
    .slice(0, 19);
  const end = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 19);

  // Playtomic caps each response at `size` rows and does NOT sort by date, so a
  // single page can silently drop near-term events once the club has >200 bookings
  // in the window. Page through all of them.
  const PAGE_SIZE = 200;
  const MAX_PAGES = 25;
  const all = [];
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const url = new URL("https://thirdparty.playtomic.io/api/v1/bookings");
    url.searchParams.set("tenant_id", PLAYTOMIC_TENANT_ID);
    url.searchParams.set("start_booking_date", start);
    url.searchParams.set("end_booking_date", end);
    url.searchParams.set("size", String(PAGE_SIZE));
    url.searchParams.set("page", String(page));

    const res = await fetch(url.toString(), {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error("[playtomic] Bookings fetch failed", {
        status: res.status,
        page,
        bodyPreview: body.slice(0, 300),
      });
      throw new Error(`Playtomic bookings request failed (${res.status})`);
    }

    const chunk = await res.json();
    if (!Array.isArray(chunk) || chunk.length === 0) break;
    all.push(...chunk);
    if (chunk.length < PAGE_SIZE) break;
  }

  // Cache every live booking, not just the publicly-listed ones. Court
  // availability is derived by subtracting ALL occupancy (regular bookings and
  // private lessons very much included) from opening hours, so the public-event
  // filter has to happen downstream in getEvents rather than here.
  const live = all.filter((b) => !b.is_canceled);

  bookingsCache = { data: live, fetchedAt: Date.now() };

  console.log(
    "[playtomic] Cached %d live bookings (of %d fetched); %d are public events",
    live.length,
    all.length,
    live.filter((b) => EVENT_BOOKING_TYPES.has(effectiveBookingType(b))).length,
  );

  return live;
}

const CLUB_TIMEZONE = process.env.CLUB_TIMEZONE || "America/Los_Angeles";

function toLocalParts(utcDate, tz) {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = Object.fromEntries(
    fmt.formatToParts(utcDate).map((p) => [p.type, p.value]),
  );
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}`,
  };
}

function groupEventBookings(bookings) {
  // Multi-court activities (e.g. a tournament across 4 courts) arrive as one
  // booking row per court, sharing an activity_id + start time. Group those into
  // a single event. Open matches (and anything without an activity_id) stay
  // separate, keyed by their own booking_id.
  const groups = new Map();
  for (const b of bookings) {
    const key = b.activity_id
      ? `act:${b.activity_id}:${b.booking_start_date}`
      : `bk:${b.booking_id}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(b);
  }
  return [...groups.values()];
}

// Deep link to the specific item on Playtomic's consumer site. The id used
// differs by type (verified against Playtomic's own share links):
//   TOURNAMENT  -> /tournaments/{tournament_id}
//   PUBLIC/COURSE_CLASS (clinics, coaching, class-run open play) -> /lesson_class/{activity_id}
//   OPEN_MATCH  -> /matches/{object_id}   (NOT booking_id)
// Anything else falls back to the club page.
const PLAYTOMIC_APP = "https://app.playtomic.com";

function bookingDeepLink(booking) {
  switch (effectiveBookingType(booking)) {
    case "TOURNAMENT":
      return `${PLAYTOMIC_APP}/tournaments/${booking.tournament_id || booking.activity_id}`;
    case "PUBLIC_CLASS":
    case "COURSE_CLASS":
      return `${PLAYTOMIC_APP}/lesson_class/${booking.activity_id || booking.object_id}`;
    case "OPEN_MATCH":
      if (booking.object_id) return `${PLAYTOMIC_APP}/matches/${booking.object_id}`;
      break;
    default:
      break;
  }
  return `${PLAYTOMIC_APP}/tenant/${PLAYTOMIC_TENANT_ID}`;
}

function mapBookingGroup(group) {
  const booking = group[0];
  const startUtc = new Date(booking.booking_start_date + "Z");
  const endUtc = new Date(booking.booking_end_date + "Z");

  const startLocal = toLocalParts(startUtc, CLUB_TIMEZONE);
  const endLocal = toLocalParts(endUtc, CLUB_TIMEZONE);

  const durationMin = Math.round((endUtc - startUtc) / 60000);

  const bookingType = effectiveBookingType(booking);

  const title =
    booking.activity_name ||
    booking.course_name ||
    BOOKING_TYPE_LABELS[bookingType] ||
    bookingType;

  const courts = [
    ...new Set(group.map((g) => courtLabel(g.resource_name)).filter(Boolean)),
  ].sort();

  // Count distinct participants across the grouped court rows, deduped by id so a
  // roster that repeats on every court row isn't multiplied.
  const participantIds = new Set();
  for (const g of group) {
    for (const p of g.participant_info?.participants ?? []) {
      participantIds.add(p.user_id || p.player_id || p.id || JSON.stringify(p));
    }
  }

  return {
    id: booking.activity_id || booking.booking_id,
    title,
    date: startLocal.date,
    start_time: startLocal.time,
    end_time: endLocal.time,
    duration_min: durationMin,
    price: booking.price || null,
    booking_type: bookingType,
    court: courts.length <= 1 ? courts[0] || null : `${courts.length} courts`,
    // The individual courts too, so the phone agent can say which ones.
    courts,
    signed_up: participantIds.size,
    book_url: bookingDeepLink(booking),
  };
}

// ---------------------------------------------------------------------------
// Public events API (backed by Playtomic)
// ---------------------------------------------------------------------------

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const MAX_RANGE_DAYS = 31;

// Day count (inclusive) between two YYYY-MM-DD strings, or null if start > end.
function inclusiveDaySpan(start, end) {
  const ms = Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`);
  if (Number.isNaN(ms) || ms < 0) return null;
  return Math.round(ms / 86400000) + 1;
}

// Shared: fetch Playtomic bookings, group multi-court activities, map to the
// client shape, optionally filter to [from, to] (inclusive YYYY-MM-DD), and
// sort by date then start time.
// Zero/empty prices read as noise ("$0") — treat them as unknown.
function cleanPrice(price) {
  if (!price) return null;
  const n = parseFloat(String(price).replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) && n > 0 ? price : null;
}

const CLASS_TYPES = new Set(["PUBLIC_CLASS", "COURSE_CLASS"]);

/** The Playtomic match id an open match deep-links to. The event's own `id` is the
 *  booking/activity id, which is NOT the match id, so the link is the only carrier. */
function openMatchId(event) {
  const m = /\/matches\/([0-9a-fA-F-]{8,})/.exec(event?.book_url || "");
  return m ? m[1] : null;
}

/** Name an open match by the LEVELS it is for. "Open Match" alone told a visitor nothing
 *  about whether it was for them, and level is the first thing anyone wants to know.
 *
 *  Straddling matches carry BOTH labels ("Intermediate/Advanced") because picking one is
 *  a lie in either direction. A match with no known range keeps the plain title: an
 *  unlabelled match is honest, a wrongly labelled one is not. Pure and exported — this
 *  is visitor-facing wording, and the last untested change to this file took the
 *  schedule down. */
function applyKumiOpenMatchLevels(events, openMatches) {
  const byId = new Map();
  for (const m of openMatches || []) {
    const labels = (m?.levels || []).filter(Boolean);
    if (m?.playtomic_match_id && labels.length) byId.set(m.playtomic_match_id, labels);
  }
  for (const e of events) {
    if (e.booking_type !== "OPEN_MATCH") continue;
    const labels = byId.get(openMatchId(e));
    if (labels?.length) e.title = `${labels.join("/")} Open Match`;
  }
  return events;
}

/** Overlay Kumi's per-class facts onto the public schedule, matched by class id with a
 *  title+date fallback. Pure and exported so the naming rule is testable — it decides
 *  what a visitor reads, and it silently disagreed with Playtomic for every clinic. */
function applyKumiClassInfo(events, classes) {
  const byId = new Map();
  const byTitleDate = new Map();
  for (const c of classes || []) {
    const info = {
      price: cleanPrice(c.price) || (c.price === "Free" ? "Free" : null),
      capacity: Number.isFinite(c.max_players) ? c.max_players : null,
      registered: Number.isFinite(c.num_registered) ? c.num_registered : null,
      name: (c.name || "").trim() || null,
    };
    // A name alone is worth keeping. This used to drop any class with no price and no
    // capacity, which would have excluded exactly the free clinics we are here to rename.
    if (!info.price && info.capacity == null && !info.name) continue;
    if (c.academy_class_id) byId.set(c.academy_class_id, info);
    if (c.name && c.start_utc) {
      const local = toLocalParts(new Date(c.start_utc), CLUB_TIMEZONE);
      byTitleDate.set(`${c.name.trim().toLowerCase()}|${local.date}|${local.time}`, info);
    }
  }
  for (const e of events) {
    if (!CLASS_TYPES.has(e.booking_type)) continue;
    // The title fallback can only fire when the two sources already AGREE on the name,
    // so for a mislabelled class the id match is the only one that can help it.
    const match =
      byId.get(e.id) ||
      byTitleDate.get(`${(e.title || "").trim().toLowerCase()}|${e.date}|${e.start_time}`);
    e.price = match?.price || null; // never show a court total as a player price
    e.capacity = match?.capacity ?? null;
    if (match?.registered != null) e.signed_up = match.registered;
    // Prefer the class's own name over its program's. Only ever an upgrade: with no
    // match the bookings-API title stands, which is exactly what shipped before.
    if (match?.name) e.title = match.name;
  }
  return events;
}

async function getEvents({ from = null, to = null } = {}) {
  const bookings = (await fetchPlaytomicBookings()).filter((b) =>
    EVENT_BOOKING_TYPES.has(effectiveBookingType(b)),
  );
  // The bookings fetch deliberately looks back a few hours so availability can
  // see sessions already under way. The public schedule must not inherit that:
  // an open match that finished an hour ago is not something to advertise.
  const nowParts = toLocalParts(new Date(), CLUB_TIMEZONE);
  // `let`, not `const`: the full-open-match filter below rebinds this.
  let events = groupEventBookings(bookings)
    .map(mapBookingGroup)
    .filter(
      (e) => e.date > nowParts.date || (e.date === nowParts.date && e.end_time > nowParts.time),
    )
    .filter((e) => (from ? e.date >= from : true) && (to ? e.date <= to : true))
    .sort((a, b) =>
      a.date === b.date
        ? a.start_time.localeCompare(b.start_time)
        : a.date.localeCompare(b.date),
    );

  // The bookings API reports court-booking TOTALS for classes (or 0), not what
  // a player pays. Kumi's classes feed carries the real per-person price —
  // swap it in for clinics/courses, matched by class id (activity_id ==
  // academy_class_id) with a title+date fallback.
  //
  // It also carries the real CLASS NAME. The thirdparty bookings API returns the
  // PROGRAM a class belongs to, not the class itself, so the Tuesday 10am clinic
  // showed "Tennis-to-Padel: Daytime Morning Crossover" when Playtomic (and Kumi,
  // and the coach) all call it "Midweek Morning Clinic: Tactics + Technique". All
  // three of Foundry's clinics were mislabelled this way. Only the per-class
  // manager endpoint exposes both, as `name` alongside a separate `program_id`,
  // and Kumi's ingest already reads it — so the fix is to trust the feed we are
  // already fetching rather than add a second Playtomic call per class.
  try {
    applyKumiClassInfo(events, (await fetchKumiClasses()).classes || []);

    const kumiT = await fetchKumiTournaments();
    const tById = new Map();
    const tByTitleDate = new Map();
    for (const t of kumiT.tournaments || []) {
      const info = {
        price: cleanPrice(t.price),
        capacity: Number.isFinite(t.max_players) ? t.max_players : null,
        registered: Number.isFinite(t.registered_count) ? t.registered_count : null,
      };
      if (!info.price && info.capacity == null) continue;
      if (t.tournament_id) tById.set(t.tournament_id, info);
      if (t.name && t.start_utc) {
        const local = toLocalParts(new Date(t.start_utc), CLUB_TIMEZONE);
        tByTitleDate.set(`${t.name.trim().toLowerCase()}|${local.date}|${local.time}`, info);
      }
    }
    for (const e of events) {
      if (e.booking_type !== "TOURNAMENT") continue;
      const urlId = (String(e.book_url || "").match(/tournaments\/([0-9a-f-]+)/) || [])[1];
      const match =
        (urlId && tById.get(urlId)) ||
        tByTitleDate.get(`${(e.title || "").trim().toLowerCase()}|${e.date}|${e.start_time}`);
      e.price = match?.price || null;
      e.capacity = match?.capacity ?? null;
      if (match?.registered != null) e.signed_up = match.registered;
    }
  } catch (error) {
    console.error("[events] kumi price enrichment skipped:", error.message);
    for (const e of events) {
      if (CLASS_TYPES.has(e.booking_type) || e.booking_type === "TOURNAMENT") e.price = null;
    }
  }

  // Level labels for open matches. Its OWN try: this feed is the newest dependency here
  // and the least important thing on the page. If Kumi is unreachable the matches simply
  // keep reading "Open Match", rather than the failure also wiping the class names and
  // per-person prices that the block above just applied.
  try {
    applyKumiOpenMatchLevels(events, (await fetchKumiOpenMatches()).open_matches || []);
  } catch (error) {
    console.warn("open-match levels unavailable:", error?.message || error);
  }

  // A FULL open match is not an event, it is a closed court. Showing "4 signed up"
  // on a 4-player match invites someone to click through to a match they cannot join,
  // which is worse than not listing it: the schedule exists to answer "what can I do
  // this week?". Padel open matches are always 4 (the price split below has assumed it
  // since this endpoint was written).
  events = events.filter(
    (e) => !(e.booking_type === "OPEN_MATCH" && (e.signed_up ?? 0) >= OPEN_MATCH_SIZE),
  );

  // Open matches: the bookings API reports the court total; four players split
  // it evenly, so show the per-person share.
  for (const e of events) {
    if (e.booking_type !== "OPEN_MATCH") continue;
    const n = parseFloat(String(e.price ?? "").replace(/[^0-9.]/g, ""));
    if (!Number.isFinite(n) || n <= 0) {
      e.price = null;
      continue;
    }
    const per = n / OPEN_MATCH_SIZE;
    e.price = `$${Number.isInteger(per) ? per : per.toFixed(2)}`;
  }

  for (const e of events) e.price = e.price === "Free" ? "Free" : cleanPrice(e.price);
  return events;
}

// ---------------------------------------------------------------------------
// Court availability (derived)
// ---------------------------------------------------------------------------
// The third-party Playtomic API has no availability endpoint — its whole
// surface is auth, bookings, players and payments. So free court time is
// derived: courts x opening hours, minus every live booking.
//
// Verified sound by scripts/probe-availability.js: durations are clean
// (60/90/120), starts land on :00 or :30, bookings tile without buffers, and no
// maintenance or closure rows exist. The residual risk is that a court could be
// blocked by something the bookings API never reports, which is why callers are
// told what is open, then pointed at the booking link to confirm.

const CLUB_OPEN = process.env.CLUB_OPEN || "07:00";
const CLUB_CLOSE = process.env.CLUB_CLOSE || "22:00";
const SLOT_STEP_MIN = 30;

function hhmmToMin(hhmm) {
  const [h, m] = String(hhmm).split(":").map(Number);
  return h * 60 + m;
}

function minToHhmm(min) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

// Courts keyed by resource_id, NEVER by resource_name: Playtomic returns court
// 4 as "Padel 4 " with a trailing space, so keying by name invents a fifth
// court and under-reports availability.
// Playtomic names the resources "Padel 1".."Padel 4"; the club calls them
// Court 1..4, and that is what a caller hears and what the website shows.
// Renamed in one place so the phone agent, the briefing and the public events
// feed cannot disagree.
export function courtLabel(name) {
  return String(name || "").replace(/^\s*padel\s*/i, "Court ").trim();
}

function courtsFromBookings(bookings) {
  const courts = new Map();
  for (const b of bookings) {
    if (!b.resource_id || courts.has(b.resource_id)) continue;
    courts.set(b.resource_id, courtLabel(b.resource_name) || b.resource_id);
  }
  return courts;
}

function mergeIntervals(intervals) {
  const sorted = [...intervals].sort((a, b) => a[0] - b[0]);
  const merged = [];
  for (const [start, end] of sorted) {
    const last = merged[merged.length - 1];
    if (last && start <= last[1]) last[1] = Math.max(last[1], end);
    else merged.push([start, end]);
  }
  return merged;
}

function freeIntervals(busy, open, close) {
  const free = [];
  let cursor = open;
  for (const [start, end] of mergeIntervals(busy)) {
    if (start > cursor) free.push([cursor, Math.min(start, close)]);
    cursor = Math.max(cursor, end);
    if (cursor >= close) break;
  }
  if (cursor < close) free.push([cursor, close]);
  return free.filter(([s, e]) => e > s);
}

/**
 * Derive free court time for one local date. Pure: no I/O, so it is directly
 * testable and safe to call on the hot path of a phone call.
 *
 * Everything is computed in local minutes-from-midnight for the target date,
 * which sidesteps local->UTC conversion and therefore DST entirely.
 *
 * @param {object[]} bookings  live (non-canceled) Playtomic bookings
 * @param {object}   opts
 * @param {string}   opts.date         YYYY-MM-DD, club-local
 * @param {number}   opts.durationMin  session length the caller wants
 * @param {string}   [opts.nowDate]    club-local today, to hide past slots
 * @param {string}   [opts.nowTime]    club-local HH:MM now
 */
function computeAvailability(bookings, { date, durationMin = 90, nowDate = null, nowTime = null } = {}) {
  const courts = courtsFromBookings(bookings);
  const busyByCourt = new Map();
  let earliest = hhmmToMin(CLUB_OPEN);
  let latest = hhmmToMin(CLUB_CLOSE);

  for (const b of bookings) {
    if (!b.resource_id || !b.booking_start_date || !b.booking_end_date) continue;
    const start = toLocalParts(new Date(`${b.booking_start_date}Z`), CLUB_TIMEZONE);
    if (start.date !== date) continue;
    const end = toLocalParts(new Date(`${b.booking_end_date}Z`), CLUB_TIMEZONE);

    const startMin = hhmmToMin(start.time);
    // A booking ending on the next local date runs to midnight for our purposes.
    const endMin = end.date === date ? hhmmToMin(end.time) : 24 * 60;
    if (endMin <= startMin) continue;

    // The club opens earlier than the website advertises (a 06:30 private lesson
    // is normal), so widen the grid to whatever is actually booked rather than
    // clamping to the marketing hours and hiding real court time.
    earliest = Math.min(earliest, startMin);
    latest = Math.max(latest, endMin);

    if (!busyByCourt.has(b.resource_id)) busyByCourt.set(b.resource_id, []);
    busyByCourt.get(b.resource_id).push([startMin, endMin]);
  }

  const freeByCourt = new Map();
  for (const [id] of courts) {
    freeByCourt.set(id, freeIntervals(busyByCourt.get(id) || [], earliest, latest));
  }

  // Candidate start times on a 30-minute grid, which is what the club actually
  // books on. A slot counts only if one court is free for the WHOLE duration.
  const cutoff =
    nowDate === date && nowTime ? hhmmToMin(nowTime) : Number.NEGATIVE_INFINITY;
  const firstSlot = Math.ceil(earliest / SLOT_STEP_MIN) * SLOT_STEP_MIN;
  const slots = [];
  for (let start = firstSlot; start + durationMin <= latest; start += SLOT_STEP_MIN) {
    if (start < cutoff) continue;
    const end = start + durationMin;
    const free = [];
    for (const [id, intervals] of freeByCourt) {
      if (intervals.some(([s, e]) => s <= start && e >= end)) free.push(courts.get(id));
    }
    if (free.length) {
      slots.push({
        start: minToHhmm(start),
        end: minToHhmm(end),
        courts_free: free.length,
        courts: free.sort(),
      });
    }
  }

  return {
    date,
    duration_min: durationMin,
    timezone: CLUB_TIMEZONE,
    opens: minToHhmm(earliest),
    closes: minToHhmm(latest),
    courts_total: courts.size,
    slots,
  };
}

// ---------------------------------------------------------------------------
// Warm cache, for the voice receptionist
// ---------------------------------------------------------------------------
// A cold getEvents() is one token call plus up to 25 sequential paged Playtomic
// fetches. On a web page that is a spinner; on a phone call it is dead air. So
// the voice endpoints only ever read cache, and this keeps the cache hot.

const VOICE_MAX_STALE_MS = 30 * 60 * 1000;

/** Cached bookings, or null if there is nothing fresh enough to answer from.
 *  Never triggers a fetch — callers degrade instead of blocking. */
function cachedBookings() {
  const ageMs = Date.now() - bookingsCache.fetchedAt;
  if (!bookingsCache.data.length || ageMs > VOICE_MAX_STALE_MS) return null;
  return { bookings: bookingsCache.data, ageMs, stale: ageMs > BOOKINGS_CACHE_TTL };
}

let warmEvents = { data: null, fetchedAt: 0 };

/** Cached public events, or null if nothing fresh enough. Never fetches. */
function cachedEvents() {
  const ageMs = Date.now() - warmEvents.fetchedAt;
  if (!warmEvents.data || ageMs > VOICE_MAX_STALE_MS) return null;
  return { events: warmEvents.data, ageMs, stale: ageMs > BOOKINGS_CACHE_TTL };
}

// Single-flight warm-up, so a cold process does not fail every caller.
//
// A Railway restart empties these caches. The warmer starts immediately but
// needs a token call plus up to 25 paged Playtomic fetches, and any call landing
// in that window was told "I can't see the court calendar this second". That
// happened to a real test call seconds after a deploy.
//
// So a cold cache now WAITS, briefly and once, rather than degrading instantly.
// Bounded well under the tool's 8s timeout, and shared between concurrent
// callers so ten simultaneous calls cause one fetch, not ten.
let warmInFlight = null;

async function ensureWarm(timeoutMs = 5000) {
  if (bookingsCache.data.length && warmEvents.data) return true;
  if (!PLAYTOMIC_CLIENT_ID || !PLAYTOMIC_CLIENT_SECRET) return false;

  if (!warmInFlight) {
    warmInFlight = (async () => {
      try {
        warmEvents = { data: await getEvents(), fetchedAt: Date.now() };
      } catch (error) {
        console.error("[warm] cold warm failed:", error.message);
      } finally {
        warmInFlight = null;
      }
    })();
  }

  // Give up waiting rather than hold the caller. The fetch keeps running, so the
  // next question a few seconds later is answered from a warm cache.
  let timer;
  const bounded = new Promise((resolve) => {
    timer = setTimeout(resolve, timeoutMs);
  });
  await Promise.race([warmInFlight, bounded]);
  clearTimeout(timer);
  return Boolean(bookingsCache.data.length);
}

function startCacheWarmer() {
  if (!PLAYTOMIC_CLIENT_ID || !PLAYTOMIC_CLIENT_SECRET) {
    console.log("[warm] Playtomic not configured; cache warmer not started");
    return null;
  }
  const tick = async () => {
    try {
      // getEvents populates the bookings cache and both Kumi caches in one pass,
      // so availability and schedule are both warm afterwards.
      warmEvents = { data: await getEvents(), fetchedAt: Date.now() };
    } catch (error) {
      // Keep the previous data: a stale answer beats silence mid-call.
      console.error("[warm] refresh failed:", error.message);
    }
  };
  tick();
  const timer = setInterval(tick, Math.max(60_000, BOOKINGS_CACHE_TTL - 30_000));
  timer.unref();
  return timer;
}

function eventsNotConfigured(res) {
  console.error("[events] PLAYTOMIC_CLIENT_ID / PLAYTOMIC_CLIENT_SECRET not configured");
  return res.status(503).json({ error: "Events not configured." });
}

function eventsFetchFailed(res, error) {
  console.error("[events] Playtomic fetch failed", {
    message: error instanceof Error ? error.message : error,
  });
  return res.status(502).json({ error: "Failed to fetch events from Playtomic." });
}

app.get("/api/events", async (req, res) => {
  if (!PLAYTOMIC_CLIENT_ID || !PLAYTOMIC_CLIENT_SECRET) return eventsNotConfigured(res);

  const { date } = req.query;
  if (!date || !DATE_REGEX.test(date)) {
    return res.status(400).json({ error: "Query param 'date' required (YYYY-MM-DD)." });
  }

  try {
    return res.json(await getEvents({ from: date, to: date }));
  } catch (error) {
    return eventsFetchFailed(res, error);
  }
});

// 30-day calendar view: all events in [start, end] inclusive, in one request.
app.get("/api/events/range", async (req, res) => {
  if (!PLAYTOMIC_CLIENT_ID || !PLAYTOMIC_CLIENT_SECRET) return eventsNotConfigured(res);

  const { start, end } = req.query;
  if (!start || !end || !DATE_REGEX.test(start) || !DATE_REGEX.test(end)) {
    return res
      .status(400)
      .json({ error: "Query params 'start' and 'end' required (YYYY-MM-DD)." });
  }

  const span = inclusiveDaySpan(start, end);
  if (span === null) {
    return res.status(400).json({ error: "'start' must be on or before 'end'." });
  }
  if (span > MAX_RANGE_DAYS) {
    return res
      .status(400)
      .json({ error: `Range too large (max ${MAX_RANGE_DAYS} days).` });
  }

  try {
    return res.json(await getEvents({ from: start, to: end }));
  } catch (error) {
    return eventsFetchFailed(res, error);
  }
});

// Upcoming coach-led classes for the Coaching page, proxied from Kumi's public
// display/discovery endpoint (it carries per-class coach assignments, which
// Playtomic's thirdparty bookings API does not). Proxying keeps the browser on
// our origin (no CORS) and shields padelmaps.org behind a short cache.
// days=35, not 14, and not only for the Coaching page any more: /api/events/range uses
// this feed to correct class NAMES, and the calendar spans this month plus next. At 14
// days everything past a fortnight silently kept the program name instead. 35 matches the
// tournaments feed below and comfortably covers the ~30 days Playtomic returns at all.
const KUMI_CLASSES_URL =
  process.env.KUMI_CLASSES_URL ||
  "https://padelmaps.org/api/coaching/classes?slug=foundry-padel&days=35";
const COACH_CLASSES_TTL = 5 * 60 * 1000;
let coachClassesCache = { data: null, fetchedAt: 0 };

async function fetchKumiClasses() {
  if (coachClassesCache.data && Date.now() - coachClassesCache.fetchedAt < COACH_CLASSES_TTL) {
    return coachClassesCache.data;
  }
  const upstream = await fetch(KUMI_CLASSES_URL, { headers: { Accept: "application/json" } });
  if (!upstream.ok) throw new Error(`Kumi classes fetch failed (${upstream.status})`);
  const data = await upstream.json();
  coachClassesCache = { data, fetchedAt: Date.now() };
  return data;
}

const KUMI_TOURNAMENTS_URL =
  process.env.KUMI_TOURNAMENTS_URL ||
  "https://padelmaps.org/api/coaching/tournaments?slug=foundry-padel&days=35";
let kumiTournamentsCache = { data: null, fetchedAt: 0 };

async function fetchKumiTournaments() {
  if (kumiTournamentsCache.data && Date.now() - kumiTournamentsCache.fetchedAt < COACH_CLASSES_TTL) {
    return kumiTournamentsCache.data;
  }
  const upstream = await fetch(KUMI_TOURNAMENTS_URL, { headers: { Accept: "application/json" } });
  if (!upstream.ok) throw new Error(`Kumi tournaments fetch failed (${upstream.status})`);
  const data = await upstream.json();
  kumiTournamentsCache = { data, fetchedAt: Date.now() };
  return data;
}

const KUMI_OPEN_MATCHES_URL =
  process.env.KUMI_OPEN_MATCHES_URL ||
  "https://padelmaps.org/api/coaching/open-matches?slug=foundry-padel&days=35";
let kumiOpenMatchesCache = { data: null, fetchedAt: 0 };

async function fetchKumiOpenMatches() {
  if (kumiOpenMatchesCache.data && Date.now() - kumiOpenMatchesCache.fetchedAt < COACH_CLASSES_TTL) {
    return kumiOpenMatchesCache.data;
  }
  const upstream = await fetch(KUMI_OPEN_MATCHES_URL, { headers: { Accept: "application/json" } });
  if (!upstream.ok) throw new Error(`Kumi open matches fetch failed (${upstream.status})`);
  const data = await upstream.json();
  kumiOpenMatchesCache = { data, fetchedAt: Date.now() };
  return data;
}

app.get("/api/coaching/classes", async (req, res) => {
  try {
    return res.json(await fetchKumiClasses());
  } catch (error) {
    console.error("[coaching] classes proxy failed:", error.message);
    // Serve stale data if we have it; the page degrades gracefully otherwise.
    if (coachClassesCache.data) return res.json(coachClassesCache.data);
    return res.status(502).json({ error: "Couldn't load classes." });
  }
});

// Website chatbot. It is handed read-only accessors for the two feeds this server already
// caches, so answering a visitor costs no extra upstream calls; it gets nothing else from
// this process. See server/chat.js for the trust boundary.
app.use(
  createChatRouter({
    getClasses: () => fetchKumiClasses(),
    getEvents: () => {
      const today = toLocalParts(new Date(), CLUB_TIMEZONE).date;
      const to = toLocalParts(
        new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        CLUB_TIMEZONE,
      ).date;
      return getEvents({ from: today, to });
    },
  }),
);

// Tool endpoints for the Bland inbound receptionist. Handed cache-only
// accessors on purpose: these run mid-phone-call and must never block on
// Playtomic. See server/voice.js for the trust boundary.
app.use(
  createVoiceRouter({
    cachedBookings,
    cachedEvents,
    ensureWarm,
    computeAvailability,
    notifier: createNotifier(),
    linkSender: createLinkSender(),
    timezone: CLUB_TIMEZONE,
  }),
);

// Kumi join on-ramp: foundrypadel.com/join -> reverse-proxy the club's join
// page (backend-rendered HTML) so the URL stays on the Foundry domain instead
// of redirecting visitors to padelmaps.org. The page is self-contained
// (inline styles + SVG QR, absolute wa.me links), so no rewriting is needed.
// /kumi is the legacy path (printed materials) and redirects to /join.
app.get(["/kumi", "/kumi/"], (req, res) => res.redirect(301, "/join"));
app.get(["/join", "/join/"], async (req, res) => {
  const joinUrl = "https://padelmaps.org/join/foundry-padel";
  try {
    const upstream = await fetch(joinUrl, {
      headers: { "User-Agent": "foundry-site/kumi-proxy" },
    });
    const html = await upstream.text();
    res
      .status(upstream.status)
      .set("Content-Type", "text/html; charset=utf-8")
      .set("Cache-Control", "public, max-age=300")
      .send(html);
  } catch (error) {
    console.error("kumi join proxy failed:", error);
    res.redirect(302, joinUrl); // last-resort fallback
  }
});

// Legacy URLs: /fullsite and /fullsite/* -> / and /*
app.use((req, res, next) => {
  const p = req.path;
  if (!p.startsWith("/fullsite")) return next();
  const after = p === "/fullsite" ? "" : p.slice("/fullsite".length);
  const pathOnly =
    after === "" || after === "/" ? "/" : after.startsWith("/") ? after : `/${after}`;
  const qs = req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : "";
  res.redirect(301, pathOnly + qs);
});

// Serves fullsite assets at / (e.g. /assets/...).
app.use(express.static(dist, { index: false }));

// Main site fallback. Routes are prerendered to per-route HTML files by
// vite-react-ssg (e.g. /book -> dist/book.html), so a direct hit or crawler
// gets that page's own <title>/description/body.
//
// An unknown path must answer 404, not 200. It used to fall through to
// index.html at status 200 — the homepage's markup served from a dead URL —
// which Google reports as a soft 404 and which kept retired Squarespace URLs
// (/home, /about, ...) alive in the index. Now it gets the prerendered
// dist/404.html with a real 404. That file renders the same NotFound component
// the "*" route does, so hydration at the unknown path matches the markup.
app.get("*", (req, res) => {
  if (path.extname(req.path)) {
    return res.status(404).type("text/plain").send("Not found");
  }
  if (!existsSync(indexHtml)) {
    console.error("Main site not built: missing dist/index.html (run npm run build:railway)");
    return res
      .status(503)
      .type("text/plain")
      .send("Main site not deployed. Ensure build command is: npm run build:railway");
  }
  const clean = req.path.replace(/\/+$/, "") || "/";
  if (clean === "/") return res.sendFile(indexHtml);

  const candidate = path.join(dist, `${clean}.html`);
  // Only serve prerendered files that resolve inside dist (guards traversal).
  if (candidate.startsWith(dist + path.sep) && existsSync(candidate)) {
    return res.sendFile(candidate);
  }

  const notFoundHtml = path.join(dist, "404.html");
  if (existsSync(notFoundHtml)) {
    return res.status(404).sendFile(notFoundHtml);
  }
  // 404.html is emitted by the "404" route in fullsite/src/App.tsx; if a build
  // ever drops it, still answer 404 rather than falling back to the homepage.
  console.error("Missing dist/404.html — serving a plain-text 404 instead.");
  res.status(404).type("text/plain").send("Not found");
});

// Bind only when run as the entrypoint (`npm start`). Importing this module
// instead — as server/routing.test.js does — yields the app without a listener,
// so the tests can bind it to an ephemeral port themselves.
const isEntrypoint =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isEntrypoint) {
  const port = process.env.PORT || 3000;
  app.listen(port, () => {
    console.log(`Serving at http://localhost:${port}`);
    console.log(`  /         -> full marketing site`);
  });
  // Only when actually serving — tests import this module and must not start
  // a timer or reach out to Playtomic.
  startCacheWarmer();

  // Ask Bland about finished calls, rather than waiting for a webhook that
  // never arrives. See server/callpoller.js for why.
  createCallPoller({
    apiKey: process.env.BLAND_API_KEY,
    number: process.env.CLUB_PHONE_NUMBER || "+19715217887",
    notifier: createNotifier(),
    linkSender: createLinkSender(),
    cachedEvents,
    timezone: CLUB_TIMEZONE,
  }).start();
}

export { app };

// Pure helpers, exported for tests only (mirrors server/chat.js). These drive
// what the public schedule shows, but were previously unreachable from a test.
export const __testables = {
  effectiveBookingType,
  applyKumiClassInfo,
  applyKumiOpenMatchLevels,
  openMatchId,
  groupEventBookings,
  mapBookingGroup,
  bookingDeepLink,
  cleanPrice,
  inclusiveDaySpan,
  courtLabel,
  computeAvailability,
  freeIntervals,
  mergeIntervals,
  courtsFromBookings,
};
