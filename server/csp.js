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
 * tracker) and *.litix.io (Mux video analytics, from Wistia's wistia-mux.js).
 * Not ours either: eval, wasm-eval and odd third-party hosts on / (adware, extensions,
 * in-app browsers). Neither our bundle, gtag nor Turnstile's api.js uses eval or WebAssembly.
 * Wistia also asks for http:// copies of its files on a plain-http page (localhost);
 * those reports are a local-testing artifact, production is https throughout.
 *
 * script-src keeps 'unsafe-inline' for now: every prerendered page carries three inline
 * scripts (gtag's config, React Router's hydration data, vite-react-ssg's build hash), and
 * the hydration data differs per page. Hashing them per file is the next step once the
 * host list is proven. Even with it, the policy limits where scripts, frames and requests
 * can come from, and forbids plugins, <base> hijacks and off-site form posts.
 */
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
      return { directive: clip(directive), blocked: clip(blocked), page: pagePath, source: clip(source) };
    });
}

export function cspReportHandler(req, res) {
  for (const v of summarizeCspReport(req.body)) {
    const key = `${v.directive} ${v.blocked}`;
    if (seen.has(key) || seen.size >= MAX_DISTINCT) continue;
    seen.add(key);
    const from = v.source && v.source !== v.blocked ? ` from ${v.source.replace(/\s/g, "")}` : "";
    console.warn(`[csp] blocked ${v.directive}: ${v.blocked || "(inline)"} on ${v.page}${from}`);
  }
  res.status(204).end();
}

/** For tests only. */
export function resetCspReportsForTests() {
  seen.clear();
}
