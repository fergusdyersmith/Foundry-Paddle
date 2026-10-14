/**
 * Cloudflare Turnstile on the public forms: a bot check most visitors never see (the
 * widget runs "interaction-only" and only asks for a click when Cloudflare is unsure).
 *
 * OFF until both keys exist on Railway:
 *   VITE_TURNSTILE_SITE_KEY  public; the build bakes it into the forms
 *   TURNSTILE_SECRET_KEY     private; this file sends it to Cloudflare to check a token
 * Requiring both is deliberate. With only the secret, the forms would carry no widget,
 * so no token, and every signup would be refused.
 *
 * The browser sends its token in the CF-Turnstile-Response header, so no form's schema
 * has to know about it. A token is good for one check.
 *
 * If Cloudflare cannot be reached, the request goes through and the miss is logged: the
 * rate limits still apply, and refusing every family's signup because a third party is
 * down is the worse failure.
 */
import { clientIp } from "./abuse.js";

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const REFUSED = "We could not confirm this came from a person. Please reload the page and try again.";

export function turnstileCheck({
  secret = process.env.TURNSTILE_SECRET_KEY?.trim(),
  siteKey = process.env.VITE_TURNSTILE_SITE_KEY?.trim(),
  fetchImpl = fetch,
  timeoutMs = 5000,
} = {}) {
  const enabled = Boolean(secret && siteKey);

  async function verifyHuman(req, res, next) {
    if (!enabled) return next();
    const token = String(req.get("cf-turnstile-response") || "").slice(0, 2048);
    if (!token) return res.status(400).json({ error: REFUSED });
    let outcome;
    try {
      const r = await fetchImpl(VERIFY_URL, {
        method: "POST",
        body: new URLSearchParams({ secret, response: token, remoteip: clientIp(req) }),
        signal: AbortSignal.timeout(timeoutMs),
      });
      outcome = await r.json();
    } catch (err) {
      console.warn(`[turnstile] could not reach Cloudflare, letting ${req.path} through: ${err?.message || err}`);
      return next();
    }
    if (outcome?.success) return next();
    console.warn(`[turnstile] refused ${req.path}: ${(outcome?.["error-codes"] || []).join(", ") || "no reason given"}`);
    return res.status(400).json({ error: REFUSED });
  }
  verifyHuman.enabled = enabled;
  return verifyHuman;
}

/** The forms it guards: each one subscribes someone, or emails someone, or both. */
export const TURNSTILE_PATHS = [
  "/api/register-interest",
  "/api/juniors/register",
  "/api/juniors/notify",
  "/api/juniors/waiver",
  "/api/open/register",
  "/api/league/register",
];
