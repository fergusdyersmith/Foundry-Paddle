/**
 * @vitest-environment node
 *
 * What the static-site routes answer, as a status code.
 *
 * These are SEO regressions, not user-visible ones: every case below renders a
 * plausible-looking page in a browser whichever way it behaves, so only the
 * status code tells you it broke. The one that already bit us is the soft 404 —
 * an unknown path used to fall through to index.html at 200, which served
 * homepage markup from a dead URL and kept retired Squarespace paths (/home,
 * /about) alive in Google's index.
 *
 * The fixture below stands in for a real build (SITE_DIST), so these run without
 * `npm run build:railway` and stay fast.
 */
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import http from "http";
import path from "path";

/** A stand-in for dist/: the prerendered files server.js looks for by name. */
function buildFixture() {
  const dir = mkdtempSync(path.join(tmpdir(), "foundry-dist-"));
  const page = (name) => `<!DOCTYPE html><html><head><title>${name}</title></head><body>${name}</body></html>`;
  for (const route of ["index", "book", "memberships", "community", "tv", "404"]) {
    writeFileSync(path.join(dir, `${route}.html`), page(route));
  }
  mkdirSync(path.join(dir, "assets"));
  writeFileSync(path.join(dir, "assets", "app-abc123.js"), "console.log(1)");
  writeFileSync(path.join(dir, "robots.txt"), "User-agent: *\nAllow: /\n");
  return dir;
}

let fixture;
let ctx;

/** A fresh copy of the module, since the dist path is resolved at import time. */
async function boot({ dist = fixture } = {}) {
  vi.resetModules();
  process.env.SITE_DIST = dist;
  const { app } = await import("../server.js");
  const server = app.listen(0);
  await new Promise((r) => server.once("listening", r));
  return {
    base: `http://127.0.0.1:${server.address().port}`,
    close: () => new Promise((r) => server.close(r)),
  };
}

/** Status only, and never follow the redirect — the hop itself is the assertion. */
const status = async (base, urlPath) =>
  (await fetch(`${base}${urlPath}`, { redirect: "manual" })).status;

/** Raw request, because fetch() forbids setting Host and the apex rule reads it. */
function rawGet(base, urlPath, headers = {}) {
  const { hostname, port } = new URL(base);
  return new Promise((resolve, reject) => {
    const req = http.request({ hostname, port, path: urlPath, headers }, (res) => {
      res.resume();
      resolve({ status: res.statusCode, location: res.headers.location });
    });
    req.on("error", reject);
    req.end();
  });
}

beforeAll(() => {
  fixture = buildFixture();
});

afterAll(() => {
  rmSync(fixture, { recursive: true, force: true });
  delete process.env.SITE_DIST;
});

afterEach(async () => {
  await ctx?.close();
  ctx = null;
});

// --- the soft-404 regression -------------------------------------------------------------

describe("unknown paths", () => {
  it.each([
    ["/home", "a retired Squarespace page"],
    ["/about", "a retired Squarespace page"],
    ["/nope/deep", "a nested path that never existed"],
    ["/Book", "the wrong case for a real route — dist filenames are lowercase"],
  ])("404s on %s (%s)", async (urlPath) => {
    ctx = await boot();
    // The bug this pins: a 200 here means Google sees homepage content at a
    // dead URL and reports a soft 404.
    expect(await status(ctx.base, urlPath)).toBe(404);
  });

  it("serves the prerendered 404 page, not the homepage", async () => {
    ctx = await boot();
    const res = await fetch(`${ctx.base}/home`);
    expect(res.status).toBe(404);
    expect(await res.text()).toContain("404");
  });

  it("still 404s when the build has no 404.html", async () => {
    // A build that drops the file must not resurrect the index.html fallback.
    const stripped = buildFixture();
    rmSync(path.join(stripped, "404.html"));
    ctx = await boot({ dist: stripped });
    expect(await status(ctx.base, "/home")).toBe(404);
    rmSync(stripped, { recursive: true, force: true });
  });

  it("404s on a missing asset rather than returning HTML", async () => {
    ctx = await boot();
    expect(await status(ctx.base, "/assets/gone-abc.js")).toBe(404);
  });
});

// --- what must keep working --------------------------------------------------------------

describe("real pages", () => {
  it.each([
    ["/", "the homepage"],
    ["/book", "a prerendered route"],
    ["/memberships", "a prerendered route"],
    ["/book/", "a trailing slash on a real route"],
    ["/community", "hidden but real (noindex, absent from the sitemap)"],
    ["/tv", "the operator wall screen"],
    ["/robots.txt", "a static file"],
    ["/assets/app-abc123.js", "a hashed asset"],
  ])("200s on %s (%s)", async (urlPath) => {
    ctx = await boot();
    expect(await status(ctx.base, urlPath)).toBe(200);
  });
});

// --- redirects that Search Console reports, and that we intend ---------------------------

describe("redirects", () => {
  it("sends the apex to www with the path intact", async () => {
    ctx = await boot();
    // Squarespace dropped the path on this hop, which is why it is a test.
    const res = await rawGet(ctx.base, "/book", { Host: "foundrypadel.com" });
    expect(res.status).toBe(301);
    expect(res.location).toBe("https://www.foundrypadel.com/book");
  });

  it.each([
    ["/fullsite/book", "/book"],
    ["/fullsite", "/"],
    ["/kumi", "/join"],
  ])("301s %s -> %s", async (from, to) => {
    ctx = await boot();
    const res = await fetch(`${ctx.base}${from}`, { redirect: "manual" });
    expect(res.status).toBe(301);
    expect(res.headers.get("location")).toBe(to);
  });
});

// --- the build-missing case --------------------------------------------------------------

describe("a broken deploy", () => {
  it("503s rather than 404ing the whole site when dist/ is empty", async () => {
    // Distinguishable on purpose: a 404 storm here would tell Google to drop
    // every page, where a 503 tells it to come back later.
    const empty = mkdtempSync(path.join(tmpdir(), "foundry-empty-"));
    ctx = await boot({ dist: empty });
    expect(await status(ctx.base, "/book")).toBe(503);
    rmSync(empty, { recursive: true, force: true });
  });
});
