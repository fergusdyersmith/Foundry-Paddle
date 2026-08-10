/** @vitest-environment node */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import express from "express";

const TZ = "America/Los_Angeles";
const SECRET = "voice-secret-value";

// One court booked solid, one court wide open, so every assertion below can
// distinguish "free somewhere" from "free everywhere".
const COURT_A = "aaaaaaaa-0000-0000-0000-000000000001";
const COURT_B = "bbbbbbbb-0000-0000-0000-000000000002";

// 18:00Z == 11:00 in America/Los_Angeles during PDT.
function booking(resource_id, resource_name, startUtc, endUtc, extra = {}) {
  return {
    booking_id: `${resource_id}-${startUtc}`,
    resource_id,
    resource_name,
    booking_start_date: startUtc,
    booking_end_date: endUtc,
    booking_type: "REGULAR_BOOKING",
    is_canceled: false,
    ...extra,
  };
}

async function boot({
  bookings = [],
  events = [],
  secret = SECRET,
  ageMs = 0,
  notifier = undefined,
  linkSender = undefined,
  ensureWarm = undefined,
} = {}) {
  vi.resetModules();
  if (secret === null) delete process.env.VOICE_TOOL_SECRET;
  else process.env.VOICE_TOOL_SECRET = secret;

  const voice = await import("./voice.js");
  const server = await import("../server.js");

  const app = express();
  app.use(express.json());
  app.use(
    voice.createVoiceRouter({
      cachedBookings: () =>
        bookings === null ? null : { bookings, ageMs, stale: ageMs > 5 * 60 * 1000 },
      cachedEvents: () =>
        events === null ? null : { events, ageMs, stale: ageMs > 5 * 60 * 1000 },
      ensureWarm,
      playtomicTenantId: "tenant-uuid-for-tests",
      computeAvailability: server.__testables.computeAvailability,
      notifier:
        notifier === undefined
          ? { configured: () => true, notifyMessage: async () => ({ delivered: true, channel: "slack" }) }
          : notifier,
      linkSender:
        linkSender === undefined
          ? { configured: () => true, sendLink: async () => ({ sent: true, reason: null }) }
          : linkSender,
      timezone: TZ,
    }),
  );

  const listener = app.listen(0);
  await new Promise((r) => listener.once("listening", r));
  const base = `http://127.0.0.1:${listener.address().port}`;
  return { base, voice, server, close: () => new Promise((r) => listener.close(r)) };
}

