/** @vitest-environment node */
import { describe, it, expect, beforeAll } from "vitest";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

let T;

beforeAll(async () => {
  // server.js serves a prerendered dist/; point it at an empty temp dir so the
  // import is side-effect free (same trick as server/routing.test.js).
  process.env.SITE_DIST = mkdtempSync(path.join(tmpdir(), "events-test-"));
  ({ __testables: T } = await import("../server.js"));
});

// A real Midday Social, as Playtomic returns it: one row per court, sharing an
// activity_id and start time, typed UNKNOWN rather than TOURNAMENT. Note the
// trailing space on "Padel 4 " — that is what the API actually sends.
function socialRow(overrides = {}) {
  return {
    booking_id: "cb9eec20-1630-4b1d-8b16-30ec665de456",
    object_id: "11fb08f8-88f8-4e0c-9868-9b98804fd1fd",
    resource_id: "42889ff7-0de3-4ffa-9047-290536e823b3",
    resource_name: "Padel 4 ",
    booking_start_date: "2026-08-13T18:00:00",
    booking_end_date: "2026-08-13T20:00:00",
    duration: 7200000,
    origin: "MANAGER",
    price: "20 USD",
    booking_type: "UNKNOWN",
    tournament_id: "0feaf364-f7cf-460c-9801-16367bc76c89",
    activity_id: "0feaf364-f7cf-460c-9801-16367bc76c89",
    activity_name: "Midday Social: Intermediate & Up",
    participant_info: { owner_id: null, participants: [] },
    is_canceled: false,
    status: "PENDING",
    ...overrides,
  };
}

describe("manager-created socials reach the public schedule", () => {
  it("promotes an UNKNOWN booking that carries a tournament_id", () => {
    expect(T.effectiveBookingType(socialRow())).toBe("TOURNAMENT");
  });

  it("leaves a bare UNKNOWN alone, so it stays off the public schedule", () => {
    // UNKNOWN is a catch-all. Without a tournament_id we have no evidence this
    // is a public event, and publishing it could expose a private booking.
    const row = socialRow({ tournament_id: null, activity_id: null });
    expect(T.effectiveBookingType(row)).toBe("UNKNOWN");
  });

  it.each([
    ["COURSE_CLASS"],
    ["PUBLIC_CLASS"],
    ["PRIVATE_CLASS"],
    ["TOURNAMENT"],
    ["OPEN_MATCH"],
  ])("passes %s through untouched", (booking_type) => {
    expect(T.effectiveBookingType(socialRow({ booking_type }))).toBe(
      booking_type,
    );
  });

  it("deep-links a promoted social to its tournament page, not the club page", () => {
    expect(T.bookingDeepLink(socialRow())).toBe(
      "https://app.playtomic.com/tournaments/0feaf364-f7cf-460c-9801-16367bc76c89",
    );
  });

  it("maps a multi-court social into one event with the tournament type", () => {
    const group = [
      socialRow({ resource_name: "Padel 2" }),
      socialRow({ resource_name: "Padel 3" }),
      socialRow({ resource_name: "Padel 4 " }),
    ];
    const event = T.mapBookingGroup(group);

    expect(event.booking_type).toBe("TOURNAMENT");
    expect(event.title).toBe("Midday Social: Intermediate & Up");
    expect(event.court).toBe("3 courts");
    // 18:00 UTC is 11:00 in America/Los_Angeles — a midday social, as named.
    expect(event.start_time).toBe("11:00");
    expect(event.end_time).toBe("13:00");
    expect(event.date).toBe("2026-08-13");
  });

  it("groups the per-court rows by activity so it shows once, not four times", () => {
    const groups = T.groupEventBookings([
      socialRow({ booking_id: "a", resource_name: "Padel 1" }),
      socialRow({ booking_id: "b", resource_name: "Padel 2" }),
      socialRow({ booking_id: "c", resource_name: "Padel 3" }),
      socialRow({ booking_id: "d", resource_name: "Padel 4 " }),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0]).toHaveLength(4);
  });

  it("never renders a raw booking_type as a visitor-facing title", () => {
    const row = socialRow({ activity_name: null, course_name: null });
    expect(T.mapBookingGroup([row]).title).toBe("Tournament");
  });
});

