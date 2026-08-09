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
import { sanitize, normalizePhone } from "./notify.js";
import { linkSpeech, TEMPLATES, deepLinkFromEvent } from "./smslink.js";

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

// What each Playtomic booking type IS, in the words a caller uses. Without this
// the agent told a caller there were no tournaments on Wednesday while the
// Beginner/Intermediate Mexicano sat in the briefing: Playtomic files it as a
// TOURNAMENT but nothing in its title says so.
const EVENT_KIND = {
  TOURNAMENT: "Tournament",
  PUBLIC_CLASS: "Clinic",
  COURSE_CLASS: "Course",
  OPEN_MATCH: "Open match",
};

/** A tool template that did not get substituted, e.g. the literal string
 *  "{{input.date}}". Treated as absent rather than as a value: a misconfigured
 *  tool should fall back to a sensible default, not tell the caller we cannot
 *  understand them. This exact failure lost a real test call. */
export function unresolved(value) {
  return typeof value === "string" && value.includes("{{");
}

/** Speech-to-text hands us words, not ISO dates. Accept both, and refuse
 *  anything we cannot resolve rather than guessing at a date. */
export function resolveDate(input, today) {
  if (input == null || input === "" || unresolved(input)) return today;
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

/**
 * Pull a date and a time out of the sentence Bland sends.
 *
 * Bland passes `input` as ONE natural-language string, e.g. "check court
 * availability for tomorrow at 10 AM", no matter what input_schema declares.
 * Confirmed across three real calls: with a JSON Schema of typed properties on
 * the tool, `input` still arrived as a bare string and every {{input.date}} in
 * the body resolved to nothing. So the parsing happens here, where we control
 * it, rather than depending on a substitution that does not occur.
 */
export function parseWhen(text) {
  const raw = String(text || "").toLowerCase();
  let date = null;
  let time = null;

  if (/\btomorrow\b/.test(raw)) date = "tomorrow";
  else if (/\b(today|tonight|this evening|this afternoon|right now|now)\b/.test(raw)) date = "today";
  else {
    const iso = raw.match(/\b(\d{4}-\d{2}-\d{2})\b/);
    if (iso) date = iso[1];
    else {
      const day = raw.match(
        /\b(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/,
      );
      if (day) date = day[1];
    }
  }

  // "10 AM", "6pm", "6:30 pm", "18:00". Deliberately not bare digits: "4 players"
  // and "90 minutes" must not read as a time.
  const withMeridiem = raw.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/);
  if (withMeridiem) {
    time = `${withMeridiem[1]}${withMeridiem[2] ? `:${withMeridiem[2]}` : ""}${withMeridiem[3]}`;
  } else {
    const twentyFour = raw.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
    if (twentyFour) time = `${twentyFour[1]}:${twentyFour[2]}`;
  }

  return { date, time };
}

const STOPWORDS = new Set([
  "the", "a", "an", "on", "at", "for", "to", "me", "my", "i", "send", "text",
  "link", "please", "and", "of", "in", "it", "that", "this", "is", "was",
  "about", "asked", "asking", "one", "just", "we", "were", "talking",
]);

/**
 * Match what the caller was talking about against the week's events.
 *
 * The alternative was putting Playtomic UUIDs in the prompt so the agent could
 * quote one back. That is a lot of unreadable text for a voice model to carry
 * and get right. Matching here keeps ids out of the conversation entirely: the
 * agent says "the Wednesday Mexicano" and we find it.
 */
export function matchEvent(text, events, today) {
  const words = String(text || "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
  if (!words.length) return null;

  let best = null;
  for (const event of events) {
    const haystack = `${event.title} ${spokenDate(event.date, today)} ${event.booking_type}`.toLowerCase();
    let score = 0;
    for (const w of words) if (haystack.includes(w)) score += 1;
    if (!score) continue;
    // Prefer the soonest match, so "the Mexicano" means the next one.
    if (!best || score > best.score || (score === best.score && event.date < best.event.date)) {
      best = { event, score };
    }
  }
  // One incidental word in common is not a match. "tournament" alone should not
  // pick an arbitrary tournament.
  return best && best.score >= 2 ? best.event : null;
}

/** Which link the caller asked for, read out of the same sentence. */
export function templateFromText(text) {
  const raw = String(text || "").toLowerCase();
  if (/\bmember|join|membership\b/.test(raw)) return "membership";
  if (/\bdirection|address|where|find you|located\b/.test(raw)) return "directions";
  if (/\bbook|court|reserve|play\b/.test(raw)) return "booking";
  return null;
}

/** A callback number spoken inside the sentence, when no structured field came. */
export function phoneFromText(text) {
  const match = String(text || "").match(
    /(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/,
  );
  return match ? match[0] : null;
}

/** "18:00", "6pm", "6:30 pm" -> minutes from midnight, or null. */
export function resolveTime(input) {
  if (input == null || input === "" || unresolved(input)) return null;
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
  ensureWarm = null,
  computeAvailability,
  notifier = null,
  linkSender = null,
  timezone = "America/Los_Angeles",
}) {
  const router = express.Router();

  // Last few tool requests, in memory, readable over HTTP.
  //
  // Railway's log stream does not surface this process's stdout reliably, and
  // six test calls were spent inferring what Bland sends from call transcripts.
  // This answers it directly: whether the request arrives at all, whether the
  // bearer header survives Bland's tool layer, and which field carries what.
  const recent = [];

  router.get("/api/voice/_recent", (req, res) => {
    if (!authorized(req)) return res.status(401).json({ error: "Unauthorized." });
    res.json({ count: recent.length, requests: recent });
  });

  router.use("/api/voice", (req, res, next) => {
    // NOTE: inside router.use("/api/voice", ...) Express strips the mount
    // prefix, so req.path here is "/webhook", not "/api/voice/webhook".
    if (req.path === "/_recent") return next();
    // The webhook authenticates on a URL token instead: Bland cannot be told to
    // send a bearer header on post-call callbacks.
    if (req.path === "/webhook") return next();
    const entry = {
      at: new Date().toISOString(),
      path: req.path,
      auth: req.get("authorization") ? "present" : "MISSING",
      body: JSON.parse(JSON.stringify(req.body || {})),
    };
    recent.unshift(entry);
    recent.length = Math.min(recent.length, 20);
    console.log("[voice] %s auth=%s body=%s", req.path, entry.auth, JSON.stringify(entry.body).slice(0, 300));

    // Record what we answered, which is the other half of the picture.
    const send = res.json.bind(res);
    res.json = (payload) => {
      entry.answered = { ok: payload?.ok, reason: payload?.reason, speech: payload?.speech };
      return send(payload);
    };

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
  router.post("/api/voice/availability", async (req, res) => {
    // A cold process waits once, briefly, rather than telling every caller the
    // calendar is unavailable for the first few seconds after a deploy.
    let cache = cachedBookings();
    if (!cache && ensureWarm) {
      await ensureWarm();
      cache = cachedBookings();
    }
    if (!cache) {
      return res.json({
        ok: false,
        reason: "no_fresh_data",
        speech:
          "I can't see the court calendar this second. I can take your number and have someone confirm, or you can book in the Playtomic app.",
      });
    }

    const today = nowLocal(timezone);
    // Bland sends one natural-language string, so the structured fields are
    // usually absent. Prefer them when present, parse the sentence otherwise.
    // Any of these fields may contain the WHOLE sentence rather than a value,
    // because Bland substitutes {{input.date}} with all of `input`. So try the
    // field as a clean token first, then read the sentence.
    const rawDate = unresolved(req.body?.date) ? null : req.body?.date;
    const sentence = [req.body?.query, rawDate, req.body?.time]
      .filter((x) => x && !unresolved(x))
      .join(" ");
    const when = parseWhen(sentence);
    const date = resolveDate(rawDate, today.date) || resolveDate(when.date, today.date);
    if (!date) {
      return res.json({
        ok: false,
        reason: "unclear_date",
        speech: "Sorry, which day did you mean?",
      });
    }

    const requested = Number(req.body?.duration_min);
    const durationMin = [60, 90, 120].includes(requested) ? requested : 90;
    const rawTime = unresolved(req.body?.time) ? null : req.body?.time;
    const near = resolveTime(rawTime) ?? resolveTime(when.time);

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
  router.post("/api/voice/schedule", async (req, res) => {
    let cache = cachedEvents();
    if (!cache && ensureWarm) {
      await ensureWarm();
      cache = cachedEvents();
    }
    if (!cache) {
      return res.json({
        ok: false,
        reason: "no_fresh_data",
        speech:
          "I can't pull the class schedule right now. The full calendar is on foundrypadel.com.",
      });
    }

    const today = nowLocal(timezone);
    const rawDate = unresolved(req.body?.date) ? null : req.body?.date;
    const when = parseWhen([req.body?.query, rawDate].filter((x) => x && !unresolved(x)).join(" "));
    const from =
      resolveDate(rawDate, today.date) || resolveDate(when.date, today.date) || today.date;
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

  // Text the caller a link. Kumi does the sending; see server/smslink.js.
  router.post("/api/voice/sms-link", async (req, res) => {
    const given = unresolved(req.body?.template) ? "" : String(req.body?.template || "");
    const text = [req.body?.query, given].filter((x) => x && !unresolved(x)).join(" ");
    const template = TEMPLATES.has(given.trim().toLowerCase())
      ? given.trim().toLowerCase()
      : templateFromText(text) || "booking";
    if (!TEMPLATES.has(template)) {
      return res.json({
        ok: false,
        reason: "unknown_template",
        speech: "I'm not sure what to send you. I can send the booking link if that helps.",
      });
    }

    if (!linkSender?.configured()) {
      return res.json({
        ok: false,
        sent: false,
        reason: "not_configured",
        speech: linkSpeech(template, { sent: false, reason: "not_configured" }),
      });
    }

    // Bland knows the number the caller is on, but a caller can also give a different
    // one. Either way it has to be dialable before we hand it to Twilio.
    const rawPhone =
      normalizePhone(unresolved(req.body?.phone) ? null : req.body?.phone) ||
      phoneFromText([req.body?.query, req.body?.phone, req.body?.reason].filter((x) => x && !unresolved(x)).join(" "));
    // Fall back to the number they are calling from. Bland gives us the caller
    // id, so the agent never has to ask someone to read their own number back,
    // and a caller who offers none still leaves a callable message.
    const callerNumber = unresolved(req.body?.caller_number) ? null : req.body?.caller_number;
    const phone = normalizePhone(rawPhone) || normalizePhone(callerNumber);
    // Only push back when they actually tried to give a number. A field holding
    // a whole sentence is Bland's doing, not a caller misreading their digits.
    const phoneField = unresolved(req.body?.phone) ? null : req.body?.phone;
    const attempted = phoneField && /\d/.test(String(phoneField));
    if (attempted && !normalizePhone(rawPhone)) {
      return res.json({
        ok: false,
        sent: false,
        reason: "bad_phone",
        speech: "I didn't catch that number. Could you say it again, digit by digit?",
      });
    }

    // If they were just talking about a specific tournament or clinic, send THAT
    // rather than the club's front page.
    const today = nowLocal(timezone);
    const events = cachedEvents();
    const matched = events ? matchEvent(text, events.events, today.date) : null;
    const deep = matched ? deepLinkFromEvent(matched) : null;

    const result = await linkSender.sendLink({
      phone,
      template,
      deepLink: deep?.kind || null,
      itemId: deep?.id || null,
      label: matched
        ? `${matched.title}, ${spokenDate(matched.date, today.date)} at ${spoken(matched.start_time)}`
        : null,
      callId: unresolved(req.body?.call_id) ? "" : sanitize(req.body?.call_id, 80),
    });

    return res.json({
      ok: true,
      sent: result.sent,
      reason: result.reason,
      matched: matched ? matched.title : null,
      speech: result.sent && matched
        ? `Sent. That's the link straight to ${matched.title}.`
        : linkSpeech(template, result),
    });
  });

  /** A day's free time as merged windows, each naming the courts that are free
   *  for the whole window. Built from 30-minute probes and then merged, so
   *  "2:30 to 6 PM, Padel 1 and Padel 3" is one line rather than seven. */
  function freeWindows(bookings, date, today) {
    const result = computeAvailability(bookings, {
      date,
      durationMin: 30,
      nowDate: today.date,
      nowTime: today.time,
    });
    const windows = [];
    for (const slot of result.slots) {
      const key = slot.courts.join("|");
      const last = windows[windows.length - 1];
      if (last && last.key === key && last.end === slot.start) last.end = slot.end;
      else windows.push({ key, start: slot.start, end: slot.end, courts: slot.courts });
    }
    return windows;
  }

  // A briefing, fetched once at the start of every call.
  //
  // Bland's custom tools have never executed on this account: the model selects
  // them and plays their speech line, but no HTTP request ever arrives, with no
  // log or error on either side. dynamic_data is a different mechanism, run at
  // call start, and it injects plain variables into the prompt.
  //
  // The trade is honest and worth naming: this is a SNAPSHOT taken when the
  // phone was answered, not a live lookup, and it covers today and tomorrow
  // rather than any date. That is most of what callers ask, and a two-minute
  // -old answer beats "I can't check that from here".
  router.get("/api/voice/briefing", async (req, res) => {
    const today = nowLocal(timezone);
    const days = Math.min(Math.max(1, Number(req.query.days) || 7), 14);

    let bookings = cachedBookings();
    if (!bookings && ensureWarm) {
      await ensureWarm();
      bookings = cachedBookings();
    }
    const events = cachedEvents();

    const lines = [];
    if (!bookings) {
      lines.push("Court calendar unavailable.");
    } else {
      for (let i = 0; i < days; i += 1) {
        const date = addDays(today.date, i);
        const when = spokenDate(date, today.date);
        const windows = freeWindows(bookings.bookings, date, today);
        if (!windows.length) {
          lines.push(`${when}: fully booked.`);
          continue;
        }
        const parts = windows.map(
          (w) =>
            `${spoken(w.start)}-${spoken(w.end)} ${w.courts.length} free (${w.courts.join(", ")})`,
        );
        lines.push(`${when}: ${parts.join("; ")}`);
      }
    }

    const eventLines = !events
      ? ["Class schedule unavailable."]
      : events.events
          .filter((e) => e.date >= today.date && e.date <= addDays(today.date, days - 1))
          .map((e) => {
            const kind = EVENT_KIND[e.booking_type] || "Event";
            const where = e.courts?.length ? ` on ${e.courts.join(", ")}` : "";
            const price = e.price ? `, ${e.price}` : "";
            const left =
              e.capacity != null && e.signed_up != null
                ? `, ${e.signed_up} of ${e.capacity} signed up`
                : "";
            return `${spokenDate(e.date, today.date)} ${spoken(e.start_time)} [${kind}]: ${e.title}${price}${left}${where}`;
          });

    const courts = lines.join("\n");
    const whatsOn = eventLines.join("\n");

    // Everything here lands in the agent's prompt, and an oversized prompt on a
    // voice model costs latency and instruction-following. Say so rather than
    // letting it grow silently.
    const total = courts.length + whatsOn.length;
    if (total > 12000) {
      console.warn("[voice] briefing is %d chars, which is large for a prompt", total);
    }

    res.json({
      date: today.date,
      days,
      chars: total,
      courts_week: courts,
      whats_on: whatsOn,
    });
  });

  // Every finished call, posted to Slack.
  //
  // Bland's custom tools have never executed on this account, so take_message
  // never fires and the club sees nothing at all: a caller asked to be rung
  // back and it reached no one. This does not need tools. Bland POSTs the
  // transcript and summary when the call ends, and that is enough to put the
  // call in front of a human.
  //
  // Authenticated by a token in the URL rather than Bland's webhook signature,
  // because the signature secret is only obtainable by hand from their
  // dashboard and this needs no extra setup step to be safe.
  router.post("/api/voice/webhook", async (req, res) => {
    if (req.query?.token !== VOICE_TOOL_SECRET || !VOICE_TOOL_SECRET) {
      return res.status(401).json({ error: "Unauthorized." });
    }
    // Always 200 quickly. A webhook that errors gets retried, and a duplicate
    // Slack post is worse than a slow one.
    res.json({ ok: true });

    try {
      const body = req.body || {};
      const from = normalizePhone(body.from) || null;
      const summary = sanitize(body.summary, 600);
      const lines = (body.transcripts || [])
        .map((t) => `${t.user === "assistant" ? "Agent" : "Caller"}: ${sanitize(t.text, 200)}`)
        .filter((l) => l.length > 8);

      if (!notifier?.configured()) return;
      await notifier.notifyMessage({
        name: from ? `Caller ${from}` : "Caller",
        phone: from,
        reason: summary || lines.slice(0, 6).join(" / ") || "(no summary)",
        urgent: false,
        callSummary: true,
        durationMin: Number(body.call_length) || null,
        recordingUrl: body.recording_url || null,
        transcript: lines,
        callId: sanitize(body.call_id, 80),
        receivedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error("[voice] post-call webhook failed:", error.message);
    }
  });

  // Take a message. The only endpoint here that writes anything.
  router.post("/api/voice/message", async (req, res) => {
    if (!notifier?.configured()) {
      // No notifier means nobody would ever see this. Say so rather than
      // collecting a message into a void.
      return res.json({
        ok: false,
        reason: "not_configured",
        speech:
          "I can't take a message right now. Let me put you through to someone instead.",
      });
    }

    const reason =
      (unresolved(req.body?.reason) ? "" : sanitize(req.body?.reason, 500)) ||
      sanitize(req.body?.query, 500);
    if (!reason) {
      return res.json({
        ok: false,
        reason: "missing_reason",
        speech: "Sorry, what should I tell them it's about?",
      });
    }

    const rawPhone =
      normalizePhone(unresolved(req.body?.phone) ? null : req.body?.phone) ||
      phoneFromText([req.body?.query, req.body?.phone, req.body?.reason].filter((x) => x && !unresolved(x)).join(" "));
    // Fall back to the number they are calling from. Bland gives us the caller
    // id, so the agent never has to ask someone to read their own number back,
    // and a caller who offers none still leaves a callable message.
    const callerNumber = unresolved(req.body?.caller_number) ? null : req.body?.caller_number;
    const phone = normalizePhone(rawPhone) || normalizePhone(callerNumber);
    // Only push back when they actually tried to give a number. A field holding
    // a whole sentence is Bland's doing, not a caller misreading their digits.
    const phoneField = unresolved(req.body?.phone) ? null : req.body?.phone;
    const attempted = phoneField && /\d/.test(String(phoneField));
    if (attempted && !normalizePhone(rawPhone)) {
      return res.json({
        ok: false,
        reason: "bad_phone",
        speech: "I didn't catch that number. Could you say it again, digit by digit?",
      });
    }

    const { delivered } = await notifier.notifyMessage({
      name: unresolved(req.body?.name) ? "" : sanitize(req.body?.name, 80),
      phone,
      reason,
      // The agent decides this from the call: injury, someone locked out, a
      // caller already standing at the door, or plain distress.
      urgent: req.body?.urgent === true || req.body?.urgent === "true",
      // Taken on the way to a human rather than instead of one. A failed
      // transfer cannot come back to the agent, so the caller would otherwise
      // land in a personal voicemail and this would never reach Slack.
      transferring: req.body?.transferring === true || req.body?.transferring === "true",
      callId: unresolved(req.body?.call_id) ? "" : sanitize(req.body?.call_id, 80),
      receivedAt: new Date().toISOString(),
    });

    if (!delivered) {
      // Never promise a callback we could not record. Offer the transfer.
      return res.json({
        ok: false,
        reason: "not_delivered",
        speech:
          "I'm having trouble getting that through to the team. Let me put you through to someone instead.",
      });
    }

    return res.json({
      ok: true,
      speech: (req.body?.transferring === true || req.body?.transferring === "true")
        ? "Got it, let me put you through now."
        : "Got it. I've passed that on and someone will get back to you.",
    });
  });

  return router;
}

export const __testables = {
  unresolved,
  matchEvent,
  parseWhen,
  templateFromText,
  phoneFromText,
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
