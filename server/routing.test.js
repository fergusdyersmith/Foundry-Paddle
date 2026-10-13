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
  // A page that shares its name with a folder, as /juniors does with juniors/waiver.html.
  writeFileSync(path.join(dir, "juniors.html"), page("juniors"));
  mkdirSync(path.join(dir, "juniors"));
  writeFileSync(path.join(dir, "juniors", "waiver.html"), page("waiver"));
  mkdirSync(path.join(dir, "assets"));
  writeFileSync(path.join(dir, "assets", "app-abc123.js"), "console.log(1)");
  writeFileSync(path.join(dir, "robots.txt"), "User-agent: *\nAllow: /\n");
  mkdirSync(path.join(dir, ".vite"));
  writeFileSync(path.join(dir, ".vite", "manifest.json"), "{}");
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

describe("a page that is also a folder", () => {
  it("serves /juniors itself, not a 301 to /juniors/ (the URL on the printed ad)", async () => {
    ctx = await boot();
    expect(await status(ctx.base, "/juniors")).toBe(200);
    expect(await status(ctx.base, "/juniors/waiver")).toBe(200);
    expect(await status(ctx.base, "/juniors/")).toBe(200);
  });
});

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

  // `Location: //evil.example/x` is a redirect to another site.
  it.each([
    ["/fullsite//evil.example/x", "/evil.example/x"],
    ["/fullsite/\\evil.example", "/evil.example"],
    ["/fullsite/\\/evil.example", "/evil.example"],
  ])("never 301s off-site: %s -> %s", async (from, to) => {
    ctx = await boot();
    const res = await rawGet(ctx.base, from);
    expect(res.status).toBe(301);
    expect(res.location).toBe(to);
  });
});

describe("response headers", () => {
  it("refuses framing everywhere but the court screen, and says nothing about Express", async () => {
    ctx = await boot();
    const page = await fetch(`${ctx.base}/book`);
    expect(page.headers.get("x-frame-options")).toBe("SAMEORIGIN");
    expect(page.headers.get("x-content-type-options")).toBe("nosniff");
    expect(page.headers.get("x-powered-by")).toBeNull();
    const tv = await fetch(`${ctx.base}/tv`);
    expect(tv.headers.get("x-frame-options")).toBeNull();
  });

  it("caches hashed assets for good, and keeps Vite's manifest private", async () => {
    ctx = await boot();
    const asset = await fetch(`${ctx.base}/assets/app-abc123.js`);
    expect(asset.headers.get("cache-control")).toBe("public, max-age=31536000, immutable");
    expect(await status(ctx.base, "/.vite/manifest.json")).toBe(404);
  });

  it("reports (but does not enforce) a CSP on pages, and leaves the API and /join alone", async () => {
    ctx = await boot();
    const page = await fetch(`${ctx.base}/book`);
    const policy = page.headers.get("content-security-policy-report-only");
    expect(policy).toContain("object-src 'none'");
    expect(policy).toContain("report-uri /api/csp-report");
    // The enforced header is still only the framing rule.
    expect(page.headers.get("content-security-policy")).toBe("frame-ancestors 'self'");
    const api = await fetch(`${ctx.base}/api/csp-report`, { method: "POST" });
    expect(api.headers.get("content-security-policy-report-only")).toBeNull();
  });

  it("logs a CSP report once, in either format, and answers 204", async () => {
    ctx = await boot();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const report = {
      "csp-report": {
        "document-uri": "https://www.foundrypadel.com/book?t=secret",
        "effective-directive": "script-src-elem",
        "blocked-uri": "https://evil.example/x.js",
      },
    };
    const post = (type, body) =>
      fetch(`${ctx.base}/api/csp-report`, { method: "POST", headers: { "Content-Type": type }, body: JSON.stringify(body) });
    expect((await post("application/csp-report", report)).status).toBe(204);
    expect((await post("application/csp-report", report)).status).toBe(204);
    const lines = warn.mock.calls.map((c) => c[0]).filter((l) => String(l).startsWith("[csp]"));
    expect(lines).toEqual(["[csp] would block script-src-elem: https://evil.example/x.js on /book"]);
    await post("application/reports+json", [
      { type: "csp-violation", body: { documentURL: "https://www.foundrypadel.com/", effectiveDirective: "frame-src", blockedURL: "https://x.example/" } },
    ]);
    expect(warn.mock.calls.map((c) => c[0])).toContain("[csp] would block frame-src: https://x.example/ on /");
    // The query string is dropped: it can carry a visitor id, and a new one on every hit
    // would log every hit.
    for (const cid of ["1.1", "2.2"]) {
      await post("application/csp-report", {
        "csp-report": { "document-uri": "https://www.foundrypadel.com/", "effective-directive": "connect-src", "blocked-uri": `https://ga.example/g/collect?v=2&cid=${cid}` },
      });
    }
    expect(warn.mock.calls.map((c) => c[0]).filter((l) => String(l).includes("ga.example"))).toEqual([
      "[csp] would block connect-src: https://ga.example/g/collect on /",
    ]);
    warn.mockRestore();
  });

  it("answers a malformed JSON body with a JSON 400, not a stack trace", async () => {
    ctx = await boot();
    const res = await fetch(`${ctx.base}/api/interest`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{not json",
    });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Bad request" });
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