describe("courts are called Court 1 to 4, not Padel 1 to 4", () => {
  it("renames what Playtomic calls them", () => {
    // Playtomic names the resources "Padel 1".."Padel 4". The club, the
    // website and the phone agent all say Court.
    expect(T.courtLabel("Padel 1")).toBe("Court 1");
    expect(T.courtLabel("Padel 4 ")).toBe("Court 4");
  });

  it("leaves an already-correct name alone", () => {
    expect(T.courtLabel("Court 3")).toBe("Court 3");
  });

  it("renames on the public events feed too, so nothing disagrees", () => {
    const event = T.mapBookingGroup([
      socialRow({ resource_name: "Padel 2" }),
      socialRow({ resource_name: "Padel 4 " }),
    ]);
    expect(event.courts).toEqual(["Court 2", "Court 4"]);
  });
});

// The thirdparty bookings API returns the PROGRAM a class belongs to, not the class.
// Every one of Foundry's clinics was therefore mislabelled on the public schedule: the
// Tuesday 10am read "Tennis-to-Padel: Daytime Morning Crossover" while Playtomic, Kumi
// and the coach all called it "Midweek Morning Clinic: Tactics + Technique".
describe("a class is shown by its own name, not its program's", () => {
  const CLASS_ID = "11008920-7213-4676-9d8a-8c5eda1f4c12";

  function programNamedEvent(overrides = {}) {
    return {
      id: CLASS_ID,
      title: "Tennis-to-Padel: Daytime Morning Crossover", // the PROGRAM
      date: "2026-08-11",
      start_time: "10:00",
      booking_type: "PUBLIC_CLASS",
      ...overrides,
    };
  }

  function kumiClass(overrides = {}) {
    return {
      academy_class_id: CLASS_ID,
      name: "Midweek Morning Clinic: Tactics + Technique", // the CLASS
      start_utc: "2026-08-11T17:00:00Z",
      price: "$25", // Kumi sends it pre-formatted; cleanPrice passes it straight through

      max_players: 4,
      num_registered: 2,
      ...overrides,
    };
  }

  it("replaces the program name with the class name", () => {
    const [e] = T.applyKumiClassInfo([programNamedEvent()], [kumiClass()]);
    expect(e.title).toBe("Midweek Morning Clinic: Tactics + Technique");
  });

  it("still corrects a free class with no capacity", () => {
    // These were dropped before a name was worth keeping, which would have skipped
    // exactly the classes carrying no price.
    const [e] = T.applyKumiClassInfo(
      [programNamedEvent()],
      [kumiClass({ price: null, max_players: null, num_registered: null })],
    );
    expect(e.title).toBe("Midweek Morning Clinic: Tactics + Technique");
  });

  it("leaves the title alone when Kumi has no matching class", () => {
    // No match must never blank a title — the bookings-API name is the floor.
    const [e] = T.applyKumiClassInfo([programNamedEvent()], []);
    expect(e.title).toBe("Tennis-to-Padel: Daytime Morning Crossover");
  });

  it("leaves the title alone when Kumi's name is empty", () => {
    const [e] = T.applyKumiClassInfo([programNamedEvent()], [kumiClass({ name: "  " })]);
    expect(e.title).toBe("Tennis-to-Padel: Daytime Morning Crossover");
  });

  it("does not touch anything that is not a class", () => {
    const open = programNamedEvent({ booking_type: "OPEN_MATCH", title: "Open Match" });
    const [e] = T.applyKumiClassInfo([open], [kumiClass()]);
    expect(e.title).toBe("Open Match");
  });

  it("still overlays the real per-person price and signups", () => {
    const [e] = T.applyKumiClassInfo([programNamedEvent()], [kumiClass()]);
    expect(e.price).toBe("$25");
    expect(e.capacity).toBe(4);
    expect(e.signed_up).toBe(2);
  });

  it("matches on id even though the two names disagree", () => {
    // The title+date fallback can only fire when the names already AGREE, so a
    // mislabelled class is reachable by id alone. Losing that match would silently
    // restore the program name AND blank the price.
    const [e] = T.applyKumiClassInfo(
      [programNamedEvent({ start_time: "23:59" })],
      [kumiClass()],
    );
    expect(e.title).toBe("Midweek Morning Clinic: Tactics + Technique");
  });
});

