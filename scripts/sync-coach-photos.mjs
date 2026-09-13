#!/usr/bin/env node
/**
 * Mirror every coach's headshot into the repo, so the site never hotlinks Playtomic.
 *
 *   node scripts/sync-coach-photos.mjs            # dry run: what would change
 *   node scripts/sync-coach-photos.mjs --apply    # download + rewrite coaches.ts
 *
 * WHY THIS EXISTS
 * coaches.ts used to point `photo` straight at res.cloudinary.com/playtomic. That
 * URL ends in the upload timestamp, so it is not a stable address for "this coach's
 * photo" — it is an address for ONE photo. On 2026-09-12 Kelly changed his picture in
 * Playtomic, the old object 404'd, and the coaching page quietly served the grey
 * placeholder. Nothing was broken on our side and nothing alerted; the photo was just
 * gone. Every other coach is one profile edit away from the same thing.
 *
 * So the bytes live in fullsite/public/coaches/<id>.jpg, committed, and `photo` is a
 * local path. A coach editing Playtomic can no longer break the page: the worst case
 * is a stale-but-present photo, which this script (re-run) fixes.
 *
 * WHERE THE UPSTREAM URL COMES FROM
 * Playtomic has no coaches endpoint. Kumi derives the roster from the classes API,
 * which carries each assigned coach's `picture`, and keeps Coach.photo_url current
 * (app/services/coaching/coach_sync.py). So Kumi is the freshest source we have, and
 * this reads it over ssh the same way sync-coach-rates.mjs reads the pricing rules.
 *
 * A coach Kumi has no photo for (not currently assigned to a class) keeps whatever
 * remote URL coaches.ts already had, and that is what gets mirrored — that is how
 * Jack and Axel came in. Coaches already on a local path with no upstream are left
 * alone; Tato's photo was never from Playtomic.
 *
 * A human stays in the loop on purpose: running this without --apply prints the drift,
 * so nobody wakes up to a coach's new selfie auto-published on the marketing site.
 *
 * PINNING
 * Some coaches' Playtomic pictures are team podium shots, not headshots (Juan, Axel).
 * Drop a better image in at fullsite/public/coaches/<id>.jpg by hand and set
 * "pin": true on that coach in scripts/coach-photos.manifest.json; this leaves pinned coaches alone
 * forever after, so a Playtomic edit cannot overwrite a photo we chose on purpose.
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const COACHES_TS = resolve(HERE, "../fullsite/src/constants/coaches.ts");
const PHOTO_DIR = resolve(HERE, "../fullsite/public/coaches");
// Deliberately NOT inside public/ — it is bookkeeping for this script, not an
// asset the site should publish at /coaches/manifest.json.
const MANIFEST = resolve(HERE, "coach-photos.manifest.json");
const PUBLIC_PREFIX = "/coaches/";

const VPS = "root@164.90.239.49";
const CLUB_ID = 6; // Foundry Padel's wa_club_tenant id

// Cloudinary serves the original at whatever the coach uploaded (some are 3-4 MB,
// some are a 2:1 landscape action shot). The page renders every coach as a square,
// so ask Cloudinary for the square: g_auto picks the crop around the subject, where
// CSS object-cover would take the blind middle and cut Kelly in half.
const CLOUDINARY_TRANSFORM = "c_fill,g_auto,w_800,h_800,q_auto:good";

const apply = process.argv.includes("--apply");
// Re-fetch even photos whose upstream URL has not moved — for when the transform above
// changes, or a mirrored file is suspect.
const force = process.argv.includes("--force");

/** Coach rows from Kumi: the roster Playtomic's classes API last reported. */
function fetchKumiCoaches() {
  const py = `
import json, app.main  # noqa: F401
from sqlmodel import Session, select
from app.core.database import engine
from app.models.coaching import Coach
with Session(engine) as s:
    rows = s.exec(select(Coach).where(Coach.club_id == ${CLUB_ID})).all()
print("<<JSON>>" + json.dumps([
    {"name": (c.name or "").strip(), "photo_url": c.photo_url} for c in rows
]))
`.trim();
  const remote =
    "cd /home/padelclublist/padelclublist && set -a; . .env.service; set +a; " +
    // Importing app.main prints a startup banner and a wall of pydantic deprecation
    // warnings on stderr; none of it is ours to fix, so drop it.
    `venv/bin/python - 2>/dev/null <<'PYEOF'\n${py}\nPYEOF`;
  const raw = execFileSync("ssh", ["-o", "StrictHostKeyChecking=no", VPS, remote], {
    encoding: "utf8",
    maxBuffer: 8 * 1024 * 1024,
  });
  // The app logs a banner and pydantic warnings on import, so the payload is fenced.
  const at = raw.indexOf("<<JSON>>");
  if (at < 0) throw new Error(`no JSON from the VPS:\n${raw.slice(-800)}`);
  return JSON.parse(raw.slice(at + 8).trim());
}

/** The coaches.ts roster, as {id, name, aliases, photo, at} in file order. */
function parseCoaches(src) {
  const out = [];
  const idRe = /\bid:\s*"([^"]+)"/g;
  let m;
  while ((m = idRe.exec(src)) !== null) {
    const id = m[1];
    const next = idRe.lastIndex;
    const end = src.indexOf('\n  {', next) < 0 ? src.length : src.indexOf('\n  {', next);
    const block = src.slice(next, end);
    const name = block.match(/\bname:\s*"([^"]*)"/)?.[1];
    const photoM = block.match(/(\bphoto:\s*\n?\s*)"((?:[^"\\]|\\.)*)"/);
    const aliases = [...(block.match(/\baliases:\s*\[([^\]]*)\]/)?.[1] ?? "").matchAll(/"([^"]*)"/g)]
      .map((a) => a[1]);
    if (!name || !photoM) continue;
    out.push({ id, name, aliases, photo: photoM[2], at: next + photoM.index, raw: photoM[0] });
  }
  return out;
}

