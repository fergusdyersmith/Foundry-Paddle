/**
 * Who is asking, and how often. Shared by every public endpoint that writes somewhere a
 * person reads (Klaviyo, Slack, the organisers' sheets, a parent's inbox).
 */

/**
 * The client's address. Railway's edge proxy APPENDS the address it saw to
 * X-Forwarded-For, so the last entry is the real one; the first is whatever the client
 * chose to send. Reading the first (as the waiver PDF and the chat limits did) let anyone
 * pick their own address, both for the legal record and to dodge every per-IP limit.
 * Production has no CDN in front of Railway; if one is ever added, this must skip its hop.
 */
export function clientIp(req) {
  const fwd = String(req.headers?.["x-forwarded-for"] || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return fwd[fwd.length - 1] || req.socket?.remoteAddress || "unknown";
}

/**
 * A fixed-window limit per key, in memory: enough for a single Railway instance, and it
 * forgets on deploy, which is fine for spam.
 *
 * Returns `overLimit(req, res)`: true (and a 429 already sent, in the JSON shape the
 * site's forms show as an error) when this request is one too many. Handlers call it
 * AFTER validating the payload, so a parent who fixes a form error three times is not
 * locked out, and a rejected payload, which writes nothing, costs nothing.
 *
 * `key(req)` defaults to the client address; pass one to limit by something else too
 * (the waiver also limits per parent email, since an email is what it sends).
 */
export function rateLimit({ name, max, windowMs, key = clientIp, message = "Too many attempts. Please try again in a few minutes." }) {
  const hits = new Map(); // key -> { count, resetAt }
  let lastSweep = Date.now();

  return function overLimit(req, res) {
    const now = Date.now();
    if (now - lastSweep > windowMs) {
      for (const [k, v] of hits) if (v.resetAt <= now) hits.delete(k);
      lastSweep = now;
    }
    const k = `${name}:${key(req)}`;
    const entry = hits.get(k);
    if (!entry || entry.resetAt <= now) {
      hits.set(k, { count: 1, resetAt: now + windowMs });
      return false;
    }
    entry.count += 1;
    if (entry.count <= max) return false;
    res.setHeader("Retry-After", String(Math.ceil((entry.resetAt - now) / 1000)));
    res.status(429).json({ error: message });
    return true;
  };
}

/**
 * A value bound for a Google Sheet, made inert. Apps Script's appendRow reads a string
 * the way a person typing would, so a name of "=IMPORTXML(...)" or "=HYPERLINK(...)"
 * became a live formula in the organisers' sheets, which hold children's medical notes.
 * A leading apostrophe makes Sheets store the text as typed (and it does not display).
 * Phone numbers ("+1 503...") and negative figures are left as they are.
 */
export function sheetCell(value) {
  if (typeof value !== "string") return value;
  return /^[=@\t\r]|^[+-](?![\d\s.(])/.test(value) ? `'${value}` : value;
}

/** sheetCell over every string in a payload, except the keys named (HTML, secrets). */
export function sheetSafe(value, skip = new Set()) {
  if (typeof value === "string") return sheetCell(value);
  if (Array.isArray(value)) return value.map((v) => sheetSafe(v, skip));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, skip.has(k) ? v : sheetSafe(v, skip)]));
  }
  return value;
}