// A full open match is a closed court, not an event. Showing "4 signed up" on a 4-player
// match sent visitors to a match they could not join.
describe("full open matches stay off the schedule", () => {
  function openMatch(signed_up) {
    return {
      id: "m1", title: "Open Match", date: "2026-08-11", start_time: "09:30",
      booking_type: "OPEN_MATCH", signed_up,
    };
  }

  // getEvents does the filtering inline, so assert the rule the way the code states it.
  const isFull = (e) => e.booking_type === "OPEN_MATCH" && (e.signed_up ?? 0) >= 4;

  it("treats 4 of 4 as full", () => {
    expect(isFull(openMatch(4))).toBe(true);
  });

  it("keeps a match with a spot left", () => {
    expect(isFull(openMatch(3))).toBe(false);
  });

  it("keeps an empty match", () => {
    expect(isFull(openMatch(0))).toBe(false);
  });

  it("never hides a clinic, however many signed up", () => {
    const clinic = { ...openMatch(4), booking_type: "PUBLIC_CLASS" };
    expect(isFull(clinic)).toBe(false);
  });

  it("treats an over-full match as full rather than letting it through", () => {
    expect(isFull(openMatch(5))).toBe(true);
  });

  it("the server uses one constant for match size, not a stray 4", async () => {
    const fs = await import("node:fs");
    const src = fs.readFileSync(new URL("../server.js", import.meta.url), "utf8");
    expect(src).toMatch(/const OPEN_MATCH_SIZE = 4;/);
    expect(src).toMatch(/signed_up \?\? 0\) >= OPEN_MATCH_SIZE/);
    expect(src).toMatch(/n \/ OPEN_MATCH_SIZE/); // price split shares it
  });
});

// "Open Match" alone told a visitor nothing about whether it was for them. Levels live
// only in Kumi — the thirdparty bookings API the schedule is built from has none.
describe("open matches are named by the levels they are for", () => {
  const MATCH_ID = "e9dbc5f7-69c4-4d0c-91ab-c8d6dfa1b62e";

  function openMatch(overrides = {}) {
    return {
      id: "b6dbdff4-0c5d-4e77-9e59-2e89f2e0f077", // booking id, NOT the match id
      title: "Open Match",
      booking_type: "OPEN_MATCH",
      book_url: `https://app.playtomic.com/matches/${MATCH_ID}`,
      ...overrides,
    };
  }

  const kumiMatch = (levels, id = MATCH_ID) => ({
    playtomic_match_id: id,
    levels,
  });

  it("keys off the match id in the link, not the booking id", () => {
    // These genuinely differ on the live feed; matching on e.id finds nothing.
    expect(T.openMatchId(openMatch())).toBe(MATCH_ID);
    expect(T.openMatchId(openMatch())).not.toBe(openMatch().id);
  });

  it("names a single-bucket match", () => {
    const [e] = T.applyKumiOpenMatchLevels([openMatch()], [kumiMatch(["Beginner"])]);
    expect(e.title).toBe("Beginner Open Match");
  });

  it("names a straddling match with both labels", () => {
    const [e] = T.applyKumiOpenMatchLevels(
      [openMatch()],
      [kumiMatch(["Intermediate", "Advanced"])],
    );
    expect(e.title).toBe("Intermediate/Advanced Open Match");
  });

  it("keeps the plain title when the level is unknown", () => {
    // An unlabelled match is honest; a wrongly labelled one is not.
    const [e] = T.applyKumiOpenMatchLevels([openMatch()], [kumiMatch([])]);
    expect(e.title).toBe("Open Match");
  });

  it("keeps the plain title when Kumi knows nothing about the match", () => {
    const [e] = T.applyKumiOpenMatchLevels([openMatch()], []);
    expect(e.title).toBe("Open Match");
  });

  it("never renames a clinic or a tournament", () => {
    const clinic = openMatch({ booking_type: "PUBLIC_CLASS", title: "Smash the basics" });
    const [e] = T.applyKumiOpenMatchLevels([clinic], [kumiMatch(["Advanced"])]);
    expect(e.title).toBe("Smash the basics");
  });

  it("does not cross-label a different match", () => {
    const [e] = T.applyKumiOpenMatchLevels(
      [openMatch()],
      [kumiMatch(["Advanced"], "11111111-2222-3333-4444-555555555555")],
    );
    expect(e.title).toBe("Open Match");
  });

  it("survives a missing book_url", () => {
    const [e] = T.applyKumiOpenMatchLevels(
      [openMatch({ book_url: undefined })],
      [kumiMatch(["Beginner"])],
    );
    expect(e.title).toBe("Open Match");
  });

  it("a failing levels feed cannot wipe class names or prices", () => {
    // The class overlay runs in a separate try; this one is the newest and least
    // important dependency on the page.
    const fsSrc = readFileSync(new URL("../server.js", import.meta.url), "utf8");
    // the CALL site, not the function definition (both contain the name)
    const i = fsSrc.indexOf("applyKumiOpenMatchLevels(events, (await fetchKumiOpenMatches");
    const before = fsSrc.lastIndexOf("try {", i);
    const afterClasses = fsSrc.indexOf("applyKumiClassInfo(events");
    expect(before).toBeGreaterThan(afterClasses); // its own try, opened later
    expect(fsSrc.slice(i, i + 400)).toMatch(/catch \(error\)/);
  });
});

