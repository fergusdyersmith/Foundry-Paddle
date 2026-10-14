/**
 * Keeps the phone receptionist's knowledge in step with the club's published facts.
 *
 * Kelly, 2026-10-14: the website chatbot reads Kumi's public facts live, but the Bland phone
 * agent only learned a change when somebody ran two scripts by hand, and that day it had
 * not heard of the Foundry League or the new app tabs.
 *
 * Once an hour this asks whether the base the agent is ACTUALLY on (the persona's production
 * version, read from Bland) was built from the facts as they stand now: every base carries a
 * fingerprint of its facts in its description ("sha:<hash>", scripts/sync-bland-kb.mjs). When
 * it was not, it runs the same two scripts a person would, in the order that never leaves the
 * agent on a deleted base:
 *
 *   1. sync-bland-kb.mjs --push --keep-previous   a new base; the old one stays
 *   2. deploy-bland-agent.mjs                      the agent moved onto it, and verified
 *   3. delete the old base                         only once step 2 said "verified"
 *
 * ONLY OVERNIGHT (1am to 5am club time, BLAND_SYNC_HOURS="1-5"): the agent deploy rewrites the
 * persona and the number's setup, and doing that in the middle of somebody's call is the one
 * way this could hurt. A fact published in the afternoon is on the phone by morning;
 * runOnce({ force: true }) does it now.
 *
 * Bland cannot update a base's text in place (PUT changes the name only), which is why each
 * sync is a new base. A failure anywhere stops there, leaves the agent on whatever base it was
 * verified on, and says so in Slack. Nothing here commits to git: the live id is read from
 * Bland each time, so bland/config.json in the repo is no longer what decides which base gets
 * deleted.
 */
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CONFIG_PATH = path.join(ROOT, "bland", "config.json");
const SCRIPT_TIMEOUT_MS = 5 * 60 * 1000;

async function blandFetch(apiKey, pathname, { method = "GET" } = {}) {
  const res = await fetch(`https://api.bland.ai${pathname}`, {
    method,
    headers: { authorization: apiKey },
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

/** Run one of the repo's scripts with this process's environment (Railway's variables),
 *  plus `extra`. Resolves {code, out}; never rejects. */
function runScript(script, args = [], extra = {}) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [path.join(ROOT, script), ...args], {
      cwd: ROOT,
      env: { ...process.env, ...extra },
    });
    let out = "";
    const take = (b) => { out += b.toString(); };
    child.stdout.on("data", take);
    child.stderr.on("data", take);
    const timer = setTimeout(() => child.kill("SIGKILL"), SCRIPT_TIMEOUT_MS);
    child.on("close", (code) => { clearTimeout(timer); resolve({ code: code ?? 1, out }); });
    child.on("error", (e) => { clearTimeout(timer); resolve({ code: 1, out: out + String(e) }); });
  });
}

/** Failures only: a quiet success needs nobody. */
async function postSlack(text) {
  const token = process.env.SLACK_BOT_TOKEN;
  const channel = process.env.BLAND_SYNC_SLACK_CHANNEL || "#club-ops";
  if (!token) return;
  try {
    await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ channel, text }),
    });
  } catch (e) {
    console.error("[bland-sync] slack post failed:", e.message);
  }
}

/** The BYOT key the agent deploy needs, kept in the number's voice URL in the config. */
export function encryptedKey(config) {
  try {
    const url = new URL(config?.twilio_ai_routing?.voice_url || "");
    return url.searchParams.get("encrypted_key") || "";
  } catch {
    return "";
  }
}

/** [from, to) local hours the sync may run in, from "1-5". */
export function syncHours(spec = process.env.BLAND_SYNC_HOURS || "1-5") {
  const m = /^(\d{1,2})-(\d{1,2})$/.exec(String(spec).trim());
  return m ? [Number(m[1]), Number(m[2])] : [1, 5];
}

