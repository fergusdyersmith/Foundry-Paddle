import { useEffect } from "react";

const MEDIA_ID = "jxjc5ma996";

// Wistia's player runtime + this media's embed. Loaded from the component (not
// index.html) so the static build doesn't treat the module script as an entry.
const WISTIA_SCRIPTS = [
  { src: "https://fast.wistia.com/player.js", module: false },
  { src: `https://fast.wistia.com/embed/${MEDIA_ID}.js`, module: true },
];

/**
 * Wistia web component. Wrapper matches Foundry chrome: primary border, subtle
 * glow, loading swatch via global CSS.
 */
const WistiaVideo = () => {
  useEffect(() => {
    // The player sends viewing data to Mux (*.litix.io) for a 10% sample of views. We
    // don't use it and the CSP blocks it anyway (server/csp.js), so it is switched off.
    // player.js reads this flag as each player starts, so it must be set first.
    window.wistiaDisableMux = true;
    for (const { src, module } of WISTIA_SCRIPTS) {
      if (document.querySelector(`script[src="${src}"]`)) continue;
      const script = document.createElement("script");
      script.src = src;
      script.async = true;
      if (module) script.type = "module";
      document.body.appendChild(script);
    }
  }, []);

  return (
    <div className="relative w-full">
      <div
        className="pointer-events-none absolute -inset-[1px] opacity-40"
        style={{
          background:
            "linear-gradient(135deg, hsl(var(--primary) / 0.35) 0%, transparent 45%, transparent 55%, hsl(var(--primary) / 0.2) 100%)",
        }}
        aria-hidden
      />
      <div className="relative border border-primary bg-secondary/30 p-1 shadow-[0_0_48px_-12px_hsl(var(--primary)/0.45)]">
        <div className="flex items-center justify-between gap-2 border-b border-border/80 bg-background/80 px-3 py-2">
          <span className="font-display text-[10px] sm:text-xs tracking-[0.25em] text-primary">PADEL IN MOTION</span>
          <span className="font-body text-[10px] text-muted-foreground tracking-widest uppercase hidden sm:inline">Watch</span>
        </div>
        <div className="bg-background p-1 sm:p-2">
          <wistia-player media-id={MEDIA_ID} aspect="1.7777777777777777" className="block w-full" />
        </div>
      </div>
      <div
        className="pointer-events-none absolute -bottom-px left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-primary/70 to-transparent"
        aria-hidden
      />
    </div>
  );
};

export default WistiaVideo;