// The full-open-match filter rebinds `events`, and it was declared const, so getEvents
// threw "Assignment to constant variable" on every call and the public schedule served
// 502s. node --check passes (it is a RUNTIME TypeError) and the unit tests above call the
// helpers directly, so nothing caught it. This does.
describe("getEvents can actually run", () => {
  const src = () => readFileSync(new URL("../server.js", import.meta.url), "utf8");

  it("declares events with let, because the filter rebinds it", () => {
    expect(src()).toMatch(/let events = groupEventBookings\(bookings\)/);
    expect(src()).not.toMatch(/const events = groupEventBookings/);
  });

  it("has no other const that is later reassigned in getEvents", () => {
    const body = src().slice(src().indexOf("async function getEvents("));
    const fnBody = body.slice(0, body.indexOf("\n}\n"));
    const consts = [...fnBody.matchAll(/^\s*const (\w+) =/gm)].map((m) => m[1]);
    for (const name of consts) {
      const reassigned = new RegExp(`^\\s*${name} = `, "m").test(fnBody);
      expect(reassigned, `${name} is const but reassigned`).toBe(false);
    }
  });
});

// The schedule page shows a whole month, past days included: a visitor sizing the club
// up on the 28th was shown four blank weeks and five empty September cells. Everything
// else that reads this API (the TV screen, /book) still wants upcoming-only, so the past
// is opt-in per request.
describe("the calendar can ask for days that have already happened", () => {
  const src = () => readFileSync(new URL("../server.js", import.meta.url), "utf8");

  // getEvents does the filtering inline, so assert the rule the way the code states it.
  const nowParts = { date: "2026-08-28", time: "14:30" };
  const isOver = (e) =>
    e.date < nowParts.date || (e.date === nowParts.date && e.end_time <= nowParts.time);

  const event = (o = {}) => ({
    date: "2026-08-28",
    start_time: "10:00",
    end_time: "11:30",
    booking_type: "PUBLIC_CLASS",
    signed_up: 0,
    ...o,
  });

  it("treats an earlier day as over", () => {
    expect(isOver(event({ date: "2026-08-27" }))).toBe(true);
  });

  it("treats a later day as still to come", () => {
    expect(isOver(event({ date: "2026-08-29", end_time: "08:00" }))).toBe(false);
  });

  it("treats this morning as over and tonight as still to come", () => {
    expect(isOver(event())).toBe(true);
    expect(isOver(event({ start_time: "18:00", end_time: "19:30" }))).toBe(false);
  });

  it("keeps a session under way right now, which availability depends on", () => {
    expect(isOver(event({ start_time: "14:00", end_time: "15:30" }))).toBe(false);
  });

  it("only drops finished events when the caller did NOT ask for the past", () => {
    // Both halves of the filter, exactly as getEvents writes it.
    expect(src()).toMatch(/\.filter\(\(e\) => includePast \|\| !isOver\(e\)\)/);
    expect(src()).toMatch(/async function getEvents\(\{ from = null, to = null, includePast = false \} = \{\}\)/);
  });

  it("still hides a FULL open match, but only while it is still ahead", () => {
    // A played-out match is history; an upcoming full one is a closed court.
    expect(src()).toMatch(/signed_up \?\? 0\) >= OPEN_MATCH_SIZE && !isOver\(e\)/);
  });

  it("is opt-in on the range route, so the TV screen and /book are unaffected", () => {
    expect(src()).toMatch(/req\.query\.include_past === "1"/);
    expect(src()).toMatch(/getEvents\(\{ from: start, to: end, includePast \}\)/);
  });

  it("allows a whole six-week grid in one request", () => {
    const cap = Number(/const MAX_RANGE_DAYS = (\d+);/.exec(src())[1]);
    expect(cap).toBeGreaterThanOrEqual(42); // 6 weeks x 7 days, the widest month grid
  });

  it("lets history fail without taking the upcoming half of the calendar with it", () => {
    const body = src().slice(src().indexOf("async function bookingsSince("));
    const fn = body.slice(0, body.indexOf("\n}\n"));
    expect(fn).toMatch(/catch \(error\)/);
    expect(fn).toMatch(/return forward;/);
  });

  it("caches a past window for longer than the live one, since it cannot change", () => {
    const minutes = (re) => Number(re.exec(src())[1]);
    const live = minutes(/const BOOKINGS_CACHE_TTL = (\d+) \* 60 \* 1000;/);
    const past = minutes(/const PAST_BOOKINGS_TTL = (\d+) \* 60 \* 1000;/);
    expect(past).toBeGreaterThan(live);
  });
});

