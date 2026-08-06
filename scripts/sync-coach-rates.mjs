#!/usr/bin/env node
/**
 * One command to update every coach's private-lesson price, everywhere.
 *
 *   node scripts/sync-coach-rates.mjs            # dry run, shows the diff
 *   node scripts/sync-coach-rates.mjs --apply    # writes all four places
 *
 * WHY THIS EXISTS
 * A coach's rate lives in four places and they drift apart. On 2026-08-06 all four
 * disagreed, three of the five published prices were wrong, and one had been wrong
 * for months. Doing it by hand is four steps across three systems, which is exactly
 * the kind of chore that gets half-finished.
 *
 *   1. Playtomic coach_pricing_rules       the truth, what a customer pays
 *   2. Coach.profile_json["private_rate"]  the Kumi admin panel
 *   3. ClubKnowledge                       the chatbot's "rates run from $X to $Y"
 *   4. coaches.ts                          this website
 *
 * The VPS half (coach_rates_export.py) re-syncs from Playtomic and does 1 -> 2 and
 * 1 -> 3. This half does 1 -> 4. All the presentation logic (when to say "From $X",
 * how to collapse equal group prices) lives in the Python so there is one place to
 * change it, and it is unit-tested there.
 *
 * A human stays in the loop ON PURPOSE. Publishing straight from Playtomic would put
 * an unreviewed number on the marketing site: a coach typing $9 instead of $90 would
 * be live in minutes. You see the diff and decide.
 *
 * IMPORTANT: Playtomic's prices already INCLUDE the court. Never add the $40 court
 * fee to them — doing that is what produced the wrong numbers.
 *
 * Eugene has no Playtomic pricing rules, so his entry is deliberately left untouched
 * and must be edited by hand until he sets pricing up.
 */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const COACHES_TS = resolve(HERE, "../fullsite/src/constants/coaches.ts");
const VPS = "root@164.90.239.49";
const REMOTE =
  "cd /home/padelclublist/padelclublist && set -a; . .env.service; set +a; " +
  "venv/bin/python scripts/coach_rates_export.py";

const apply = process.argv.includes("--apply");

function fetchRates() {
  const cmd = apply ? `${REMOTE} --apply >/dev/null 2>&1; ${REMOTE} --json` : `${REMOTE} --json`;
  const raw = execFileSync("ssh", ["-o", "StrictHostKeyChecking=no", VPS, cmd], {
    encoding: "utf8",
    maxBuffer: 8 * 1024 * 1024,
  });
  const start = raw.indexOf("{");
  if (start < 0) throw new Error(`no JSON from the VPS:\n${raw.slice(0, 400)}`);
  return JSON.parse(raw.slice(start));
}

/** Replace one `key: "..."` inside a specific coach's privateLessons block. */
function setField(src, coachName, key, value) {
  const at = src.indexOf(`name: "${coachName}"`);
  if (at < 0) return { src, changed: false, reason: "not in coaches.ts" };
  const blockStart = src.indexOf("privateLessons: {", at);
  if (blockStart < 0) return { src, changed: false, reason: "no privateLessons block" };
  const blockEnd = src.indexOf("},", blockStart);
  const block = src.slice(blockStart, blockEnd);

  // Only ever a double-quoted string, possibly wrapped onto the next line by the
  // formatter. Anything else and we bail rather than corrupting the file.
  const re = new RegExp(`(\\b${key}:\\s*\\n?\\s*)"((?:[^"\\\\]|\\\\.)*)"`);
  const m = block.match(re);
  if (!m) return { src, changed: false, reason: `no ${key} field` };
  if (m[2] === value) return { src, changed: false, reason: "same" };

  const updated = block.replace(re, (_, lead) => `${lead}${JSON.stringify(value)}`);
  return {
    src: src.slice(0, blockStart) + updated + src.slice(blockEnd),
    changed: true,
    from: m[2],
  };
}

const { coaches } = fetchRates();
let src = readFileSync(COACHES_TS, "utf8");
const edits = [];
const skipped = [];

// ONLY `rate` is synced by default, because only `rate` is purely mechanical.
//
// `detail` and `availability` both carry human editing that generated text would
// delete: Carlos's "Packages available.", Juan's "(weekdays 3–5 PM and Friday
// mornings)", Ryan's "(peak)". And the generated availability is simply worse prose,
// since Carlos's two rules over the same days render as two clauses where the hand
// copy merges them. So they are PRINTED as suggestions below and you merge the price
// half yourself, keeping your own notes.
//
// Pass --detail or --availability to overwrite them anyway.
const FIELDS = ["rate"];
if (process.argv.includes("--detail")) FIELDS.push("detail");
if (process.argv.includes("--availability")) FIELDS.push("availability");

for (const [name, d] of Object.entries(coaches)) {
  for (const key of FIELDS) {
    if (!d[key]) continue;
    const r = setField(src, name, key, d[key]);
    if (r.changed) {
      src = r.src;
      edits.push({ name, key, from: r.from, to: d[key] });
    } else if (r.reason && r.reason !== "same") {
      skipped.push(`${name}.${key}: ${r.reason}`);
    }
  }
}

if (!edits.length) {
  console.log("coaches.ts already matches Playtomic. Nothing to do.");
} else {
  for (const e of edits) {
    console.log(`\n${e.name}  ${e.key}`);
    console.log(`  - ${e.from}`);
    console.log(`  + ${e.to}`);
  }
}
if (skipped.length) {
  console.log(`\nnot patched (edit by hand if needed):\n  ${skipped.join("\n  ")}`);
}

// Advisory only: what the group prices and windows currently are in Playtomic, so a
// stale `detail` is visible without the script overwriting anyone's notes.
const advisory = [];
for (const [name, d] of Object.entries(coaches)) {
  for (const key of ["detail", "availability"]) {
    if (FIELDS.includes(key) || !d[key]) continue;
    const at = src.indexOf(`name: "${name}"`);
    if (at < 0) continue;
    const cur = src.slice(at, src.indexOf("},", src.indexOf("privateLessons: {", at)));
    const m = cur.match(new RegExp(`\\b${key}:\\s*\\n?\\s*"((?:[^"\\\\]|\\\\.)*)"`));
    if (m && m[1] !== d[key]) advisory.push(`${name}.${key}\n    now: ${m[1]}\n    playtomic: ${d[key]}`);
  }
}
if (advisory.length) {
  console.log(
    "\nFYI, Playtomic differs here but these hold hand-written notes, so merge by hand\n" +
    "(or --detail / --availability to overwrite):\n  " + advisory.join("\n  "),
  );
}

if (apply && edits.length) {
  writeFileSync(COACHES_TS, src);
  console.log(`\nWrote ${COACHES_TS}`);
  console.log("Kumi and the chatbot were updated on the VPS.");
  console.log("Now: git diff, then commit and push upstream HEAD:main to deploy.");
} else if (edits.length) {
  console.log("\nDRY RUN, nothing written. Re-run with --apply");
}
