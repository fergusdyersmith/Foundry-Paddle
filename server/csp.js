/**
 * Content Security Policy, ENFORCED since 2026-10-19.
 *
 * It ran report-only from 2026-10-12 to 2026-10-19 (48 deploys of real traffic); every
 * report left was Wistia's own telemetry or something a visitor's browser injected, so
 * the header switched to Content-Security-Policy. Browsers still post what they block to
 * /api/csp-report, which logs it as "[csp] blocked", and
 * `node scripts/csp-week-report.mjs` summarises those logs. A page that suddenly loses a
 * piece (the booking iframe, the Wistia video, analytics) after adding an outside source
 * needs that source added here.
 *
 * What each source is for:
 *   googletagmanager / google-analytics   GA4 (gtag in index.html)
 *   www.google.com                        also GA4: some hits go to www.google.com/g/collect
 *   fast.wistia.com / .net, akamaihd      the Wistia video on /the-sport
 *   fonts.googleapis / gstatic            the web fonts (index.css)
 *   playtomic.io / playtomic.com          the booking iframe on /book (.io redirects to .com)
 *   www.google.com (frame)                the map embed (footer, /contact)
 *   challenges.cloudflare.com             Turnstile on the signup forms (server/turnstile.js)
 *
 * Left out on purpose: Wistia's own telemetry, which costs the video nothing to block, so
 * expect it in the reports: browser.sentry-cdn.com and its ingest host (Wistia's error
 * tracker). Its Mux video analytics (*.litix.io, from wistia-mux.js) is also left out,
 * and since 2026-10-19 switched off in WistiaVideo.tsx (window.wistiaDisableMux).
 * Not ours either: eval, wasm-eval and odd third-party hosts on / (adware, extensions,
 * in-app browsers). Neither our bundle, gtag nor Turnstile's api.js uses eval or WebAssembly.
 * Wistia also asks for http:// copies of its files on a plain-http page (localhost);
 * those reports are a local-testing artifact, production is https throughout.
 *
 * script-src keeps 'unsafe-inline' for now: every prerendered page carries three inline
 * scripts (gtag's config, React Router's hydration data, vite-react-ssg's build hash), and
 * the hydration data differs per page. Replacing it with their hashes is on trial,
 * report-only, since 2026-10-19 (inlineTrialCsp below). Even with it, the policy limits
 * where scripts, frames and requests can come from, and forbids plugins, <base> hijacks
 * and off-site form posts.
 */
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const POLICY = {
  "default-src": ["'self'"],
  "script-src": [
    "'self'",
    "'unsafe-inline'",
    "https://www.googletagmanager.com",
    "https://fast.wistia.com",
    "https://fast.wistia.net",
    "https://challenges.cloudflare.com",
  ],
  "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://fast.wistia.com", "https://fast.wistia.net"],
  "font-src": ["'self'", "data:", "https://fonts.gstatic.com", "https://fast.wistia.com", "https://fast.wistia.net"],
  "img-src": ["'self'", "data:", "blob:", "https:"],
  "media-src": ["'self'", "blob:", "https://*.wistia.com", "https://*.wistia.net", "https://embedwistia-a.akamaihd.net"],
  "connect-src": [
    "'self'",
    "https://*.google-analytics.com",
    "https://*.analytics.google.com",
    "https://*.googletagmanager.com",
    "https://www.google.com",
    "https://*.wistia.com",
    "https://*.wistia.net",
    "https://embedwistia-a.akamaihd.net",
  ],
  "frame-src": [
    "https://playtomic.io",
    "https://*.playtomic.io",
    "https://playtomic.com",
    "https://*.playtomic.com",
    "https://www.google.com",
    "https://fast.wistia.net",
    "https://challenges.cloudflare.com",
  ],
  "worker-src": ["'self'", "blob:"],
  "object-src": ["'none'"],
  "base-uri": ["'self'"],
  "form-action": ["'self'"],
  "report-uri": ["/api/csp-report"],
};

export const CSP = Object.entries(POLICY)
  .map(([directive, sources]) => `${directive} ${sources.join(" ")}`)
  .join("; ");

/**
 * The trial for dropping 'unsafe-inline' from script-src, sent report-only beside the
 * enforced policy since 2026-10-19. The prerendered pages' own inline scripts are allowed
 * by hash, so what it reports is inline script that is NOT in the build: something Wistia,
 * gtag or a visitor's browser injects at runtime. Reports go to
 * /api/csp-report?trial=inline and log as "[csp-trial] would block", with the script's
 * first 40 characters ('report-sample'). Once a week of that is clean, the hashes join
 * POLICY's script-src. Keep 'unsafe-inline' beside them then: a browser that understands
 * hashes ignores it, and one too old to does not break the page.
 */