function post(base, path, body, token = SECRET) {
  return fetch(`${base}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body ?? {}),
  });
}

let ctx;
afterEach(async () => {
  await ctx?.close();
  ctx = null;
});

describe("who may call the tool endpoints", () => {
  it("refuses a request with no token", async () => {
    ctx = await boot();
    const res = await post(ctx.base, "/api/voice/availability", {}, null);
    expect(res.status).toBe(401);
  });

  it("refuses a wrong token", async () => {
    ctx = await boot();
    const res = await post(ctx.base, "/api/voice/availability", {}, "not-the-secret");
    expect(res.status).toBe(401);
  });

  it("fails closed when no secret is configured, rather than opening up", async () => {
    ctx = await boot({ secret: null });
    const res = await post(ctx.base, "/api/voice/availability", {}, null);
    expect(res.status).toBe(401);
  });

  it("accepts the configured token", async () => {
    ctx = await boot();
    const res = await post(ctx.base, "/api/voice/availability", {});
    expect(res.status).toBe(200);
  });
});

describe("a cold cache waits once, briefly, before giving up", () => {
  it("warms on demand rather than failing the first caller after a deploy", async () => {
    // A Railway restart empties the cache. A real test call landed in that
    // window and was told the calendar was unavailable.
    let warmed = false;
    const warmBooking = booking(COURT_A, "Padel 1", "2026-08-13T18:00:00", "2026-08-13T19:00:00");
    ctx = await boot({
      bookings: null,
      ensureWarm: async () => {
        warmed = true;
        return true;
      },
    });
    const res = await post(ctx.base, "/api/voice/availability", { date: "2026-08-13" });
    expect(warmed).toBe(true);
    expect(res.status).toBe(200);
    expect(warmBooking).toBeTruthy();
  });

  it("still degrades honestly when the warm-up cannot deliver", async () => {
    ctx = await boot({ bookings: null, ensureWarm: async () => false });
    const body = await (await post(ctx.base, "/api/voice/availability", {})).json();
    expect(body.ok).toBe(false);
    expect(body.reason).toBe("no_fresh_data");
  });
});

describe("a cold cache degrades instead of blocking the call", () => {
  it("says so plainly when there are no fresh bookings", async () => {
    ctx = await boot({ bookings: null });
    const body = await (await post(ctx.base, "/api/voice/availability", {})).json();
    expect(body.ok).toBe(false);
    expect(body.reason).toBe("no_fresh_data");
    // The caller must be offered a way forward, not just a failure.
    expect(body.speech).toMatch(/take your number|Playtomic/i);
  });

  it("says so plainly when there is no fresh schedule", async () => {
    ctx = await boot({ events: null });
    const body = await (await post(ctx.base, "/api/voice/schedule", {})).json();
    expect(body.ok).toBe(false);
    expect(body.reason).toBe("no_fresh_data");
  });
});

describe("availability", () => {
  it("never returns member names or emails from a booking row", async () => {
    ctx = await boot({
      bookings: [
        booking(COURT_A, "Padel 1", "2026-08-13T18:00:00", "2026-08-13T20:00:00", {
          participant_info: {
            participants: [{ name: "Emily L", email: "ms.e.luis@gmail.com" }],
          },
        }),
      ],
    });
    const res = await post(ctx.base, "/api/voice/availability", { date: "2026-08-13" });
    const raw = await res.text();
    expect(raw).not.toMatch(/Emily L|gmail\.com|participant/i);
  });

  it("counts a court busy only while it is actually booked", async () => {
    ctx = await boot({
      bookings: [
        // Court A booked 11:00-13:00 local. Court B never booked.
        booking(COURT_A, "Padel 1", "2026-08-13T18:00:00", "2026-08-13T20:00:00"),
        booking(COURT_B, "Padel 2", "2026-08-13T15:00:00", "2026-08-13T16:00:00"),
      ],
    });
    const body = await (
      await post(ctx.base, "/api/voice/availability", {
        date: "2026-08-13",
        time: "11:00",
        duration_min: 60,
      })
    ).json();

    const at1100 = body.slots.find((s) => s.start === "11:00");
    // Court A is busy at 11:00, court B is free, so exactly one court.
    expect(at1100.courts_free).toBe(1);
    // The club calls them Court 1..4; Playtomic names them "Padel 1"..
    expect(at1100.courts).toEqual(["Court 2"]);
  });

  it("keys courts by id, so a trailing space does not invent a fifth court", async () => {
    // Playtomic really does return court 4 as "Padel 4 ".
    ctx = await boot({
      bookings: [
        booking(COURT_A, "Padel 4 ", "2026-08-13T18:00:00", "2026-08-13T19:00:00"),
        booking(COURT_A, "Padel 4", "2026-08-13T20:00:00", "2026-08-13T21:00:00"),
      ],
    });
    const body = await (
      await post(ctx.base, "/api/voice/availability", { date: "2026-08-13" })
    ).json();
    expect(body.courts_total).toBe(1);
  });

  it("offers nothing when every court is booked solid", async () => {
    const solid = [];
    for (const id of [COURT_A, COURT_B]) {
      // 07:00 to 22:00 local == 14:00Z to 05:00Z next day.
      solid.push(booking(id, id, "2026-08-13T14:00:00", "2026-08-14T05:00:00"));
    }
    ctx = await boot({ bookings: solid });
    const body = await (
      await post(ctx.base, "/api/voice/availability", { date: "2026-08-13" })
    ).json();
    expect(body.any_available).toBe(false);
    expect(body.speech).toMatch(/not seeing any/i);
  });

  it("says the requested time is booked before offering alternatives", async () => {
    ctx = await boot({
      bookings: [
        // Court A booked 18:00-20:00 local (01:00-03:00Z next day). Only court.
        booking(COURT_A, "Padel 1", "2026-08-14T01:00:00", "2026-08-14T03:00:00"),
      ],
    });
    const body = await (
      await post(ctx.base, "/api/voice/availability", {
        date: "2026-08-13",
        time: "6pm",
        duration_min: 90,
      })
    ).json();
    // Offering "4 PM and 8 PM" to someone who asked about 6 is a non sequitur.
    expect(body.speech).toMatch(/6 PM is booked/);
  });

  it("clamps a silly duration to a real session length", async () => {
    ctx = await boot({ bookings: [booking(COURT_A, "Padel 1", "2026-08-13T18:00:00", "2026-08-13T19:00:00")] });
    const body = await (
      await post(ctx.base, "/api/voice/availability", {
        date: "2026-08-13",
        duration_min: 999,
      })
    ).json();
    expect(body.duration_min).toBe(90);
  });

  it("falls back to today when it cannot pin a day, and names the day it used", async () => {
    // Bland substitutes {{input.date}} with the whole sentence, so refusing
    // anything unparseable meant refusing every real call. Assuming today is
    // safe BECAUSE the reply always names the day, so the caller can correct it.
    ctx = await boot({ bookings: [booking(COURT_A, "Padel 1", "2026-08-13T18:00:00", "2026-08-13T19:00:00")] });
    const body = await (
      await post(ctx.base, "/api/voice/availability", { date: "sometime next month" })
    ).json();
    expect(body.ok).toBe(true);
    expect(body.speech).toMatch(/today|tomorrow|on /i);
  });
});

describe("texting the caller a link", () => {
  it("normalizes the number before handing it to Kumi", async () => {
    const sendLink = vi.fn(async () => ({ sent: true, reason: null }));
    ctx = await boot({ linkSender: { configured: () => true, sendLink } });

    const body = await (
      await post(ctx.base, "/api/voice/sms-link", {
        phone: "541 270 4585",
        template: "booking",
        call_id: "call_9",
      })
    ).json();

    expect(body.sent).toBe(true);
    expect(sendLink).toHaveBeenCalledWith(
      expect.objectContaining({
        phone: "+15412704585",
        template: "booking",
        callId: "call_9",
      }),
    );
  });

  it("sends a link straight to the clinic they named", async () => {
    // The server has always been able to deep-link a specific event, but the
    // tool schema had no field for saying which one. A caller asked for "the
    // link to that clinic tomorrow" and the agent went silent for twenty four
    // seconds, having been asked for something it could not express.
    const sendLink = vi.fn(async () => ({ sent: true, reason: null }));
    ctx = await boot({
      linkSender: { configured: () => true, sendLink },
      events: [
        {
          title: "Midweek Morning Clinic: Tactics + Technique",
          date: "2026-08-11",
          start_time: "10:00",
          booking_type: "CLINIC",
          id: "evt-mid",
        },
      ],
    });

    await post(ctx.base, "/api/voice/sms-link", {
      template: "booking",
      query: "the Midweek Morning Clinic tomorrow",
      phone: "+15412704585",
      call_id: "call_deep",
    });

    expect(sendLink).toHaveBeenCalledWith(
      expect.objectContaining({ label: expect.stringContaining("Midweek Morning Clinic") }),
    );
  });

  it("does not claim a text went out when it did not", async () => {
    ctx = await boot({
      linkSender: {
        configured: () => true,
        sendLink: async () => ({ sent: false, reason: "unreachable" }),
      },
    });
    const body = await (
      await post(ctx.base, "/api/voice/sms-link", { phone: "+15412704585" })
    ).json();

    expect(body.sent).toBe(false);
    expect(body.speech).not.toMatch(/\bSent\b/i);
    // The caller still has to leave the call able to book.
    expect(body.speech).toMatch(/foundry padel dot com/);
  });

  it("falls back to the booking link rather than refusing an odd template", async () => {
    // The template field often carries a sentence, not one of our three words.
    ctx = await boot();
    const body = await (
      await post(ctx.base, "/api/voice/sms-link", {
        template: "send them the thing for booking a court",
        phone: "+15412704585",
      })
    ).json();
    expect(body.sent).toBe(true);
  });

  it("asks the caller to repeat a number it could not parse", async () => {
    ctx = await boot();
    const body = await (
      await post(ctx.base, "/api/voice/sms-link", { phone: "5551" })
    ).json();
    expect(body.reason).toBe("bad_phone");
  });

  it("requires auth like every other tool endpoint", async () => {
    ctx = await boot();
    const res = await post(ctx.base, "/api/voice/sms-link", { phone: "+15412704585" }, null);
    expect(res.status).toBe(401);
  });
});

describe("taking a message", () => {
  it("passes the caller's details through to the notifier", async () => {
    const notifyMessage = vi.fn(async () => ({ delivered: true, channel: "slack" }));
    ctx = await boot({ notifier: { configured: () => true, notifyMessage } });

    const body = await (
      await post(ctx.base, "/api/voice/message", {
        name: "Dana Whitfield",
        phone: "+1 541 270 4585",
        reason: "Wants to book a court for four on Saturday",
        urgent: false,
        call_id: "call_abc",
      })
    ).json();

    expect(body.ok).toBe(true);
    expect(notifyMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Dana Whitfield",
        phone: "+15412704585",
        urgent: false,
        callId: "call_abc",
      }),
    );
  });

  it("does NOT promise a callback when delivery failed", async () => {
    // The one failure that actually damages the club: telling someone they will
    // be rung back when nothing was recorded anywhere a human sees.
    ctx = await boot({
      notifier: {
        configured: () => true,
        notifyMessage: async () => ({ delivered: false, channel: null }),
      },
    });
    const body = await (
      await post(ctx.base, "/api/voice/message", { reason: "Please call me back" })
    ).json();

    expect(body.ok).toBe(false);
    expect(body.speech).not.toMatch(/will get back|passed that on/i);
    expect(body.speech).toMatch(/put you through/i);
  });

  it("refuses to collect into a void when no notifier is configured", async () => {
    ctx = await boot({
      notifier: { configured: () => false, notifyMessage: async () => ({ delivered: false }) },
    });
    const body = await (
      await post(ctx.base, "/api/voice/message", { reason: "Please call me back" })
    ).json();
    expect(body.ok).toBe(false);
    expect(body.reason).toBe("not_configured");
  });

  it("asks again rather than recording a message with no reason", async () => {
    ctx = await boot();
    const body = await (await post(ctx.base, "/api/voice/message", { name: "Dana" })).json();
    expect(body.ok).toBe(false);
    expect(body.reason).toBe("missing_reason");
  });

  it("asks the caller to repeat a number it could not parse", async () => {
    ctx = await boot();
    const body = await (
      await post(ctx.base, "/api/voice/message", {
        reason: "call me back",
        phone: "5551",
      })
    ).json();
    expect(body.ok).toBe(false);
    expect(body.reason).toBe("bad_phone");
    expect(body.speech).toMatch(/digit by digit/i);
  });

  it("still takes the message when the caller leaves no number", async () => {
    // Bland knows the number they called from; a caller declining to repeat it
    // is not a reason to drop the message.
    ctx = await boot();
    const body = await (
      await post(ctx.base, "/api/voice/message", { reason: "Asking about memberships" })
    ).json();
    expect(body.ok).toBe(true);
  });

  it("requires auth like every other tool endpoint", async () => {
    ctx = await boot();
    const res = await post(ctx.base, "/api/voice/message", { reason: "x" }, null);
    expect(res.status).toBe(401);
  });
});

describe("the availability maths", () => {
  let T;
  beforeEach(async () => {
    vi.resetModules();
    ({ __testables: T } = await import("../server.js"));
  });

  it("merges overlapping bookings rather than double-counting them", () => {
    expect(T.mergeIntervals([[540, 600], [570, 660], [700, 720]])).toEqual([
      [540, 660],
      [700, 720],
    ]);
  });

  it("returns the gaps between bookings", () => {
    expect(T.freeIntervals([[600, 660]], 540, 720)).toEqual([
      [540, 600],
      [660, 720],
    ]);
  });

  it("returns the whole day when nothing is booked", () => {
    expect(T.freeIntervals([], 540, 720)).toEqual([[540, 720]]);
  });

  it("returns nothing when a booking covers the whole window", () => {
    expect(T.freeIntervals([[500, 800]], 540, 720)).toEqual([]);
  });

  it("widens the grid past the advertised opening hour for an early booking", () => {
    // A 06:30 private lesson is normal here, and the site advertises 7AM. If we
    // clamped to the marketing hours we would hide real court time.
    const result = T.computeAvailability(
      [booking(COURT_A, "Padel 1", "2026-08-13T13:30:00", "2026-08-13T14:30:00")],
      { date: "2026-08-13", durationMin: 60 },
    );
    expect(result.opens).toBe("06:30");
  });

  it("hides slots that have already passed today", () => {
    const result = T.computeAvailability([booking(COURT_A, "Padel 1", "2026-08-13T18:00:00", "2026-08-13T19:00:00")], {
      date: "2026-08-13",
      durationMin: 60,
      nowDate: "2026-08-13",
      nowTime: "15:00",
    });
    expect(result.slots.every((s) => s.start >= "15:00")).toBe(true);
  });

  it("still offers the full day for a future date", () => {
    const result = T.computeAvailability([booking(COURT_A, "Padel 1", "2026-08-14T18:00:00", "2026-08-14T19:00:00")], {
      date: "2026-08-14",
      durationMin: 60,
      nowDate: "2026-08-13",
      nowTime: "15:00",
    });
    expect(result.slots[0].start).toBe("07:00");
  });
});

describe("turning data into something speakable", () => {
  let V;
  beforeEach(async () => {
    vi.resetModules();
    V = (await import("./voice.js")).__testables;
  });

  it.each([
    ["09:00", "9 AM"],
    ["12:00", "12 PM"],
    ["13:30", "1:30 PM"],
    ["00:00", "12 AM"],
    ["18:00", "6 PM"],
  ])("speaks %s as %s", (input, expected) => {
    expect(V.spoken(input)).toBe(expected);
  });

  it.each([
    ["6pm", 18 * 60],
    ["6:30 pm", 18 * 60 + 30],
    ["18:00", 18 * 60],
    ["9am", 9 * 60],
    ["12am", 0],
    ["12pm", 12 * 60],
  ])("understands %s", (input, expected) => {
    expect(V.resolveTime(input)).toBe(expected);
  });

  it("refuses a time it cannot parse", () => {
    expect(V.resolveTime("sometime after work")).toBeNull();
  });

  it.each([
    ["check court availability for tomorrow at 10 AM", "tomorrow", "10am"],
    ["is anything free tonight", "today", null],
    ["do you have a court at 6pm on Friday", "friday", "6pm"],
    ["what's open right now", "today", null],
    ["anything at 18:00 tomorrow", "tomorrow", "18:00"],
    ["availability on 2026-08-20", "2026-08-20", null],
  ])("reads %s as date=%s time=%s", (sentence, date, time) => {
    // Bland sends ONE natural-language string, whatever input_schema declares.
    // Three real calls failed on this before it was parsed here.
    expect(V.parseWhen(sentence)).toEqual({ date, time });
  });

  it("does not mistake a player count or a duration for a time", () => {
    expect(V.parseWhen("a court for 4 players for 90 minutes").time).toBeNull();
  });

  it("picks the right link out of the sentence", () => {
    expect(V.templateFromText("text me the booking link")).toBe("booking");
    expect(V.templateFromText("send me membership info")).toBe("membership");
    expect(V.templateFromText("what's your address")).toBe("directions");
  });

  it("recovers a callback number spoken inside the sentence", () => {
    expect(V.phoneFromText("take a message, call me on 541 270 4585")).toBe("541 270 4585");
    expect(V.phoneFromText("no number here")).toBeNull();
  });

  it("treats an unsubstituted tool template as absent, not as a value", () => {
    // A real test call was lost to this: Bland sent the literal "{{input.date}}"
    // and the endpoint refused it as an unparseable date, so the agent told the
    // caller it had no live availability. A misconfigured tool should fall back
    // to a sensible default, not accuse the caller of being unclear.
    expect(V.resolveDate("{{input.date}}", "2026-08-13")).toBe("2026-08-13");
    expect(V.resolveTime("{{input.time}}")).toBeNull();
    expect(V.unresolved("{{input.phone}}")).toBe(true);
    expect(V.unresolved("6pm")).toBe(false);
  });

  it("returns slots near the time asked for, not merely the earliest ones", () => {
    // The caller asked about 6 PM. Offering them 7 AM is a useless answer.
    // 07:00 through 21:30 on a 30-minute grid, as a real day looks.
    const slots = Array.from({ length: 30 }, (_, i) => ({
      start: `${String(7 + Math.floor(i / 2)).padStart(2, "0")}:${i % 2 ? "30" : "00"}`,
    }));
    const picked = V.selectSlots(slots, 18 * 60, 3);
    expect(picked.map((s) => s.start)).toEqual(["17:30", "18:00", "18:30"]);
  });

  it("spreads the sample across the day when no time was asked for", () => {
    const slots = Array.from({ length: 20 }, (_, i) => ({ start: `slot${i}` }));
    const picked = V.selectSlots(slots, null, 3);
    expect(picked.map((s) => s.start)).toEqual(["slot0", "slot10", "slot19"]);
  });

  it.each([
    ["today", "2026-08-13"],
    ["tonight", "2026-08-13"],
    ["tomorrow", "2026-08-14"],
    ["2026-09-01", "2026-09-01"],
  ])("resolves %s", (input, expected) => {
    expect(V.resolveDate(input, "2026-08-13")).toBe(expected);
  });

  it("reads a weekday as the NEXT one, never today", () => {
    // 2026-08-13 is a Thursday. A caller saying "Thursday" on Thursday means
    // next week, not the day they are standing in.
    expect(V.resolveDate("thursday", "2026-08-13")).toBe("2026-08-20");
    expect(V.resolveDate("friday", "2026-08-13")).toBe("2026-08-14");
  });

  it("never uses an em dash, because the agent reads this aloud", () => {
    const speech = V.scheduleSpeech(
      [{ title: "Beginner Clinic", date: "2026-08-14", start_time: "18:00", price: "$25", capacity: 8, signed_up: 6 }],
      "2026-08-13",
    );
    expect(speech).not.toMatch(/—/);
    expect(speech).toMatch(/2 spots left/);
  });

  it("calls a full class full, instead of offering zero spots", () => {
    const speech = V.scheduleSpeech(
      [{ title: "Beginner Tournament", date: "2026-08-14", start_time: "11:00", price: "$15", capacity: 16, signed_up: 16 }],
      "2026-08-13",
    );
    expect(speech).toMatch(/which is full/);
    expect(speech).not.toMatch(/0 spots/);
  });

  it("says 1 spot, not 1 spots", () => {
    const speech = V.scheduleSpeech(
      [{ title: "Padel Progression", date: "2026-08-14", start_time: "10:00", capacity: 4, signed_up: 3 }],
      "2026-08-13",
    );
    expect(speech).toMatch(/1 spot left/);
    expect(speech).not.toMatch(/1 spots/);
  });

  it.each([
    ["2026-08-13", "today"],
    ["2026-08-14", "tomorrow"],
    ["2026-08-16", "Sunday"],
    ["2026-08-24", "Monday, August 24"],
  ])("reads the date %s aloud as %s", (date, expected) => {
    // Nobody says "twenty twenty six dash oh eight dash sixteen".
    expect(V.spokenDate(date, "2026-08-13")).toBe(expected);
  });
});

describe("finding the event a caller was talking about", () => {
  let V;
  beforeEach(async () => {
    vi.resetModules();
    V = (await import("./voice.js")).__testables;
  });

  const events = [
    { title: "Beginner/Intermediate Mexicano", date: "2026-08-12", start_time: "18:00", booking_type: "TOURNAMENT" },
    { title: "Advanced Tournament", date: "2026-08-11", start_time: "18:00", booking_type: "TOURNAMENT" },
    { title: "Intermediate+ Strategy and Tactics", date: "2026-08-12", start_time: "20:00", booking_type: "PUBLIC_CLASS" },
  ];

  it("matches the thing by name", () => {
    // Keeps Playtomic UUIDs out of the prompt entirely: the agent says what it
    // was discussing and we resolve the id here.
    expect(V.matchEvent("send me the link for the Mexicano on Wednesday", events, "2026-08-09").title)
      .toBe("Beginner/Intermediate Mexicano");
  });

  it("matches on the strategy clinic", () => {
    expect(V.matchEvent("text me the strategy and tactics clinic", events, "2026-08-09").title)
      .toBe("Intermediate+ Strategy and Tactics");
  });

  it("does not pick an arbitrary event off one common word", () => {
    // "tournament" alone must not resolve to whichever tournament sorts first.
    expect(V.matchEvent("tournament", events, "2026-08-09")).toBeNull();
  });

  it("returns nothing when they just want the booking link", () => {
    expect(V.matchEvent("send me the booking link", events, "2026-08-09")).toBeNull();
  });
});

describe("we already know the caller's number", () => {
  it("uses the number they are calling from when they give none", async () => {
    // Bland hands us the caller id. Asking a caller to read their own number
    // back is the tell that they are talking to a machine.
    const sendLink = vi.fn(async () => ({ sent: true, reason: null }));
    ctx = await boot({ linkSender: { configured: () => true, sendLink } });
    await post(ctx.base, "/api/voice/sms-link", {
      query: "text me the booking link",
      caller_number: "+19717707851",
    });
    expect(sendLink).toHaveBeenCalledWith(
      expect.objectContaining({ phone: "+19717707851" }),
    );
  });

  it("prefers a different number when the caller asks for one", async () => {
    const sendLink = vi.fn(async () => ({ sent: true, reason: null }));
    ctx = await boot({ linkSender: { configured: () => true, sendLink } });
    await post(ctx.base, "/api/voice/sms-link", {
      phone: "541 270 4585",
      caller_number: "+19717707851",
    });
    expect(sendLink).toHaveBeenCalledWith(
      expect.objectContaining({ phone: "+15412704585" }),
    );
  });

  it("puts the caller id on a message when they leave no number", async () => {
    const notifyMessage = vi.fn(async () => ({ delivered: true, channel: "slack" }));
    ctx = await boot({ notifier: { configured: () => true, notifyMessage } });
    await post(ctx.base, "/api/voice/message", {
      reason: "Wants to talk about corporate membership",
      caller_number: "+19717707851",
    });
    expect(notifyMessage).toHaveBeenCalledWith(
      expect.objectContaining({ phone: "+19717707851" }),
    );
  });

  it("still asks again when they read out a number that cannot dial", async () => {
    ctx = await boot();
    const body = await (
      await post(ctx.base, "/api/voice/message", {
        reason: "call me back",
        phone: "5551",
        caller_number: "+19717707851",
      })
    ).json();
    expect(body.reason).toBe("bad_phone");
  });
});

describe("the post-call webhook, which does not need tools", () => {
  it("refuses a request without the token", async () => {
    ctx = await boot();
    const res = await fetch(`${ctx.base}/api/voice/webhook`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ call_id: "x" }),
    });
    expect(res.status).toBe(401);
  });

  it("posts a finished call to Slack with the summary and transcript", async () => {
    // Bland's custom tools have never executed here, so take_message never
    // fires. Without this, a caller asks to be rung back and nobody ever knows.
    const notifyMessage = vi.fn(async () => ({ delivered: true, channel: "slack" }));
    ctx = await boot({ notifier: { configured: () => true, notifyMessage } });

    const res = await fetch(`${ctx.base}/api/voice/webhook?token=${SECRET}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        call_id: "call_abc",
        from: "9717707851",
        call_length: 2.2,
        summary: "Wanted the link for Wednesday's Mexicano.",
        recording_url: "https://api.bland.ai/v1/recordings/abc",
        transcripts: [
          { user: "user", text: "Looking to book a court next Wednesday" },
          { user: "assistant", text: "Wednesday evening is pretty open" },
        ],
      }),
    });
    expect(res.status).toBe(200);
    await new Promise((r) => setTimeout(r, 30));

    expect(notifyMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        phone: "+19717707851",
        callSummary: true,
        recordingUrl: "https://api.bland.ai/v1/recordings/abc",
      }),
    );
  });

  it("answers 200 before doing the work, so Bland does not retry", async () => {
    // A retried webhook means a duplicate Slack post, which is worse than a
    // slow one.
    ctx = await boot({
      notifier: {
        configured: () => true,
        notifyMessage: async () => {
          throw new Error("slack is down");
        },
      },
    });
    const res = await fetch(`${ctx.base}/api/voice/webhook?token=${SECRET}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ call_id: "x", summary: "s" }),
    });
    expect(res.status).toBe(200);
  });
});

describe("keeping the promise the agent made on the call", () => {
  let V;
  beforeEach(async () => {
    vi.resetModules();
    V = (await import("./voice.js")).__testables;
  });

  it.each([
    ["Agent: I'll text that over to you as soon as we hang up."],
    ["Agent: I'll send you the link for the Open Match on Wednesday."],
    ["Agent: Texting that to you now."],
  ])("spots the promise in %s", (line) => {
    expect(V.promisedText([line])).toBe(true);
  });

  it("does not fire on a caller saying it", () => {
    // Only what the AGENT committed to counts. A caller saying "text me" that
    // the agent never agreed to is not a promise to keep.
    expect(V.promisedText(["Caller: can you text me the link?"])).toBe(false);
  });

  it("does not fire on an ordinary call", () => {
    expect(
      V.promisedText(["Agent: We're open seven to ten every day.", "Caller: great"]),
    ).toBe(false);
  });
});

describe("the post-call text, since Bland's tools never execute", () => {
  it("sends the link the agent promised, to the number they called from", async () => {
    // Confirmed by Bland's own server-side inspection: no tool definition is
    // ever injected into the inference context, so text_caller_link cannot
    // fire. The webhook has the transcript and the caller id, which is all it
    // takes to keep the promise ourselves.
    const sendLink = vi.fn(async () => ({ sent: true, reason: null }));
    const notifyMessage = vi.fn(async () => ({ delivered: true, channel: "slack" }));
    ctx = await boot({
      linkSender: { configured: () => true, sendLink },
      notifier: { configured: () => true, notifyMessage },
    });

    await fetch(`${ctx.base}/api/voice/webhook?token=${SECRET}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        call_id: "call_x",
        from: "9717707851",
        summary: "Wanted the booking link.",
        transcripts: [
          { user: "user", text: "Send me the link" },
          { user: "assistant", text: "I'll text that over to you as soon as we hang up." },
        ],
      }),
    });
    await new Promise((r) => setTimeout(r, 40));

    expect(sendLink).toHaveBeenCalledWith(
      expect.objectContaining({ phone: "+19717707851" }),
    );
    // Slack says whether it actually went, so a silent failure is visible.
    expect(notifyMessage).toHaveBeenCalledWith(
      expect.objectContaining({ texted: expect.stringContaining("Texted") }),
    );
  });

  it("says so in Slack when the promised text could NOT be sent", async () => {
    const notifyMessage = vi.fn(async () => ({ delivered: true, channel: "slack" }));
    ctx = await boot({
      linkSender: { configured: () => true, sendLink: async () => ({ sent: false, reason: "cooldown" }) },
      notifier: { configured: () => true, notifyMessage },
    });
    await fetch(`${ctx.base}/api/voice/webhook?token=${SECRET}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        call_id: "call_y", from: "9717707851",
        transcripts: [{ user: "assistant", text: "I'll text that over." }],
      }),
    });
    await new Promise((r) => setTimeout(r, 40));
    expect(notifyMessage).toHaveBeenCalledWith(
      expect.objectContaining({ texted: expect.stringContaining("Could NOT") }),
    );
  });

  it("texts nobody when the agent never promised one", async () => {
    const sendLink = vi.fn(async () => ({ sent: true, reason: null }));
    ctx = await boot({
      linkSender: { configured: () => true, sendLink },
      notifier: { configured: () => true, notifyMessage: async () => ({ delivered: true }) },
    });
    await fetch(`${ctx.base}/api/voice/webhook?token=${SECRET}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        call_id: "call_z", from: "9717707851",
        transcripts: [{ user: "assistant", text: "We're open seven to ten every day." }],
      }),
    });
    await new Promise((r) => setTimeout(r, 40));
    expect(sendLink).not.toHaveBeenCalled();
  });
});

