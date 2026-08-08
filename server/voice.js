// Tool endpoints for the Bland inbound receptionist.
//
// Everything here is on the hot path of a live phone call, so the contract is
// strict: read cache only, never block, never fetch. A cold Playtomic read is
// one token call plus up to 25 sequential paged requests. On a web page that is
// a spinner; on a phone call it is dead air, and the caller hangs up. When
// there is nothing fresh enough to answer from, these endpoints say so
// immediately and the agent offers a human instead.
//
// Trust boundary, extending docs/website-chatbot-security.md:
//   - The website chatbot leans on "the model has no tools", so an injection
//     wins a wrong sentence. That guarantee does NOT hold here. These endpoints
//     are the agent's hands, so each one is bearer-authenticated and read-only.
//   - Playtomic booking rows carry member names and email addresses. Nothing
//     here returns a booking row. Availability is an explicit free/busy
//     projection and the schedule is the same shape the public website serves.

import express from "express";
import crypto from "node:crypto";

const VOICE_TOOL_SECRET = process.env.VOICE_TOOL_SECRET;

const LIMITS = {
  // Bland is the only legitimate caller and a busy club takes a handful of
  // concurrent calls, so this is a wide backstop for a leaked secret, not a
  // throttle on normal use.
  perMinute: 120,
  windowMs: 60 * 1000,
  maxSlotsReturned: 8,
  maxEventsReturned: 10,
  maxDays: 14,
};

// Same shape as the limiter in server/chat.js. Kept local rather than shared:
// one Railway instance, and a copy is cheaper than a refactor of a file that is
// load-bearing for the public site.
const hits = new Map();
function overLimit(key, max = LIMITS.perMinute, windowMs = LIMITS.windowMs) {
  const now = Date.now();
  const bucket = (hits.get(key) || []).filter((t) => now - t < windowMs);
  bucket.push(now);
  hits.set(key, bucket);
  return bucket.length > max;
}
const sweeper = setInterval(() => hits.clear(), 10 * 60 * 1000);
sweeper.unref();

