import { useEffect } from "react";
import { useRouteError } from "react-router-dom";

/**
 * Recovers a tab that was open across a deploy.
 *
 * vite-react-ssg embeds the build's hash in each prerendered page as
 * `__VITE_REACT_SSG_HASH__`, and on a CLIENT-SIDE navigation it fetches
 * `static-loader-data-manifest-<hash>.json` and calls `.json()` on the response
 * with no status check. After a deploy that file is gone, so the fetch 404s, the
 * body is the plain string "Not found", and the parse throws:
 *
 *     Unexpected token 'N', "Not found" is not valid JSON
 *
 * which React Router shows as "Unexpected Application Error!". A full reload
 * always fixes it, because the new HTML carries the new hash. That is exactly
 * what a user reports as "it crashes when I click another tab, but refreshing
 * fixes it" — and it hits hardest on the day the site is deployed repeatedly.
 *
 * Lazily-loaded JS chunks fail the same way for the same reason, so both are
 * matched here.
 *
 * The reload is guarded by a sessionStorage flag. If a reload does NOT fix it,
 * the error is something else and we must show it rather than spin the tab
 * forever — an infinite reload loop is a far worse failure than a visible error.
 */
const RELOAD_FLAG = "fp:stale-deploy-reload";

function isStaleDeploy(error: unknown): boolean {
  const msg = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  return (
    // The manifest 404 parsed as JSON. Chrome, Firefox and Safari word this
    // differently, so match the shape rather than one browser's phrasing.
    (/is not valid JSON|JSON\.parse|Unexpected token/i.test(msg) && /not found/i.test(msg)) ||
    // A hashed chunk that no longer exists on the server.
    /Failed to fetch dynamically imported module/i.test(msg) ||
    /Importing a module script failed/i.test(msg) ||
    /error loading dynamically imported module/i.test(msg)
  );
}

export default function StaleDeployBoundary() {
  const error = useRouteError();
  const stale = isStaleDeploy(error);
  const alreadyTried = typeof sessionStorage !== "undefined" &&
    sessionStorage.getItem(RELOAD_FLAG) === "1";

  useEffect(() => {
    if (!stale || alreadyTried) return;
    try {
      sessionStorage.setItem(RELOAD_FLAG, "1");
    } catch {
      // Private mode with storage disabled: reloading once is still better than
      // leaving a crashed page, and without the flag the worst case is a second
      // reload rather than a loop, because a fresh load fixes the underlying cause.
    }
    window.location.reload();
  }, [stale, alreadyTried]);

  // Clear the guard once a page renders successfully, so a stale deploy weeks from
  // now can still self-heal instead of being suppressed by an old flag.
  useEffect(() => {
    if (stale) return;
    try { sessionStorage.removeItem(RELOAD_FLAG); } catch { /* nothing to clear */ }
  }, [stale]);

  if (stale && !alreadyTried) return null;   // reloading; do not flash an error

  const message = error instanceof Error ? error.message : String(error ?? "Unknown error");
  return (
    <main className="bg-background min-h-screen flex items-center justify-center px-6">
      <div className="mx-auto max-w-md text-center">
        <h1 className="font-display text-4xl text-foreground mb-4">SOMETHING WENT WRONG</h1>
        <p className="font-body text-sm text-secondary-foreground mb-6">
          Sorry, that page failed to load. Reloading usually fixes it.
        </p>
        <button
          onClick={() => { try { sessionStorage.removeItem(RELOAD_FLAG); } catch { /* ignore */ } window.location.reload(); }}
          className="inline-flex items-center gap-2 bg-primary px-6 py-3 font-display text-sm tracking-widest text-primary-foreground transition-all hover:brightness-110"
        >
          RELOAD
        </button>
        <p className="font-body text-xs text-muted-foreground mt-6 break-words">{message}</p>
      </div>
    </main>
  );
}