describe("sending the RIGHT link", () => {
  let V;
  beforeEach(async () => {
    vi.resetModules();
    V = (await import("./voice.js")).__testables;
  });

  const events = [
    { title: "Beginner/Intermediate Mexicano", date: "2026-08-12", start_time: "18:00", booking_type: "TOURNAMENT" },
    { title: "Tennis-to-Padel: Daytime Morning Crossover", date: "2026-08-11", start_time: "10:00", booking_type: "PUBLIC_CLASS" },
  ];

  it("matches nothing on a call that never mentioned an event", () => {
    // A real call: "how do I book a court", "what is Playtomic", "send me the
    // link". It matched a tournament nobody had mentioned and texted that.
    const transcript =
      "Caller: how do you actually book a court / Caller: what is Playtomic / " +
      "Agent: Playtomic is the app we use for all bookings and payments / " +
      "Caller: can you send me the link / Agent: I'll text that over / " +
      "Agent: have a good day";
    expect(V.matchEvent(transcript, events, "2026-08-09")).toBeNull();
  });

  it("sends the app download when they ask what Playtomic is", () => {
    expect(V.templateFromText("what is Playtomic, can you send me the link")).toBe("app");
    expect(V.templateFromText("how do I download the app")).toBe("app");
  });

  it("still sends the booking link when they just want to book", () => {
    expect(V.templateFromText("send me the link to book a court")).toBe("booking");
  });

  it("still matches a genuinely named event", () => {
    expect(
      V.matchEvent("text me the Beginner Intermediate Mexicano link", events, "2026-08-09").title,
    ).toBe("Beginner/Intermediate Mexicano");
  });
});

