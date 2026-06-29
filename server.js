import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { existsSync } from "fs";
import { z } from "zod";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(__dirname, "dist");
const indexHtml = path.join(dist, "index.html");

const app = express();
app.use(express.json({ limit: "32kb" }));

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

// Playtomic booking types surfaced in the public Events widget. OPEN_MATCH is
// open play; the rest are academy programming (clinics/courses/private/tournaments).
// Booking types surfaced on the public schedule. PRIVATE_CLASS is intentionally
// excluded — private lessons are personal bookings, not public events.
const EVENT_BOOKING_TYPES = new Set([
  "COURSE_CLASS",
  "PUBLIC_CLASS",
  "TOURNAMENT",
  "OPEN_MATCH",
]);

const BOOKING_TYPE_LABELS = {
  COURSE_CLASS: "Course",
  PUBLIC_CLASS: "Clinic",
  PRIVATE_CLASS: "Private Class",
  TOURNAMENT: "Tournament",
  OPEN_MATCH: "Open Play",
};

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
let bookingsCache = { data: [], fetchedAt: 0 };

async function fetchPlaytomicBookings() {
  if (bookingsCache.data.length && Date.now() - bookingsCache.fetchedAt < BOOKINGS_CACHE_TTL) {
    return bookingsCache.data;
  }

  const token = await getPlaytomicToken();

  const now = new Date();
  const start = now.toISOString().slice(0, 19);
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

  const eventBookings = all.filter(
    (b) => EVENT_BOOKING_TYPES.has(b.booking_type) && !b.is_canceled,
  );

  bookingsCache = { data: eventBookings, fetchedAt: Date.now() };

  console.log("[playtomic] Cached %d event bookings (of %d total fetched)",
    eventBookings.length, all.length);

  return eventBookings;
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

function mapBookingGroup(group) {
  const booking = group[0];
  const startUtc = new Date(booking.booking_start_date + "Z");
  const endUtc = new Date(booking.booking_end_date + "Z");

  const startLocal = toLocalParts(startUtc, CLUB_TIMEZONE);
  const endLocal = toLocalParts(endUtc, CLUB_TIMEZONE);

  const durationMin = Math.round((endUtc - startUtc) / 60000);

  const title =
    booking.activity_name ||
    booking.course_name ||
    BOOKING_TYPE_LABELS[booking.booking_type] ||
    booking.booking_type;

  const courts = [
    ...new Set(group.map((g) => (g.resource_name || "").trim()).filter(Boolean)),
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
    booking_type: booking.booking_type,
    court: courts.length <= 1 ? courts[0] || null : `${courts.length} courts`,
    signed_up: participantIds.size,
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
async function getEvents({ from = null, to = null } = {}) {
  const bookings = await fetchPlaytomicBookings();
  return groupEventBookings(bookings)
    .map(mapBookingGroup)
    .filter((e) => (from ? e.date >= from : true) && (to ? e.date <= to : true))
    .sort((a, b) =>
      a.date === b.date
        ? a.start_time.localeCompare(b.start_time)
        : a.date.localeCompare(b.date),
    );
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

// Kumi join on-ramp: foundrypadel.com/kumi -> reverse-proxy the club's join
// page (backend-rendered HTML) so the URL stays on the Foundry domain instead
// of redirecting visitors to padelmaps.org. The page is self-contained
// (inline styles + SVG QR, absolute wa.me links), so no rewriting is needed.
app.get(["/kumi", "/kumi/"], async (req, res) => {
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

// Main site SPA fallback
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
  res.sendFile(indexHtml);
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Serving at http://localhost:${port}`);
  console.log(`  /         -> full marketing site`);
});
