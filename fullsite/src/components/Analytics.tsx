import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

/**
 * GA4 page views for a client-side router.
 *
 * The gtag snippet in index.html deliberately sets `send_page_view: false`. A stock
 * GA4 install only reports a view on a real document load, and this site is an SPA over
 * prerendered pages: after the first landing, every navigation is a route change that
 * fires nothing. Left alone, GA would attribute almost all traffic to whichever page
 * someone entered on and show near-zero for /memberships and /coaching, which are the
 * two worth measuring.
 *
 * So views are sent from here instead, including the first one. Turning the automatic
 * view back on would double-count every landing.
 *
 * Mounted inside Layout, which means /tv is excluded: the wall monitor sits open all day
 * and would otherwise dominate the numbers with a screen nobody is reading.
 *
 * Never runs during prerender. useEffect does not execute server-side, and the gtag
 * guard covers a blocked or failed script load.
 */
declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export default function Analytics() {
  const { pathname, search } = useLocation();
  // React 18 StrictMode mounts effects twice in development. Without this the first
  // view is sent twice locally, which is confusing when checking Realtime.
  const last = useRef<string | null>(null);

  useEffect(() => {
    const page = pathname + search;
    if (last.current === page) return;
    last.current = page;
    if (typeof window.gtag !== "function") return;
    window.gtag("event", "page_view", {
      page_path: page,
      page_location: window.location.href,
      page_title: document.title,
    });
  }, [pathname, search]);

  return null;
}