describe("spotting urgency without the agent's flag", () => {
  let V;
  beforeEach(async () => {
    vi.resetModules();
    V = (await import("./voice.js")).__testables;
  });

  it.each([
    ["Caller: I'm locked out at the front door"],
    ["Caller: my partner fell and I think she's hurt"],
    ["Caller: I've been waiting outside for twenty minutes"],
    ["Caller: there's no one here and my court starts in five minutes"],
  ])("hears %s as urgent", (line) => {
    // take_message never fires, so the agent's urgent flag never reaches Slack.
    expect(V.soundsUrgent([line])).toBe(true);
  });

  it.each([
    ["Caller: how much is a court?"],
    ["Caller: can you text me the booking link?"],
    ["Caller: what time do you close?"],
  ])("does not page the channel for %s", (line) => {
    // A false urgent teaches people to mute the channel, which costs more than
    // a missed one: every call reaches Slack either way.
    expect(V.soundsUrgent([line])).toBe(false);
  });

  it("ignores the AGENT describing urgency", () => {
    expect(V.soundsUrgent(["Agent: if you are ever locked out, call us"])).toBe(false);
  });

  it.each([
    ["Caller: can someone call me back?"],
    ["Agent: I'll pass that on to the team"],
    ["Caller: can you take a message?"],
  ])("marks %s as wanting a callback", (line) => {
    expect(V.wantsCallback([line])).toBe(true);
  });

  it("does not mark an ordinary enquiry as needing a callback", () => {
    expect(V.wantsCallback(["Caller: what are your hours?"])).toBe(false);
  });
});

