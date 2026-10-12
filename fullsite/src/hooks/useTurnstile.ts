import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Cloudflare Turnstile for a public form. Does nothing at all until
 * VITE_TURNSTILE_SITE_KEY is set when the site is built; the server's half
 * (server/turnstile.js) stays off until its secret is set too.
 *
 * The widget runs "interaction-only": most visitors never see it, and the few Cloudflare
 * is unsure about get one click. A token is good for one submission, so call `reset()`
 * after a submit the server did not accept.
 *
 *   const human = useTurnstile();
 *   <div ref={human.ref} />                       // where a challenge would appear
 *   fetch(url, { headers: { ...human.headers() } })
 */
const SITE_KEY: string = (import.meta.env.VITE_TURNSTILE_SITE_KEY ?? "").trim();
const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

type TurnstileApi = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  reset: (id: string) => void;
  remove: (id: string) => void;
};
declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let loading: Promise<TurnstileApi> | null = null;
function loadTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  loading ??= new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = SCRIPT_SRC;
    s.async = true;
    s.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error("turnstile missing")));
    s.onerror = () => {
      loading = null;
      reject(new Error("turnstile failed to load"));
    };
    document.head.appendChild(s);
  });
  return loading;
}

export function useTurnstile() {
  const ref = useRef<HTMLDivElement>(null);
  const widget = useRef<string | null>(null);
  const [token, setToken] = useState("");

  useEffect(() => {
    if (!SITE_KEY || !ref.current) return;
    let cancelled = false;
    loadTurnstile()
      .then((api) => {
        if (cancelled || !ref.current) return;
        widget.current = api.render(ref.current, {
          sitekey: SITE_KEY,
          appearance: "interaction-only",
          callback: (t: string) => setToken(t),
          "expired-callback": () => setToken(""),
          "error-callback": () => setToken(""),
        });
      })
      // Blocked or offline: the form still submits, and the server decides.
      .catch(() => {});
    return () => {
      cancelled = true;
      if (widget.current) window.turnstile?.remove(widget.current);
      widget.current = null;
    };
  }, []);

  const headers = useCallback(
    (): Record<string, string> => (token ? { "CF-Turnstile-Response": token } : {}),
    [token],
  );
  const reset = useCallback(() => {
    setToken("");
    if (widget.current) window.turnstile?.reset(widget.current);
  }, []);

  return { enabled: Boolean(SITE_KEY), ready: !SITE_KEY || Boolean(token), ref, headers, reset };
}
