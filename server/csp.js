/**
 * Content Security Policy, in REPORT-ONLY mode.
 *
 * A browser applying this blocks nothing: it only reports what it WOULD have blocked to
 * /api/csp-report, which logs it. A policy that misses one of the site's outside sources
 * breaks that part of a page silently (the booking iframe, the Wistia video, analytics),
 * so it runs report-only until the logs have been quiet through a normal week of
 * traffic. Then switch the header name in server.js to Content-Security-Policy.
 *
 * What each source is for:
 *   googletagmanager / google-analytics   GA4 (gtag in index.html)
 *   www.google.com                        also GA4: some hits go to www.google.com/g/collect
 *   fast.wistia.com / .net, akamaihd      the Wistia video on /the-sport
 *   fonts.googleapis / gstatic            the web fonts (index.css)
 *   playtomic.io / playtomic.com          the booking iframe on /book (.io redirects to .com)
 *   www.google.com (frame)                the map embed (footer, /contact)
 *   challenges.cloudflare.com             Turnstile, once its keys are set (server/turnstile.js)
 *
 * Left out on purpose: browser.sentry-cdn.com, which Wistia's player loads for its own
 * error reporting. Blocking it costs the video nothing, so expect it in the reports.
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

export const CSP_REPORT_ONLY = Object.entries(POLICY)
  .map(([directive, sources]) => `${directive} ${sources.join(" ")}`)
  .join("; ");

/** Paths that get the report-only policy: our own pages. Not /api (JSON, nothing to
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
      return { directive: clip(directive), blocked: clip(blocked), page: pagePath };
    });
}

export function cspReportHandler(req, res) {
  for (const v of summarizeCspReport(req.body)) {
    const key = `${v.directive} ${v.blocked}`;
    if (seen.has(key) || seen.size >= MAX_DISTINCT) continue;
    seen.add(key);
    console.warn(`[csp] would block ${v.directive}: ${v.blocked || "(inline)"} on ${v.page}`);
  }
  res.status(204).end();
}

/** For tests only. */
export function resetCspReportsForTests() {
  seen.clear();
}