describe("keeping a promise the agent made and then did not keep", () => {
  let promisedText, textDestination, spokenPhone, markLinkSent, linkAlreadySent;
  beforeEach(async () => {
    vi.resetModules();
    ({ promisedText, textDestination, spokenPhone, markLinkSent, linkAlreadySent } =
      await import("./voice.js"));
  });

  it("catches a text the agent claims it has ALREADY sent", () => {
    // The failure that cost a caller their link on 10 Aug: the agent said the
    // text was gone, called nothing, and the backstop only looked for future
    // tense so it stayed silent too.
    expect(promisedText(["Agent: I've sent that link to five four one two seven zero four five eight five."])).toBe(true);
    expect(promisedText(["Agent: I just sent that over."])).toBe(true);
    expect(promisedText(["Agent: That's on its way to you now."])).toBe(true);
  });

  it("still catches the future tense it always caught", () => {
    expect(promisedText(["Agent: I'll text that over as soon as we hang up."])).toBe(true);
    expect(promisedText(["Agent: Sending that over now."])).toBe(true);
  });

  it("does not fire on a call where no text was ever mentioned", () => {
    expect(promisedText(["Agent: We're open until ten tonight.", "Caller: Great."])).toBe(false);
  });

  it("reads a number the caller spelled out digit by digit", () => {
    // Bland transcribes a spoken number as words, so a digit regex finds
    // nothing and the text would go to the phone they happen to be holding.
    expect(spokenPhone("five four one two seven zero four five eight five")).toBe("5412704585");
    expect(spokenPhone("text it to five four one, two seven zero, four five eight five")).toBe("5412704585");
  });

  it("does not mistake ordinary counting for a phone number", () => {
    expect(spokenPhone("a court for four on Saturday at seven")).toBe(null);
    expect(spokenPhone("we have four courts")).toBe(null);
  });

  it("sends to the number they asked for, not the one they called from", () => {
    const lines = [
      "Caller: Can you text me the Playtomic link to five four one two seven zero four five eight five?",
      "Agent: Sending that over now.",
    ];
    expect(textDestination(lines)).toBe("5412704585");
  });

  it("ignores a number said in a line that has nothing to do with texting", () => {
    const lines = ["Caller: My old club was on five oh three three eight zero one zero zero five."];
    expect(textDestination(lines)).toBe(null);
  });

  it("does not send again when the agent already sent it during the call", () => {
    // The poller runs a minute behind. Now that the tool fires mid-call, an
    // unconditional backstop is a second identical text, not a rescue.
    markLinkSent("call_dup");
    expect(linkAlreadySent("call_dup")).toBe(true);
    expect(linkAlreadySent("call_other")).toBe(false);
    expect(linkAlreadySent("")).toBe(false);
  });
});