// Playtomic's PRIVATE means unlisted, not locked: a tournament_id IS the join link, and
// ours comes from the bookings API, which returns the club's whole programme whatever its
// visibility. Kumi's feed carries the public ones only, so it is what tells us which
// tournaments the club has actually opened.
describe("a tournament the club has not opened yet is not linked", () => {
  const NOW = { date: "2026-09-03", time: "12:00" };
  const isOver = (e) => e.date < NOW.date || (e.date === NOW.date && e.end_time <= NOW.time);

  const ID = "2499c604-bd19-4a71-b216-edd300b37575";

  function tournament(overrides = {}) {
    return {
      id: ID,
      title: "Midday Social 1.5+",
      date: "2026-09-10",
      start_time: "11:00",
      end_time: "12:30",
      booking_type: "TOURNAMENT",
      signed_up: 0,
      book_url: `https://app.playtomic.com/tournaments/${ID}`,
      ...overrides,
    };
  }

  // start_utc is UTC; 18:00Z is 11:00 in Portland.
  function feedRow(overrides = {}) {
    return {
      tournament_id: ID,
      name: "Midday Social 1.5+",
      start_utc: "2026-09-10T18:00:00Z",
      price: "$25",
      max_players: 12,
      registered_count: 4,
      ...overrides,
    };
  }

  it("keeps the link, and takes the price, for one that IS in the feed", () => {
    const [e] = T.applyKumiTournamentInfo([tournament()], [feedRow()], { isOver });
    expect(e.book_url).toContain(ID);
    expect(e.booking_open).toBeUndefined();
    expect(e.price).toBe("$25");
    expect(e.capacity).toBe(12);
    expect(e.signed_up).toBe(4);
  });

  it("drops the link and says booking is not open when it is missing from the feed", () => {
    const [e] = T.applyKumiTournamentInfo([tournament()], [], { isOver });
    expect(e.book_url).toBeNull();
    expect(e.booking_open).toBe(false);
    expect(e.price).toBeNull();
  });

  it("still counts a feed row with no price or capacity as released", () => {
    // The price map skips those rows. Reusing it to decide "released" would strip the
    // join link off a public tournament the club simply has not priced yet.
    const [e] = T.applyKumiTournamentInfo(
      [tournament()],
      [feedRow({ price: null, max_players: null, registered_count: null })],
      { isOver },
    );
    expect(e.book_url).toContain(ID);
    expect(e.booking_open).toBeUndefined();
  });

  it("matches on name and start time when the ids do not line up", () => {
    const [e] = T.applyKumiTournamentInfo(
      [tournament()],
      [feedRow({ tournament_id: null })],
      { isOver },
    );
    expect(e.book_url).toContain(ID);
    expect(e.price).toBe("$25");
  });

  it("leaves PAST tournaments alone, since the feed only carries upcoming ones", () => {
    const played = tournament({ date: "2026-08-12", start_time: "11:00", end_time: "12:30" });
    const [e] = T.applyKumiTournamentInfo([played], [], { isOver });
    expect(e.book_url).toContain(ID); // the page shows it as PAST either way
    expect(e.booking_open).toBeUndefined();
  });

  it("never touches a clinic or an open match", () => {
    const clinic = { ...tournament(), booking_type: "PUBLIC_CLASS", book_url: "https://x/lesson_class/abc" };
    const match = { ...tournament(), booking_type: "OPEN_MATCH", book_url: "https://x/matches/abc" };
    const out = T.applyKumiTournamentInfo([clinic, match], [], { isOver });
    for (const e of out) {
      expect(e.book_url).toBeTruthy();
      expect(e.booking_open).toBeUndefined();
    }
  });

  it("is wired into getEvents with the same isOver the past filter uses", () => {
    const src = readFileSync(new URL("../server.js", import.meta.url), "utf8");
    expect(src).toMatch(/applyKumiTournamentInfo\(events, \(await fetchKumiTournaments\(\)\)\.tournaments \|\| \[\], \{\s*isOver,\s*today: nowParts\.date,\s*\}\)/);
  });

  it("fails open: a Kumi outage takes prices, never links", () => {
    const src = readFileSync(new URL("../server.js", import.meta.url), "utf8");
    const catchBody = src.slice(src.indexOf("[events] kumi price enrichment skipped"));
    const block = catchBody.slice(0, catchBody.indexOf("\n  }"));
    expect(block).toMatch(/e\.price = null/);
    expect(block).not.toMatch(/book_url/);
  });
});

