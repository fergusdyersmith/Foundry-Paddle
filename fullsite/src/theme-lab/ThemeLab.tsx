import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, ChevronUp, Copy, Palette, RotateCcw, X } from "lucide-react";
import { hexToHslVar, hslVarToHex } from "./color";
import {
  DISPLAY_FONTS,
  FAVICON_OPTIONS,
  type FaviconShape,
  faviconSrc,
  LOGO_OPTIONS,
  PRESETS,
  REBRAND_APPLE_TOUCH,
  TOKENS,
  TRANSPARENT_FAVICONS,
} from "./themes";

/** Checkerboard so transparent favicon thumbs read as transparent. */
const CHECKER_BG = {
  backgroundImage:
    "conic-gradient(#3a3a3a 25%, #565656 0 50%, #3a3a3a 0 75%, #565656 0)",
  backgroundSize: "8px 8px",
};

/** Rebrand preview overlay: pick a palette preset, fine-tune individual
 *  tokens, and switch the display font. Only mounted when the build has
 *  VITE_THEME_LAB=1 (the Railway test service) — never in production.
 *  Choices persist in localStorage and apply as CSS-variable overrides. */

const STORAGE_KEY = "foundry-theme-lab";

interface LabState {
  /** Bumped when defaults change; stale stored state is discarded. */
  v?: number;
  presetId: string;
  overrides: Record<string, string>;
  fontId: string;
  logoId: string;
  faviconId: string;
  faviconShape: FaviconShape;
}

// v5: reset everyone to the agreed defaults (green/white square favicon).
const STATE_VERSION = 5;

// Default view for fresh visitors: the working rebrand direction (Rockwood +
// clay CTA, Schibsted headings, light monogram, new favicon). "Current (Gold)"
// stays available in the picker for comparison.
const DEFAULT_STATE: LabState = {
  v: STATE_VERSION,
  presetId: "rockwood-clay",
  overrides: {},
  fontId: "schibsted",
  logoId: "icon-light",
  faviconId: "green-white",
  faviconShape: "square",
};

function loadState(): LabState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (!parsed || parsed.v !== STATE_VERSION) return DEFAULT_STATE;
    return { ...DEFAULT_STATE, ...parsed };
  } catch {
    return DEFAULT_STATE;
  }
}

/** Tokens the CTA color should also drive so hovers/focus match. */
const PRIMARY_MIRRORS = ["ring", "accent", "sidebar-primary"];