export function localHour(now = new Date(), timeZone = process.env.CLUB_TIMEZONE || "America/Los_Angeles") {
  return Number(new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", hourCycle: "h23" }).format(now));
}

export function createBlandAutoSync({
  apiKey = process.env.BLAND_API_KEY,
  intervalMs = 60 * 60 * 1000,
  initialDelayMs = 10 * 60 * 1000,
  loadKnowledge,
  docHash,
  hashTag = "sha:",
  bland = (p, o) => blandFetch(apiKey, p, o),
  run = runScript,
  notify = postSlack,
  readConfig = () => JSON.parse(readFileSync(CONFIG_PATH, "utf8")),
  log = (...a) => console.log("[bland-sync]", ...a),
  hours = syncHours(),
  hourNow = () => localHour(),
} = {}) {
  let busy = false;
  let timers = [];

  async function knowledgeFns() {
    if (loadKnowledge && docHash) return { loadKnowledge, docHash };
    const m = await import("../scripts/sync-bland-kb.mjs");
    return { loadKnowledge: m.loadKnowledge, docHash: m.docHash };
  }

  /** {id, description} of the base on the persona's production version, or null. */
  async function liveBase(config) {
    if (!config?.persona_id) return null;
    const persona = await bland(`/v1/personas/${config.persona_id}`);
    const id = persona.json?.data?.current_production_version?.kb_ids?.[0];
    if (!id) return null;
    const kb = await bland(`/v1/knowledge/${id}`);
    const data = kb.json?.data || kb.json || {};
    return { id, description: String(data.description || "") };
  }

  async function runOnce({ force = false } = {}) {
    if (!force) {
      const h = hourNow();
      if (h < hours[0] || h >= hours[1]) return { skipped: "daytime" };
    }
    if (busy) return { skipped: "busy" };
    busy = true;
    try {
      const fns = await knowledgeFns();
      const { all } = await fns.loadKnowledge();
      const hash = fns.docHash(all);
      const config = readConfig();
      const live = await liveBase(config);
      if (live && live.description.includes(`${hashTag}${hash}`)) {
        return { changed: false, base: live.id };
      }
      log(`facts changed (${hash}); live base ${live?.id || "unknown"} is out of date`);

      const push = await run("scripts/sync-bland-kb.mjs", ["--push", "--keep-previous"]);
      const created = /\[kb\] created ([0-9a-f-]{36})/.exec(push.out)?.[1];
      if (push.code !== 0 || !created) {
        throw new Error(`the new knowledge base was not created: ${push.out.trim().split("\n").slice(-2).join(" ")}`);
      }

      const deploy = await run("scripts/deploy-bland-agent.mjs", [], {
        BLAND_ENCRYPTED_KEY: encryptedKey(config),
      });
      if (deploy.code !== 0 || !/verified: knowledge base and tools are live/.test(deploy.out)) {
        throw new Error(
          `created ${created} but the agent deploy did not verify, so the old base ` +
            `${live?.id || "?"} was left in place: ${deploy.out.trim().split("\n").slice(-2).join(" ")}`,
        );
      }

      if (live?.id && live.id !== created) {
        const del = await bland(`/v1/knowledge/${live.id}`, { method: "DELETE" });
        if (del.status >= 400) log(`could not delete the previous base ${live.id} (${del.status})`);
      }
      log(`the phone agent is on ${created} (${all.length} facts)`);
      return { changed: true, created, previous: live?.id || null };
    } catch (error) {
      log(`FAILED: ${error.message}`);
      await notify(`📞 The phone receptionist's knowledge did not sync: ${error.message}`);
      return { error: error.message };
    } finally {
      busy = false;
    }
  }

  return {
    runOnce,
    start() {
      if (!apiKey) return;
      timers = [setTimeout(runOnce, initialDelayMs), setInterval(runOnce, intervalMs)];
    },
    stop() {
      for (const t of timers) { clearTimeout(t); clearInterval(t); }
      timers = [];
    },
  };
}
