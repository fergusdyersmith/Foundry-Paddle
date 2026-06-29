// One-off Phase-0 probe: inspect the raw Playtomic booking schema to determine
// whether min/max player capacity is available for the schedule cards.
//
// Run with credentials in the environment, e.g.:
//   PLAYTOMIC_CLIENT_ID=... PLAYTOMIC_CLIENT_SECRET=... \
//   PLAYTOMIC_TENANT_ID=70cae734-e32f-4e3a-9f72-516d9f025125 \
//   node scripts/probe-playtomic.js
//
// Prints: top-level keys seen, one full sample booking per booking_type, and a
// scan for any capacity-like fields (min/max/players/registration/places).

const CLIENT_ID = process.env.PLAYTOMIC_CLIENT_ID;
const CLIENT_SECRET = process.env.PLAYTOMIC_CLIENT_SECRET;
const TENANT_ID =
  process.env.PLAYTOMIC_TENANT_ID || "70cae734-e32f-4e3a-9f72-516d9f025125";

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error(
    "Missing PLAYTOMIC_CLIENT_ID / PLAYTOMIC_CLIENT_SECRET in environment.",
  );
  process.exit(1);
}

const EVENT_BOOKING_TYPES = new Set([
  "COURSE_CLASS",
  "PUBLIC_CLASS",
  "PRIVATE_CLASS",
  "TOURNAMENT",
  "OPEN_MATCH",
]);

// Keys (at any nesting depth) that would let us show min/max players.
const CAPACITY_HINT = /min|max|player|particip|registr|place|capacit|slot|spot|size|seat|limit/i;

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

async function fetchSomeBookings(token) {
  const now = new Date();
  const start = now.toISOString().slice(0, 19);
  const end = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
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
  return all.filter(
    (b) => EVENT_BOOKING_TYPES.has(b.booking_type) && !b.is_canceled,
  );
}

// Recursively collect dotted key paths whose leaf key looks capacity-related.
function findCapacityPaths(obj, prefix = "", out = new Map()) {
  if (obj == null || typeof obj !== "object") return out;
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (CAPACITY_HINT.test(k) && (typeof v !== "object" || v === null)) {
      if (!out.has(path)) out.set(path, v);
    }
    if (v && typeof v === "object") {
      // Recurse into the first array element only, to keep output readable.
      const child = Array.isArray(v) ? v[0] : v;
      findCapacityPaths(child, Array.isArray(v) ? `${path}[]` : path, out);
    }
  }
  return out;
}

(async () => {
  const token = await getToken();
  const bookings = await fetchSomeBookings(token);
  console.log(`\nFetched ${bookings.length} event bookings.\n`);

  if (!bookings.length) {
    console.log("No event bookings in the next 30 days to inspect.");
    return;
  }

  const topKeys = new Set();
  bookings.forEach((b) => Object.keys(b).forEach((k) => topKeys.add(k)));
  console.log("=== Top-level booking keys ===");
  console.log([...topKeys].sort().join(", "));

  console.log("\n=== Capacity-like fields found (across all bookings) ===");
  const capAgg = new Map();
  for (const b of bookings) {
    for (const [path, val] of findCapacityPaths(b)) {
      if (!capAgg.has(path)) capAgg.set(path, val);
    }
  }
  if (capAgg.size === 0) {
    console.log("(none found — min/max players is NOT available)");
  } else {
    for (const [path, val] of [...capAgg].sort()) {
      console.log(`  ${path} = ${JSON.stringify(val)}`);
    }
  }

  console.log("\n=== One full sample booking per booking_type ===");
  const seen = new Set();
  for (const b of bookings) {
    if (seen.has(b.booking_type)) continue;
    seen.add(b.booking_type);
    console.log(`\n--- ${b.booking_type} ---`);
    console.log(JSON.stringify(b, null, 2));
  }
})().catch((err) => {
  console.error("Probe failed:", err.message);
  process.exit(1);
});