describe("the call-start briefing", () => {
  it("warms when the class cache is cold even though the courts are warm", async () => {
    // The two caches fill independently. Gating the warm-up on bookings alone
    // sent out a briefing reading "Class schedule unavailable" beside a
    // perfectly good court grid, and the briefing is fetched once per call, so
    // the agent stayed blind to classes for the whole conversation.
    let warmed = 0;
    ctx = await boot({
      bookings: [],
      events: null,
      ensureWarm: async () => {
        warmed += 1;
        return true;
      },
    });
    const res = await fetch(`${ctx.base}/api/voice/briefing`, {
      headers: { authorization: `Bearer ${SECRET}` },
    });
    expect(warmed).toBe(1);
  });
});

describe("which link a court booking actually gets", () => {
  it("texts the club's Playtomic page, not the website that only embeds it", async () => {
    // Booking a court is not an event, so nothing ever matched and every court
    // caller got foundrypadel.com/book. The prompt tells them in the same
    // breath that booking happens in the app and not on the website, so the
    // text contradicted the call it came from.
    const sendLink = vi.fn(async () => ({ sent: true, reason: null }));
    ctx = await boot({ linkSender: { configured: () => true, sendLink }, events: [] });

    await post(ctx.base, "/api/voice/sms-link", {
      template: "booking",
      query: "what the availability is tomorrow",
      call_id: "call_courts",
      caller_number: "+15412704585",
    });

    expect(sendLink).toHaveBeenCalledWith(
      expect.objectContaining({ deepLink: "courts", itemId: expect.any(String) }),
    );
  });

  it("still prefers the clinic they named over the general courts link", async () => {
    const sendLink = vi.fn(async () => ({ sent: true, reason: null }));
    ctx = await boot({
      linkSender: { configured: () => true, sendLink },
      events: [
        {
          title: "Off the Wall Masterclass",
          date: "2026-08-12",
          start_time: "20:00",
          booking_type: "PUBLIC_CLASS",
          id: "evt-otw",
        },
      ],
    });

    await post(ctx.base, "/api/voice/sms-link", {
      template: "booking",
      query: "the Off the Wall Masterclass",
      call_id: "call_clinic",
      caller_number: "+15412704585",
    });

    expect(sendLink).toHaveBeenCalledWith(
      expect.objectContaining({ label: expect.stringContaining("Off the Wall") }),
    );
  });
});