export default function ThemeLab() {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [showTune, setShowTune] = useState(false);
  const [copied, setCopied] = useState(false);
  const [state, setState] = useState<LabState>(DEFAULT_STATE);
  // The untouched site palette, captured once at mount, so "Current (Gold)"
  // and unset tokens can show real values in the pickers.
  const baseline = useRef<Record<string, string>>({});
  // Original favicon hrefs, remembered so the toggle can restore them.
  const originalIcons = useRef<{ icon: string; apple: string } | null>(null);

  useEffect(() => {
    const style = getComputedStyle(document.documentElement);
    for (const { key } of TOKENS) {
      baseline.current[key] = hslVarToHex(style.getPropertyValue(`--${key}`));
    }
    setState(loadState());
    setMounted(true);
  }, []);

  // Apply on every state change (and on first load).
  useEffect(() => {
    if (!mounted) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* fine */
    }
    const root = document.documentElement;
    const preset = PRESETS.find((p) => p.id === state.presetId) ?? PRESETS[0];

    for (const { key } of TOKENS) {
      const hex = state.overrides[key] ?? preset.colors[key];
      if (hex) root.style.setProperty(`--${key}`, hexToHslVar(hex));
      else root.style.removeProperty(`--${key}`);
    }
    // Keep secondary surfaces & popovers in sync with card, and focus/accent
    // colors in sync with the CTA, so the preview feels coherent.
    const card = state.overrides["card"] ?? preset.colors["card"];
    for (const k of ["popover", "muted"]) {
      if (card) root.style.setProperty(`--${k}`, hexToHslVar(card));
      else root.style.removeProperty(`--${k}`);
    }
    const cta = state.overrides["primary"] ?? preset.colors["primary"];
    const ctaText = state.overrides["primary-foreground"] ?? preset.colors["primary-foreground"];
    for (const k of PRIMARY_MIRRORS) {
      if (cta) root.style.setProperty(`--${k}`, hexToHslVar(cta));
      else root.style.removeProperty(`--${k}`);
    }
    if (ctaText) root.style.setProperty("--accent-foreground", hexToHslVar(ctaText));
    else root.style.removeProperty("--accent-foreground");

    // Display font.
    const font = DISPLAY_FONTS.find((f) => f.id === state.fontId) ?? DISPLAY_FONTS[0];
    if (font.css && !document.querySelector(`link[data-theme-lab-font="${font.id}"]`)) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = font.css;
      link.dataset.themeLabFont = font.id;
      document.head.appendChild(link);
    }
    if (font.id === "bebas") {
      root.style.removeProperty("--font-display");
      root.style.removeProperty("letter-spacing");
    } else {
      root.style.setProperty("--font-display", font.family);
    }

    // Favicon swap (preview only; production keeps the old set until launch).
    const iconLink = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    const appleLink = document.querySelector<HTMLLinkElement>('link[rel="apple-touch-icon"]');
    if (iconLink && appleLink && !originalIcons.current) {
      originalIcons.current = { icon: iconLink.href, apple: appleLink.href };
    }
    if (iconLink && appleLink && originalIcons.current) {
      const src = faviconSrc(state.faviconId, state.faviconShape);
      iconLink.href = src ?? originalIcons.current.icon;
      appleLink.href = src ? REBRAND_APPLE_TOUCH : originalIcons.current.apple;
    }

    // Tell the Header (and anything else) that lab state changed.
    window.dispatchEvent(new CustomEvent("theme-lab-update"));
  }, [state, mounted]);

  if (!mounted) return null;

  const preset = PRESETS.find((p) => p.id === state.presetId) ?? PRESETS[0];
  const effectiveHex = (key: string): string =>
    state.overrides[key] ?? preset.colors[key] ?? baseline.current[key] ?? "#000000";

  const pickPreset = (id: string) =>
    setState((s) => ({ ...s, presetId: id, overrides: {} }));

  const setToken = (key: string, hex: string) =>
    setState((s) => ({ ...s, overrides: { ...s.overrides, [key]: hex } }));

  const copyTokens = async () => {
    const payload = {
      preset: preset.name,
      displayFont: (DISPLAY_FONTS.find((f) => f.id === state.fontId) ?? DISPLAY_FONTS[0]).name,
      headerLogo: (LOGO_OPTIONS.find((l) => l.id === state.logoId) ?? LOGO_OPTIONS[0]).name,
      favicon: `${
        ((state.faviconShape === "transparent" ? TRANSPARENT_FAVICONS : FAVICON_OPTIONS).find(
          (f) => f.id === state.faviconId,
        ) ?? FAVICON_OPTIONS[0]).name
      } (${state.faviconShape})`,
      tokens: Object.fromEntries(TOKENS.map(({ key, label }) => [`${label} (--${key})`, effectiveHex(key)])),
    };
    try {
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      window.prompt("Copy tokens:", JSON.stringify(payload));
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-[9999] font-body">
      {open && (
        <div className="mb-3 flex max-h-[75vh] w-[21rem] flex-col overflow-hidden rounded-lg border border-neutral-700 bg-neutral-900 text-neutral-100 shadow-2xl">
          <div className="flex items-center justify-between border-b border-neutral-700 px-4 py-3">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-300">
              Rebrand Preview
            </span>
            <button onClick={() => setOpen(false)} aria-label="Close theme panel">
              <X className="h-4 w-4 text-neutral-400 hover:text-white" />
            </button>
          </div>

          <div className="overflow-y-auto p-4">
            {/* Presets */}
            <p className="mb-2 text-[11px] uppercase tracking-wider text-neutral-500">Palette</p>
            <div className="flex flex-col gap-1.5">
              {PRESETS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => pickPreset(p.id)}
                  className={`flex items-center gap-3 rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                    state.presetId === p.id
                      ? "border-white bg-neutral-800"
                      : "border-neutral-700 hover:border-neutral-500"
                  }`}
                >
                  <span className="flex shrink-0 overflow-hidden rounded border border-neutral-600">
                    <span className="h-5 w-5" style={{ background: p.swatch[0] }} />
                    <span className="h-5 w-5" style={{ background: p.swatch[1] }} />
                  </span>
                  <span className="flex-1">{p.name}</span>
                  {state.presetId === p.id && <Check className="h-4 w-4 text-emerald-400" />}
                </button>
              ))}
            </div>

            {/* Header logo */}
            <p className="mb-2 mt-5 text-[11px] uppercase tracking-wider text-neutral-500">
              Header logo
            </p>
            <div className="flex flex-col gap-1.5">
              {LOGO_OPTIONS.map((l) => (
                <button
                  key={l.id}
                  onClick={() => setState((s) => ({ ...s, logoId: l.id }))}
                  className={`flex items-center gap-3 rounded-md border px-3 py-2 text-left text-xs transition-colors ${
                    state.logoId === l.id
                      ? "border-white bg-neutral-800"
                      : "border-neutral-700 hover:border-neutral-500"
                  }`}
                >
                  <span
                    className={`flex h-8 w-14 shrink-0 items-center justify-center overflow-hidden rounded border border-neutral-700 ${
                      l.id.includes("green") ? "bg-[#EEEFE3]" : "bg-[#313E39]"
                    }`}
                  >
                    {l.src ? (
                      <img src={l.src} alt="" className="max-h-6 max-w-12 object-contain" />
                    ) : (
                      <span className="font-display text-[9px] tracking-widest text-white">FP</span>
                    )}
                  </span>
                  <span className="flex-1">{l.name}</span>
                  {state.logoId === l.id && <Check className="h-4 w-4 shrink-0 text-emerald-400" />}
                </button>
              ))}
            </div>

            {/* Favicon */}
            <p className="mb-2 mt-5 text-[11px] uppercase tracking-wider text-neutral-500">
              Favicon <span className="normal-case text-neutral-600">(check the browser tab)</span>
            </p>
            <div className="mb-2 flex gap-1.5">
              {(["square", "circle", "transparent"] as const).map((shape) => (
                <button
                  key={shape}
                  onClick={() =>
                    setState((s) => {
                      // Keep the selection valid for the new shape's option list.
                      const list = shape === "transparent" ? TRANSPARENT_FAVICONS : FAVICON_OPTIONS;
                      const stillValid = list.some((f) => f.id === s.faviconId);
                      return {
                        ...s,
                        faviconShape: shape,
                        faviconId: stillValid ? s.faviconId : list[1].id,
                      };
                    })
                  }
                  className={`flex-1 rounded-md border px-2 py-1.5 text-[11px] capitalize transition-colors ${
                    state.faviconShape === shape
                      ? "border-white bg-neutral-800 text-white"
                      : "border-neutral-700 text-neutral-400 hover:border-neutral-500"
                  }`}
                >
                  {shape === "transparent" ? "no tile" : shape}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {(state.faviconShape === "transparent" ? TRANSPARENT_FAVICONS : FAVICON_OPTIONS).map(
                (f) => {
                  const src = faviconSrc(f.id, state.faviconShape);
                  return (
                    <button
                      key={f.id}
                      onClick={() => setState((s) => ({ ...s, faviconId: f.id }))}
                      title={f.name}
                      className={`flex flex-col items-center gap-1 rounded-md border px-1 py-2 transition-colors ${
                        state.faviconId === f.id
                          ? "border-white bg-neutral-800"
                          : "border-neutral-700 hover:border-neutral-500"
                      }`}
                    >
                      {src ? (
                        <span
                          className="flex h-8 w-8 items-center justify-center overflow-hidden rounded"
                          style={state.faviconShape === "transparent" ? CHECKER_BG : undefined}
                        >
                          <img src={src} alt="" className="h-8 w-8" />
                        </span>
                      ) : (
                        <span className="flex h-8 w-8 items-center justify-center rounded border border-neutral-600 bg-[#0f0f0f] font-display text-[10px] text-[#e59a2f]">
                          FP
                        </span>
                      )}
                      <span className="text-center text-[9px] leading-tight text-neutral-400">
                        {f.name}
                      </span>
                    </button>
                  );
                },
              )}
            </div>

            {/* Display font */}
            <p className="mb-2 mt-5 text-[11px] uppercase tracking-wider text-neutral-500">
              Display font (headings)
            </p>
            <select
              value={state.fontId}
              onChange={(e) => setState((s) => ({ ...s, fontId: e.target.value }))}
              className="w-full rounded-md border border-neutral-700 bg-neutral-800 px-2 py-2 text-sm"
            >
              {DISPLAY_FONTS.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>

            {/* Fine tune */}
            <button
              onClick={() => setShowTune((v) => !v)}
              className="mt-5 flex w-full items-center justify-between text-[11px] uppercase tracking-wider text-neutral-400 hover:text-white"
            >
              Fine-tune colors
              {showTune ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
            {showTune && (
              <div className="mt-3 flex flex-col gap-2.5">
                {TOKENS.map(({ key, label }) => (
                  <label key={key} className="flex items-center justify-between gap-3 text-xs">
                    <span className="text-neutral-300">{label}</span>
                    <span className="flex items-center gap-2">
                      <span className="font-mono text-[10px] text-neutral-500">
                        {effectiveHex(key)}
                      </span>
                      <input
                        type="color"
                        value={effectiveHex(key)}
                        onChange={(e) => setToken(key, e.target.value)}
                        className="h-7 w-9 cursor-pointer rounded border border-neutral-600 bg-transparent"
                      />
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 border-t border-neutral-700 px-4 py-3">
            <button
              onClick={copyTokens}
              className="flex flex-1 items-center justify-center gap-2 rounded-md bg-white px-3 py-2 text-xs font-semibold text-neutral-900 hover:bg-neutral-200"
            >
              <Copy className="h-3.5 w-3.5" />
              {copied ? "Copied!" : "Copy tokens"}
            </button>
            <button
              onClick={() => setState(DEFAULT_STATE)}
              className="flex items-center gap-1.5 rounded-md border border-neutral-600 px-3 py-2 text-xs text-neutral-300 hover:border-neutral-400"
              title="Back to the default rebrand direction"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset
            </button>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full border border-neutral-600 bg-neutral-900 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-white shadow-xl hover:border-neutral-300"
        aria-label="Open theme lab"
      >
        <Palette className="h-4 w-4" />
        Theme
      </button>
    </div>
  );
}
