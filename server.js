import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { existsSync } from "fs";
import { z } from "zod";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(__dirname, "dist");
const launchDir = path.join(dist, "launch");
const indexHtml = path.join(dist, "index.html");
const launchIndex = path.join(launchDir, "index.html");

const app = express();
app.use(express.json({ limit: "32kb" }));

/** Set in production (e.g. Railway). Make returns 410 "Webhook not found" when the scenario hook was deleted or rotated. */
const interestWebhookUrl = process.env.MAKE_INTEREST_WEBHOOK_URL?.trim();

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
});

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

  if (!interestWebhookUrl) {
    console.error(
      "[register-interest] MAKE_INTEREST_WEBHOOK_URL is missing — cannot forward signup data.",
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

const ACADEMY_BOOKING_TYPES = new Set([
  "COURSE_CLASS",
  "PUBLIC_CLASS",
  "PRIVATE_CLASS",
  "TOURNAMENT",
]);

const BOOKING_TYPE_LABELS = {
  COURSE_CLASS: "Course",
  PUBLIC_CLASS: "Clinic",
  PRIVATE_CLASS: "Private Class",
  TOURNAMENT: "Tournament",
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

  const url = new URL("https://thirdparty.playtomic.io/api/v1/bookings");
  url.searchParams.set("tenant_id", PLAYTOMIC_TENANT_ID);
  url.searchParams.set("start_booking_date", start);
  url.searchParams.set("end_booking_date", end);
  url.searchParams.set("size", "200");

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
      bodyPreview: body.slice(0, 300),
    });
    throw new Error(`Playtomic bookings request failed (${res.status})`);
  }

  const bookings = await res.json();

  const academyBookings = bookings.filter(
    (b) => ACADEMY_BOOKING_TYPES.has(b.booking_type) && !b.is_canceled,
  );

  bookingsCache = { data: academyBookings, fetchedAt: Date.now() };

  console.log("[playtomic] Cached %d academy bookings (of %d total)",
    academyBookings.length, bookings.length);

  for (const b of academyBookings) {
    console.log("[playtomic] booking: type=%s title=%s activity_name=%s course_name=%s price=%s participants=%d court=%s activity_id=%s",
      b.booking_type,
      b.activity_name || b.course_name || "(none)",
      b.activity_name,
      b.course_name,
      b.price,
      b.participant_info?.participants?.length ?? 0,
      b.resource_name,
      b.activity_id,
    );
    console.log("[playtomic] FULL BOOKING KEYS: %s", Object.keys(b).join(", "));
    console.log("[playtomic] RAW BOOKING: %s", JSON.stringify(b, null, 2));
  }

  return academyBookings;
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

function mapBookingToEvent(booking) {
  const startUtc = new Date(booking.booking_start_date + "Z");
  const endUtc = new Date(booking.booking_end_date + "Z");

  const startLocal = toLocalParts(startUtc, CLUB_TIMEZONE);
  const endLocal = toLocalParts(endUtc, CLUB_TIMEZONE);

  const date = startLocal.date;
  const startTime = startLocal.time;
  const endTime = endLocal.time;

  const durationMin = Math.round((endUtc - startUtc) / 60000);

  const title =
    booking.activity_name ||
    booking.course_name ||
    BOOKING_TYPE_LABELS[booking.booking_type] ||
    booking.booking_type;

  const participants = booking.participant_info?.participants ?? [];
  const signedUp = participants.length;

  return {
    id: booking.booking_id,
    title,
    date,
    start_time: startTime,
    end_time: endTime,
    duration_min: durationMin,
    price: booking.price || null,
    booking_type: booking.booking_type,
    court: booking.resource_name || null,
    signed_up: signedUp,
  };
}

// ---------------------------------------------------------------------------
// Public events API (backed by Playtomic)
// ---------------------------------------------------------------------------

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

app.get("/api/events", async (req, res) => {
  if (!PLAYTOMIC_CLIENT_ID || !PLAYTOMIC_CLIENT_SECRET) {
    console.error("[events] PLAYTOMIC_CLIENT_ID / PLAYTOMIC_CLIENT_SECRET not configured");
    return res.status(503).json({ error: "Events not configured." });
  }

  const { date } = req.query;
  if (!date || !DATE_REGEX.test(date)) {
    return res.status(400).json({ error: "Query param 'date' required (YYYY-MM-DD)." });
  }

  try {
    const bookings = await fetchPlaytomicBookings();

    const events = bookings
      .map(mapBookingToEvent)
      .filter((e) => e.date === date)
      .sort((a, b) => a.start_time.localeCompare(b.start_time));

    return res.json(events);
  } catch (error) {
    console.error("[events] Playtomic fetch failed", {
      message: error instanceof Error ? error.message : error,
    });
    return res.status(502).json({ error: "Failed to fetch events from Playtomic." });
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

// Serves fullsite at / (e.g. /assets/...) and holding files under /launch/...
app.use(express.static(dist, { index: false }));

function sendLaunchSpa(res) {
  if (!existsSync(launchIndex)) {
    console.error("Holding page not built: missing dist/launch/index.html (run npm run build:railway)");
    return res
      .status(503)
      .type("text/plain")
      .send("Holding page not deployed. Ensure build command is: npm run build:railway");
  }
  res.sendFile(launchIndex);
}

// Holding SPA: /launch and client routes under /launch/*
app.get(/^\/launch(\/.*)?$/, (req, res, next) => {
  if (path.extname(req.path)) {
    return res.status(404).type("text/plain").send("Not found");
  }
  sendLaunchSpa(res);
});

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
  console.log(`  /launch   -> holding / launch page`);
});