/** Same matching rule the site uses for class coach names (see coachMatchesName). */
function matchKumi(coach, kumi) {
  const forms = [coach.name, ...coach.aliases].map((s) => s.toLowerCase().trim());
  return kumi.find((k) => {
    const n = k.name.toLowerCase().trim();
    return forms.some((f) => n === f || n.startsWith(f + " ") || f.startsWith(n + " "));
  });
}

/** Ask Cloudinary for a page-sized copy instead of the coach's multi-megabyte upload. */
function sized(url) {
  return url.replace(
    /(res\.cloudinary\.com\/playtomic\/image\/upload\/)[^/]+(\/)/,
    `$1${CLOUDINARY_TRANSFORM}$2`,
  );
}

const EXT = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

async function download(url) {
  const res = await fetch(sized(url), { redirect: "follow" });
  const type = (res.headers.get("content-type") || "").split(";")[0].trim();
  // A dead Cloudinary object answers 404 with a 1x1 gif, so trust the status, not the type.
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const ext = EXT[type];
  if (!ext) throw new Error(`unexpected content-type ${type || "(none)"}`);
  const bytes = Buffer.from(await res.arrayBuffer());
  if (bytes.length < 1024) throw new Error(`suspiciously small (${bytes.length} bytes)`);
  return { bytes, ext, sha: createHash("sha256").update(bytes).digest("hex").slice(0, 16) };
}

const src0 = readFileSync(COACHES_TS, "utf8");
const roster = parseCoaches(src0);
const kumi = fetchKumiCoaches();
const manifest = existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, "utf8")) : {};

const planned = [];
const skipped = [];

for (const coach of roster) {
  const local = coach.photo.startsWith(PUBLIC_PREFIX);
  const previous = manifest[coach.id];
  if (previous?.pin) {
    skipped.push(`${coach.id}: pinned in coach-photos.manifest.json — Playtomic will not overwrite it`);
    continue;
  }
  // Kumi's URL wins when it has one; otherwise fall back to whatever we mirrored last,
  // then to the remote URL still sitting in coaches.ts.
  const upstream =
    matchKumi(coach, kumi)?.photo_url ||
    previous?.source ||
    (local ? null : coach.photo);

  if (!upstream) {
    skipped.push(`${coach.id}: no upstream photo (Kumi has none, and ${coach.photo} is local)`);
    continue;
  }
  if (!force && local && previous?.source === upstream && existsSync(resolve(PHOTO_DIR, coach.photo.slice(PUBLIC_PREFIX.length)))) {
    continue; // already mirrored, and Playtomic still points at the same object
  }
  const reason = !local ? "not mirrored yet" : previous?.source === upstream ? "re-fetch" : "photo changed upstream";
  planned.push({ coach, upstream, reason });
}

if (skipped.length) {
  console.log("Left alone:");
  for (const s of skipped) console.log(`  ${s}`);
  console.log("");
}

if (!planned.length) {
  console.log("Every coach photo is mirrored and current. Nothing to do.");
  process.exit(0);
}

console.log(apply ? "Mirroring:" : "Would mirror (dry run, pass --apply):");
let src = src0;
const edits = [];

for (const { coach, upstream, reason } of planned) {
  process.stdout.write(`  ${coach.id.padEnd(8)} ${reason} … `);
  let got;
  try {
    got = await download(upstream);
  } catch (err) {
    console.log(`FAILED: ${err.message}`);
    // A 404 here is the exact bug this script exists to absorb: the upstream photo is
    // already gone. Keep the mirrored copy we have rather than blanking the page.
    continue;
  }
  const file = `${coach.id}.${got.ext}`;
  const publicPath = PUBLIC_PREFIX + file;
  console.log(`${(got.bytes.length / 1024).toFixed(0)} KB -> ${publicPath}`);

  if (apply) {
    mkdirSync(PHOTO_DIR, { recursive: true });
    writeFileSync(resolve(PHOTO_DIR, file), got.bytes);
    manifest[coach.id] = {
      source: upstream,
      file: publicPath,
      sha256: got.sha,
      bytes: got.bytes.length,
      fetchedAt: new Date().toISOString().slice(0, 10),
    };
  }
  if (coach.photo !== publicPath) {
    edits.push({ id: coach.id, from: coach.photo, to: publicPath });
    src = src.replace(coach.raw, `photo: ${JSON.stringify(publicPath)}`);
  }
}

if (edits.length) {
  console.log("\ncoaches.ts:");
  for (const e of edits) console.log(`  ${e.id}\n    - ${e.from}\n    + ${e.to}`);
}

if (!apply) {
  console.log("\nDry run. Re-run with --apply to write the files.");
  process.exit(0);
}

if (src !== src0) writeFileSync(COACHES_TS, src);
writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + "\n");
console.log(`\nWrote ${PHOTO_DIR} and ${MANIFEST}`);
if (src !== src0) console.log(`Wrote ${COACHES_TS}`);
console.log("Commit the images with the code change — they ship in the Vite build.");
