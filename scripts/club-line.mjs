// Point the club's phone number at the ring group, or back at the AI.
//
//   node scripts/club-line.mjs status
//   node scripts/club-line.mjs ring   <- both owners' phones ring, voicemail to Slack
//   node scripts/club-line.mjs ai     <- the Bland receptionist answers
//
// A phone number's routing lives in ONE place, Twilio's voice webhook, so this
// is genuinely a switch rather than a migration. The AI side is untouched
// either way: the persona, its tools and its knowledge base stay exactly as
// they are and simply stop receiving calls.
//
// Bland sets THREE fields, not one. voice_url is the obvious one;
// voice_fallback_url is what Twilio uses when the first is unreachable, and
// status_callback is how Bland learns a call ended. Restoring only voice_url
// would look like it worked and leave the agent subtly broken, so all three are
// saved here the first time we switch away, and written back together.

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = path.join(__dirname, "..", "bland", "config.json");

const SID = process.env.TWILIO_ACCOUNT_SID;
const TOKEN = process.env.TWILIO_AUTH_TOKEN;
const NUMBER = process.env.CLUB_PHONE_NUMBER || "+19715217887";
const SITE = process.env.SITE_BASE_URL || "https://www.foundrypadel.com";

if (!SID || !TOKEN) {
  console.error("Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN (railway run ...).");
  process.exit(1);
}

const auth = `Basic ${Buffer.from(`${SID}:${TOKEN}`).toString("base64")}`;
const api = `https://api.twilio.com/2010-04-01/Accounts/${SID}/IncomingPhoneNumbers`;

async function twilio(url, form) {
  const res = await fetch(url, {
    method: form ? "POST" : "GET",
    headers: {
      authorization: auth,
      ...(form ? { "content-type": "application/x-www-form-urlencoded" } : {}),
    },
    ...(form ? { body: new URLSearchParams(form).toString() } : {}),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`Twilio ${res.status}: ${body.message || JSON.stringify(body)}`);
  return body;
}

function readConfig() {
  try {
    return JSON.parse(readFileSync(CONFIG_PATH, "utf8"));
  } catch {
    return {};
  }
}

const FIELDS = ["voice_url", "voice_method", "voice_fallback_url", "status_callback"];

function describe(n) {
  const url = n.voice_url || "";
  const mode = url.includes("bland.ai") ? "AI (Bland receptionist)" : url.includes("/api/voice/transfer") ? "RING GROUP (both owners)" : "something else";
  return { mode, ...Object.fromEntries(FIELDS.map((f) => [f, n[f] || ""])) };
}

const [mode] = process.argv.slice(2);

const found = await twilio(`${api}.json?PhoneNumber=${encodeURIComponent(NUMBER)}`);
const number = found.incoming_phone_numbers?.[0];
if (!number) throw new Error(`${NUMBER} is not on this Twilio account`);

if (!mode || mode === "status") {
  console.log(`${NUMBER}\n`, JSON.stringify(describe(number), null, 1));
  process.exit(0);
}

const config = readConfig();

if (mode === "ring") {
  // Save Bland's routing before overwriting it, and only the first time: a
  // second run would otherwise save the ring group over the very thing it is
  // meant to preserve, and "put it back to AI" would put it back to itself.
  if (!config.twilio_ai_routing && (number.voice_url || "").includes("bland.ai")) {
    config.twilio_ai_routing = Object.fromEntries(FIELDS.map((f) => [f, number[f] || ""]));
    writeConfig(config);
    console.log("[club-line] saved Bland's routing to bland/config.json");
  }
  const updated = await twilio(`${api}/${number.sid}.json`, {
    VoiceUrl: `${SITE}/api/voice/transfer`,
    VoiceMethod: "POST",
    // Blanked deliberately. Left pointing at Bland, a momentary blip on our
    // side would silently hand a caller to an AI the owners have not launched.
    VoiceFallbackUrl: "",
    StatusCallback: "",
  });
  console.log(`[club-line] ${NUMBER} now rings both owners\n`, JSON.stringify(describe(updated), null, 1));
} else if (mode === "ai") {
  const saved = config.twilio_ai_routing;
  if (!saved?.voice_url) {
    console.error("No saved Bland routing in bland/config.json. Re-run scripts/deploy-bland-agent.mjs, which reattaches the number.");
    process.exit(1);
  }
  const updated = await twilio(`${api}/${number.sid}.json`, {
    VoiceUrl: saved.voice_url,
    VoiceMethod: saved.voice_method || "POST",
    VoiceFallbackUrl: saved.voice_fallback_url || "",
    StatusCallback: saved.status_callback || "",
  });
  console.log(`[club-line] ${NUMBER} back on the AI receptionist\n`, JSON.stringify(describe(updated), null, 1));
  console.log("Point Bland's transfer at the ring group so a handoff still reaches both owners:");
  console.log("  TRANSFER_PHONE_NUMBER=+15035637442 node scripts/deploy-bland-agent.mjs");
} else {
  console.error(`Unknown mode ${mode}. Use: status, ring, ai`);
  process.exit(1);
}

function writeConfig(next) {
  writeFileSync(CONFIG_PATH, `${JSON.stringify(next, null, 2)}\n`);
}
