// Phase-0 probe for the voice receptionist: can we derive court availability from
// the bookings API alone?
//
// The third-party Playtomic API we hold credentials for has no availability
// endpoint (auth, bookings, players, payments is the whole surface). So the plan
// is to derive free time as: courts x opening hours, minus every booking. This
// script checks whether that subtraction can actually be trusted.
//
// Run with credentials injected, so they are never printed:
//   railway run node scripts/probe-availability.js
//
// Answers four questions:
//   1. What is the full booking-type mix, unfiltered? (server.js keeps only
//      event types today and throws away REGULAR_BOOKING, which is most of the
//      court occupancy we need.)
//   2. What are the distinct courts, by resource_name?
//   3. Is anything occupying a court that is NOT a normal booking - maintenance,
//      closures, blocks? Those are invisible to us and would make the agent
//      offer courts nobody can book.
//   4. Do bookings tile cleanly, or are there buffers/odd durations that would
//      make a naive subtraction produce fake gaps?

const CLIENT_ID = process.env.PLAYTOMIC_CLIENT_ID;
const CLIENT_SECRET = process.env.PLAYTOMIC_CLIENT_SECRET;
const TENANT_ID =
  process.env.PLAYTOMIC_TENANT_ID || "70cae734-e32f-4e3a-9f72-516d9f025125";
const CLUB_TIMEZONE = process.env.CLUB_TIMEZONE || "America/Los_Angeles";

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error(
    "Missing PLAYTOMIC_CLIENT_ID / PLAYTOMIC_CLIENT_SECRET. Run via: railway run node scripts/probe-availability.js",
  );
  process.exit(1);
}

// Any key that might mark a row as blocking a court without being a real booking.
const BLOCK_HINT =
  /block|maintenance|closed|closure|unavailab|hold|internal|admin|note|reason|status|state|type|source|origin/i;

async function getToken() {
  const res = await fetch(
    "https://thirdparty.playtomic.io/api/v1/oauth/token",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client_id: CLIENT_ID, secret: CLIENT_SECRET }),
    },
  );
  if (!res.ok) {
    throw new Error(`Token request failed (${res.status}): ${await res.text()}`);
  }
  return (await res.json()).token;
}