// The members-first window is a perk, so the page names the day it ends rather than just
// refusing. The date is start - 5 days, matching the --days default of Kumi's
// release_private_tournaments.py, which is the cron that actually flips the event public.
describe("the day a members-first tournament opens to everyone", () => {
  const isOver = () => false;
  const ID = "2499c604-bd19-4a71-b216-edd300b37575";
  const t = (date) => ({
    id: ID, title: "Midday Social 1.5+", date, start_time: "11:00", end_time: "12:30",
    booking_type: "TOURNAMENT", signed_up: 0,
    book_url: `https://app.playtomic.com/tournaments/${ID}`,
  });

  it("is five days before it plays", () => {
    const [e] = T.applyKumiTournamentInfo([t("2026-09-10")], [], { isOver, today: "2026-08-29" });
    expect(e.opens_on).toBe("2026-09-05");
  });

  it("crosses a month boundary correctly", () => {
    const [e] = T.applyKumiTournamentInfo([t("2026-09-03")], [], { isOver, today: "2026-08-29" });
    expect(e.opens_on).toBe("2026-08-29");
  });

  it("still shows the date on the day itself — that is the day it opens", () => {
    const [e] = T.applyKumiTournamentInfo([t("2026-09-03")], [], { isOver, today: "2026-08-29" });
    expect(e.opens_on).toBe("2026-08-29"); // today
  });

  it("is withheld once it has passed, because that means the release cron is late", () => {
    // A gated event whose open day has been and gone can only mean the release job is
    // late or dead (Kumi alerts on exactly that). Until someone acts on it, "opens Aug
    // 23" printed on the 29th is worse than saying nothing.
    const [late] = T.applyKumiTournamentInfo([t("2026-08-28")], [], { isOver, today: "2026-08-29" });
    expect(late.booking_open).toBe(false);
    expect(late.opens_on).toBeNull();
  });

  it("is only set on the tournaments that are actually gated", () => {
    const feed = [{ tournament_id: ID, name: "Midday Social 1.5+", start_utc: "2026-09-10T18:00:00Z", price: "$25", max_players: 12 }];
    const [e] = T.applyKumiTournamentInfo([t("2026-09-10")], feed, { isOver, today: "2026-08-29" });
    expect(e.opens_on).toBeUndefined();
    expect(e.book_url).toContain(ID);
  });

  it("reads its window from one constant, tied to the cron that does the releasing", () => {
    const src = readFileSync(new URL("../server.js", import.meta.url), "utf8");
    expect(src).toMatch(/TOURNAMENT_RELEASE_DAYS = Number\(process\.env\.TOURNAMENT_RELEASE_DAYS \|\| 5\)/);
    expect(src).toMatch(/release_private_tournaments\.py/);
    expect(src).toMatch(/shiftDate\(e\.date, -TOURNAMENT_RELEASE_DAYS\)/);
  });

  it("shifts whole days without tripping over DST", () => {
    // 1 Nov 2026 is the Sunday the clocks go back in Portland.
    expect(T.shiftDate("2026-11-03", -5)).toBe("2026-10-29");
    expect(T.shiftDate("2026-03-10", -5)).toBe("2026-03-05");
    expect(T.shiftDate("2027-01-02", -5)).toBe("2026-12-28");
  });
});