function authorized(req) {
  // Fail closed. An unset secret means the endpoint is unconfigured, not open.
  if (!VOICE_TOOL_SECRET) return false;
  const header = req.get("authorization") || "";
  const presented = header.replace(/^Bearer\s+/i, "");
  const a = Buffer.from(presented);
  const b = Buffer.from(VOICE_TOOL_SECRET);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function nowLocal(timezone) {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const p = Object.fromEntries(
    fmt.formatToParts(new Date()).map((x) => [x.type, x.value]),
  );
  return { date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}` };
}

function addDays(isoDate, days) {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Speech-to-text hands us words, not ISO dates. Accept both, and refuse
 *  anything we cannot resolve rather than guessing at a date. */
export function resolveDate(input, today) {
  if (input == null || input === "") return today;
  const raw = String(input).trim().toLowerCase();
  if (ISO_DATE.test(raw)) return raw;
  if (raw === "today" || raw === "tonight") return today;
  if (raw === "tomorrow") return addDays(today, 1);
  const weekdays = [
    "sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday",
  ];
  const wanted = weekdays.indexOf(raw.replace(/^(this|next|on)\s+/, ""));
  if (wanted >= 0) {
    const current = new Date(`${today}T00:00:00Z`).getUTCDay();
    // "Friday" always means the next one, never today, which is what a caller
    // asking on Friday afternoon actually means.
    return addDays(today, ((wanted - current + 7) % 7) || 7);
  }
  return null;
}

/** "18:00", "6pm", "6:30 pm" -> minutes from midnight, or null. */
export function resolveTime(input) {
  if (input == null || input === "") return null;
  const raw = String(input).trim().toLowerCase().replace(/\s+/g, "");
  const m = raw.match(/^(\d{1,2})(?::(\d{2}))?(am|pm)?$/);
  if (!m) return null;
  let hour = Number(m[1]);
  const min = Number(m[2] || 0);
  if (hour > 23 || min > 59) return null;
  if (m[3] === "pm" && hour < 12) hour += 12;
  if (m[3] === "am" && hour === 12) hour = 0;
  return hour * 60 + min;
}

function hhmmToMin(hhmm) {
  const [h, m] = String(hhmm).split(":").map(Number);
  return h * 60 + m;
}

function minToHhmm(min) {
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
}

/** 14:30 -> "2:30 PM". Spoken aloud, so no 24-hour clock and no leading zero. */
export function spoken(hhmm) {
  const [h, m] = String(hhmm).split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${hour} ${suffix}` : `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
}

const WEEKDAYS = [
  "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** "2026-08-09" read aloud. Nobody says "twenty twenty six dash oh eight". */
export function spokenDate(date, today) {
  if (date === today) return "today";
  if (date === addDays(today, 1)) return "tomorrow";
  const d = new Date(`${date}T00:00:00Z`);
  const weekday = WEEKDAYS[d.getUTCDay()];
  // Inside a week, the weekday alone is unambiguous and sounds natural.
  for (let i = 2; i <= 6; i += 1) {
    if (date === addDays(today, i)) return weekday;
  }
  return `${weekday}, ${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

function listSpoken(items) {
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

/** Pick which slots to hand back. Truncating to the first N is wrong: a caller
 *  asking about 6 PM would be told about 7 AM. With a requested time, return
 *  what is nearest to it; without one, spread the sample across the day so the
 *  agent can offer a morning, an afternoon and an evening. */
export function selectSlots(slots, near, max) {
  if (slots.length <= max) return slots;
  if (near != null) {
    return slots
      .map((s) => ({ s, gap: Math.abs(hhmmToMin(s.start) - near) }))
      .sort((a, b) => a.gap - b.gap)
      .slice(0, max)
      .sort((a, b) => hhmmToMin(a.s.start) - hhmmToMin(b.s.start))
      .map((x) => x.s);
  }
  const step = (slots.length - 1) / (max - 1);
  return Array.from({ length: max }, (_, i) => slots[Math.round(i * step)]);
}

/** Turn slots into a sentence the agent can read almost verbatim. The agent is
 *  told to offer to text the booking link rather than claim to hold a court:
 *  we can see what is unbooked, which is not the same as what is bookable. */
export function availabilitySpeech(result, { date, today, near }) {
  const when = spokenDate(date, today);
  if (!result.slots.length) {
    return `I'm not seeing any ${result.duration_min} minute openings ${when === "today" || when === "tomorrow" ? when : `on ${when}`}.`;
  }
  const times = selectSlots(result.slots, near, 3).map((s) => spoken(s.start));
  const lead =
    when === "today" ? "Today" : when === "tomorrow" ? "Tomorrow" : `On ${when}`;

  // If they named a time and it is not free, say so before offering
  // alternatives. Otherwise "I have 4 PM and 8 PM" reads as a non sequitur to
  // someone who asked about 6.
  const asked = near != null && result.slots.some((s) => hhmmToMin(s.start) === near);
  if (near != null && !asked) {
    return `${spoken(minToHhmm(near))} is booked ${when === "today" || when === "tomorrow" ? when : `on ${when}`}, but I have ${listSpoken(times)} open for ${result.duration_min} minutes.`;
  }
  return `${lead} I have ${listSpoken(times)} open for ${result.duration_min} minutes.`;
}

export function scheduleSpeech(events, today) {
  if (!events.length) return "I don't have anything on the calendar for those days.";
  const lines = events.map((e) => {
    const price = e.price ? `, ${e.price}` : "";
    const left =
      e.capacity != null && e.signed_up != null
        ? Math.max(0, e.capacity - e.signed_up)
        : null;
    // Never announce "0 spots left" as though it were an offer, and never say
    // "1 spots".
    const spots =
      left == null ? "" : left === 0 ? ", which is full" : left === 1 ? ", 1 spot left" : `, ${left} spots left`;
    const when = spokenDate(e.date, today);
    return `${e.title} ${when === "today" || when === "tomorrow" ? when : `on ${when}`} at ${spoken(e.start_time)}${price}${spots}`;
  });
  return listSpoken(lines.slice(0, 3));
}

/**
 * @param {object} deps
 * @param {() => ({bookings: object[], ageMs: number, stale: boolean}|null)} deps.cachedBookings
 * @param {() => ({events: object[], ageMs: number, stale: boolean}|null)} deps.cachedEvents
 * @param {(bookings: object[], opts: object) => object} deps.computeAvailability
 * @param {string} deps.timezone
 */
export function createVoiceRouter({
  cachedBookings,
  cachedEvents,
  computeAvailability,
  timezone = "America/Los_Angeles",
}) {
  const router = express.Router();

  router.use("/api/voice", (req, res, next) => {
    if (!authorized(req)) {
      // Deliberately terse: an unauthenticated caller learns nothing about
      // whether the secret is unset or merely wrong.
      return res.status(401).json({ error: "Unauthorized." });
    }
    if (overLimit("voice")) {
      return res.status(429).json({ error: "Too many requests." });
    }
    next();
  });

  // Is a court free? Cache-only.
  router.post("/api/voice/availability", (req, res) => {
    const cache = cachedBookings();
    if (!cache) {
      return res.json({
        ok: false,
        reason: "no_fresh_data",
        speech:
          "I can't see the court calendar this second. I can take your number and have someone confirm, or you can book in the Playtomic app.",
      });
    }

    const today = nowLocal(timezone);
    const date = resolveDate(req.body?.date, today.date);
    if (!date) {
      return res.json({
        ok: false,
        reason: "unclear_date",
        speech: "Sorry, which day did you mean?",
      });
    }

    const requested = Number(req.body?.duration_min);
    const durationMin = [60, 90, 120].includes(requested) ? requested : 90;
    const near = resolveTime(req.body?.time);

    const result = computeAvailability(cache.bookings, {
      date,
      durationMin,
      nowDate: today.date,
      nowTime: today.time,
    });

    return res.json({
      ok: true,
      stale: cache.stale,
      date,
      duration_min: durationMin,
      courts_total: result.courts_total,
      slots: selectSlots(result.slots, near, LIMITS.maxSlotsReturned),
      any_available: result.slots.length > 0,
      speech: availabilitySpeech(result, { date, today: today.date, near }),
    });
  });

  // What is on: clinics, courses, tournaments, open matches. Cache-only.
  router.post("/api/voice/schedule", (req, res) => {
    const cache = cachedEvents();
    if (!cache) {
      return res.json({
        ok: false,
        reason: "no_fresh_data",
        speech:
          "I can't pull the class schedule right now. The full calendar is on foundrypadel.com.",
      });
    }

    const today = nowLocal(timezone);
    const from = resolveDate(req.body?.date, today.date) || today.date;
    const requestedDays = Number(req.body?.days);
    const days = Number.isFinite(requestedDays)
      ? Math.min(Math.max(1, requestedDays), LIMITS.maxDays)
      : 7;
    const to = addDays(from, days - 1);

    const wanted = String(req.body?.type || "").toUpperCase();
    const events = cache.events
      .filter((e) => e.date >= from && e.date <= to)
      .filter((e) => (wanted ? e.booking_type === wanted : true))
      .slice(0, LIMITS.maxEventsReturned);

    return res.json({
      ok: true,
      stale: cache.stale,
      from,
      to,
      count: events.length,
      events,
      speech: scheduleSpeech(events, today.date),
    });
  });

  return router;
}

export const __testables = {
  resolveDate,
  resolveTime,
  selectSlots,
  spoken,
  spokenDate,
  availabilitySpeech,
  scheduleSpeech,
  authorized,
  LIMITS,
};