// Deliberately UNfiltered: we want every row, including REGULAR_BOOKING and
// canceled ones, because the question is what occupies a court.
async function fetchAllBookings(token, days = 14) {
  const now = new Date();
  const start = now.toISOString().slice(0, 19);
  const end = new Date(now.getTime() + days * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 19);

  const all = [];
  for (let page = 0; page < 25; page += 1) {
    const url = new URL("https://thirdparty.playtomic.io/api/v1/bookings");
    url.searchParams.set("tenant_id", TENANT_ID);
    url.searchParams.set("start_booking_date", start);
    url.searchParams.set("end_booking_date", end);
    url.searchParams.set("size", "200");
    url.searchParams.set("page", String(page));
    const res = await fetch(url.toString(), {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) {
      throw new Error(
        `Bookings request failed (${res.status}): ${await res.text()}`,
      );
    }
    const chunk = await res.json();
    if (!Array.isArray(chunk) || chunk.length === 0) break;
    all.push(...chunk);
    if (chunk.length < 200) break;
  }
  return all;
}

function localParts(iso) {
  const d = new Date(iso.endsWith("Z") ? iso : `${iso}Z`);
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: CLUB_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const p = Object.fromEntries(
    fmt.formatToParts(d).map((x) => [x.type, x.value]),
  );
  return {
    date: `${p.year}-${p.month}-${p.day}`,
    time: `${p.hour}:${p.minute}`,
    ms: d.getTime(),
  };
}

function tally(rows, keyFn) {
  const counts = new Map();
  for (const r of rows) {
    const k = keyFn(r);
    counts.set(k, (counts.get(k) || 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

function printTally(title, entries) {
  console.log(`\n--- ${title} ---`);
  if (!entries.length) {
    console.log("  (none)");
    return;
  }
  const width = Math.max(...entries.map(([k]) => String(k).length));
  for (const [k, n] of entries) {
    console.log(`  ${String(k).padEnd(width)}  ${n}`);
  }
}

// Collect dotted key paths whose leaf key hints at a court-blocking concept.
function findBlockPaths(obj, prefix = "", out = new Map()) {
  if (obj == null || typeof obj !== "object") return out;
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (BLOCK_HINT.test(k) && (typeof v !== "object" || v === null)) {
      if (!out.has(path)) out.set(path, new Set());
      const seen = out.get(path);
      if (seen.size < 8) seen.add(JSON.stringify(v));
    }
    if (v && typeof v === "object") {
      const child = Array.isArray(v) ? v[0] : v;
      findBlockPaths(child, Array.isArray(v) ? `${path}[]` : path, out);
    }
  }
  return out;
}

(async () => {
  const token = await getToken();
  const all = await fetchAllBookings(token);
  console.log(`\nFetched ${all.length} raw booking rows over the next 14 days.`);

  const live = all.filter((b) => !b.is_canceled);
  console.log(
    `${live.length} not canceled, ${all.length - live.length} canceled.`,
  );

  // Q1: the full booking-type mix.
  printTally(
    "Q1. booking_type (not canceled)",
    tally(live, (b) => b.booking_type || "(null)"),
  );
  printTally(
    "Q1b. status values",
    tally(live, (b) => b.status || b.booking_status || "(none)"),
  );

  // Q2: the courts.
  const courts = [
    ...new Set(live.map((b) => (b.resource_name || "").trim()).filter(Boolean)),
  ].sort();
  console.log(`\n--- Q2. distinct courts (${courts.length}) ---`);
  for (const c of courts) console.log(`  ${c}`);
  const missingResource = live.filter((b) => !b.resource_name).length;
  if (missingResource) {
    console.log(
      `  !! ${missingResource} rows have NO resource_name - these cannot be subtracted from a court.`,
    );
  }

  // Q3: anything that blocks a court without being a normal booking.
  console.log("\n--- Q3. fields that might mark a non-booking court block ---");
  const paths = new Map();
  for (const b of live.slice(0, 200)) findBlockPaths(b, "", paths);
  for (const [path, values] of [...paths.entries()].sort()) {
    console.log(`  ${path} = ${[...values].join(", ")}`);
  }
  const nonPlayer = live.filter(
    (b) => !(b.participant_info?.participants?.length > 0),
  );
  console.log(
    `\n  Rows with zero participants: ${nonPlayer.length} (candidates for maintenance/admin blocks)`,
  );
  printTally(
    "  their booking_type",
    tally(nonPlayer, (b) => b.booking_type || "(null)"),
  );

  // Q3b: UNKNOWN is the prime suspect for a maintenance/admin court block.
  // Dump one in full - if these are closures, they must be subtracted too.
  const unknowns = live.filter((b) => b.booking_type === "UNKNOWN");
  console.log(`\n--- Q3b. UNKNOWN rows (${unknowns.length}) in full ---`);
  for (const u of unknowns.slice(0, 3)) {
    console.log(JSON.stringify(u, null, 2));
  }

  // Q4: do bookings tile cleanly?
  const durations = live
    .map((b) => {
      if (!b.booking_start_date || !b.booking_end_date) return null;
      const s = localParts(b.booking_start_date);
      const e = localParts(b.booking_end_date);
      return Math.round((e.ms - s.ms) / 60000);
    })
    .filter((n) => Number.isFinite(n) && n > 0);
  printTally(
    "Q4. durations in minutes",
    tally(durations, (d) => `${d} min`),
  );
  const startMinutes = live
    .filter((b) => b.booking_start_date)
    .map((b) => localParts(b.booking_start_date).time.slice(3));
  printTally(
    "Q4b. start-time minute offsets (clean grid = few values)",
    tally(startMinutes, (m) => `:${m}`),
  );

  // A single busy day, per court, so the gaps can be eyeballed against Playtomic.
  const byDate = new Map();
  for (const b of live) {
    if (!b.booking_start_date || !b.resource_name) continue;
    const { date } = localParts(b.booking_start_date);
    byDate.set(date, (byDate.get(date) || 0) + 1);
  }
  const busiest = [...byDate.entries()].sort((a, b) => b[1] - a[1])[0];
  if (busiest) {
    const [day] = busiest;
    console.log(`\n--- Q4c. occupancy grid for ${day} (busiest day) ---`);
    console.log("    Compare these gaps against the real Playtomic booking page.");
    for (const court of courts) {
      const rows = live
        .filter(
          (b) =>
            b.booking_start_date &&
            (b.resource_name || "").trim() === court &&
            localParts(b.booking_start_date).date === day,
        )
        .map((b) => ({
          from: localParts(b.booking_start_date).time,
          to: b.booking_end_date ? localParts(b.booking_end_date).time : "?",
          type: b.booking_type,
        }))
        .sort((a, b) => a.from.localeCompare(b.from));
      console.log(`\n  ${court}:`);
      if (!rows.length) {
        console.log("    (nothing booked all day)");
        continue;
      }
      for (const r of rows) {
        console.log(`    ${r.from}-${r.to}  ${r.type}`);
      }
    }
  }

  console.log(
    "\nGate: if Q3 shows court blocks we cannot see, or Q4 shows ragged\n" +
      "durations, derived availability must be phrased as 'looks open, I'll\n" +
      "text you the link to confirm' rather than stated as certain.\n",
  );
})().catch((err) => {
  console.error("\nProbe failed:", err.message);
  process.exit(1);
});