export function inlineTrialCsp(hashes) {
  const scriptSrc = POLICY["script-src"].filter((s) => s !== "'unsafe-inline'");
  return [
    `script-src ${[...scriptSrc, ...hashes.map((h) => `'sha256-${h}'`), "'report-sample'"].join(" ")}`,
    "report-uri /api/csp-report?trial=inline",
  ].join("; ");
}

/** The sha256 of every inline script in the built pages under `dir`, as CSP wants it.
 *  Read when the server starts, so the hashes always match the build it serves; a page
 *  rebuilt under a running server needs a restart. Five distinct across the site on
 *  2026-10-19: gtag's config, the build hash, and three variants of the hydration data. */
export function inlineScriptHashes(dir) {
  const hashes = new Set();
  const walk = (d) => {
    let entries;
    try {
      entries = readdirSync(d, { withFileTypes: true });
    } catch {
      return; // no build yet (or a test fixture without one)
    }
    for (const e of entries) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) {
        if (e.name !== "assets" && !e.name.startsWith(".")) walk(p);
        continue;
      }
      if (!e.name.endsWith(".html")) continue;
      for (const [, attrs, body] of readFileSync(p, "utf8").matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
        if (/\bsrc\s*=/i.test(attrs)) continue;
        // JSON-LD and other data blocks never run, so CSP does not check them.
        const type = /\btype\s*=\s*["']?([^"'\s>]+)/i.exec(attrs)?.[1].toLowerCase();
        if (type && type !== "module" && type !== "text/javascript") continue;
        // The browser hashes the text after the HTML parser has turned CRLF into LF.
        hashes.add(createHash("sha256").update(body.replace(/\r\n?/g, "\n"), "utf8").digest("base64"));
      }
    }
  };
  walk(dir);
  return [...hashes].sort();
}

/** Paths that get the policy: our own pages. Not /api (JSON, nothing to
 *  load), not /assets (files, not documents), and not /join, which relays Kumi's page and
 *  would only report on Kumi's sources. */
export function wantsCsp(pathname) {
  return !/^\/(api|assets|join)(\/|$)/.test(pathname);
}

/** One line per distinct violation per process, so a page that trips the same rule on
 *  every view does not flood the logs, and a hard cap in case reports are forged. */
const seen = new Set();
const MAX_DISTINCT = 500;

/** The fields worth logging from either report format: the older
 *  `{ "csp-report": {...} }` (report-uri) or a Reporting API entry. */
export function summarizeCspReport(body) {
  const entries = Array.isArray(body) ? body.map((r) => r?.body) : [body?.["csp-report"]];
  return entries
    .filter((r) => r && typeof r === "object")
    .map((r) => {
      const directive = r["effective-directive"] || r.effectiveDirective || r["violated-directive"] || "";
      // A blocked URL's query string is dropped: it can carry a visitor id (GA's cid=),
      // and since it differs on every request it would defeat the once-per-source dedupe.
      const blocked = String(r["blocked-uri"] || r.blockedURL || "").replace(/[?#].*$/, "");
      const page = r["document-uri"] || r.documentURL || "";
      const clip = (v) => String(v).slice(0, 200);
      let pagePath = "";
      try {
        pagePath = new URL(page).pathname;
      } catch {
        pagePath = clip(page);
      }
      // Which script tried it: for eval, wasm-eval and inline that is the only clue, and an
      // extension or injected script shows up here rather than in the blocked URL.
      const source = String(r["source-file"] || r.sourceFile || "").replace(/[?#].*$/, "");
      // The script's first 40 characters, sent for inline script under 'report-sample'.
      const sample = String(r["script-sample"] || r.sample || "").slice(0, 40);
      return { directive: clip(directive), blocked: clip(blocked), page: pagePath, source: clip(source), sample };
    });
}

export function cspReportHandler(req, res) {
  // The inline trial repeats everything the enforced policy reports, plus inline script;
  // only the inline part is news.
  const trial = req.query?.trial === "inline";
  for (const v of summarizeCspReport(req.body)) {
    const inline = v.blocked === "inline" || v.blocked === "";
    if (trial && !inline) continue;
    // Inline reports all share one blocked value, so the script tells them apart.
    const key = [trial ? "trial" : "", v.directive, v.blocked, v.source, v.sample].join(" ");
    if (seen.has(key) || seen.size >= MAX_DISTINCT) continue;
    seen.add(key);
    const from = v.source && v.source !== v.blocked ? ` from ${v.source.replace(/\s/g, "")}` : "";
    const sample = v.sample ? ` sample ${JSON.stringify(v.sample)}` : "";
    const what = trial ? "[csp-trial] would block" : "[csp] blocked";
    console.warn(`${what} ${v.directive}: ${v.blocked || "(inline)"} on ${v.page}${from}${sample}`);
  }
  res.status(204).end();
}

/** For tests only. */
export function resetCspReportsForTests() {
  seen.clear();
}
