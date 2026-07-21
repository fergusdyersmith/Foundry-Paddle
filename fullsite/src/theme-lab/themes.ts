/** Theme presets for the rebrand preview lab. Colors come from Courtney's
 *  July 8 branding deck; accent hexes (kelly, neon pink) are PROVISIONAL until
 *  the final palette values arrive — swap them here when they do.
 *
 *  Each preset overrides the site's CSS custom properties (see index.css).
 *  Values are plain hex; the lab converts to HSL triplets on apply. */

/** Deck palette (primary colors have confirmed hexes; accents are eyeballed). */
export const DECK = {
  rockwood: "#313E39", // Rockwood Shutter Green
  oilCloth: "#96998D", // BM Oil Cloth (sage)
  cavernClay: "#AE6C56", // SW Cavern Clay (deck hex; files say #AE6E56)
  alabaster: "#EEEFE3",
  kelly: "#0B8A47", // PROVISIONAL
  neonPink: "#F5487F", // PROVISIONAL
  syrup: "#6E4C3B", // BM Pancake Syrup, PROVISIONAL
};

/** The tokens the lab manages, in display order. Keys match index.css vars. */
export const TOKENS: { key: string; label: string }[] = [
  { key: "background", label: "Page background" },
  { key: "card", label: "Card / surface" },
  { key: "secondary", label: "Raised surface" },
  { key: "border", label: "Borders" },
  { key: "foreground", label: "Headings / text" },
  { key: "secondary-foreground", label: "Body text" },
  { key: "muted-foreground", label: "Muted text" },
  { key: "primary", label: "CTA / accent" },
  { key: "primary-foreground", label: "Text on CTA" },
];

export interface ThemePreset {
  id: string;
  name: string;
  /** Small swatches shown in the picker: [background, cta]. */
  swatch: [string, string];
  /** token key -> hex. Empty = site defaults (current gold brand). */
  colors: Record<string, string>;
}

const rockwoodBase = {
  background: DECK.rockwood,
  card: "#28322E",
  secondary: "#28322E",
  border: "#48544E",
  foreground: DECK.alabaster,
  "secondary-foreground": "#D8DACC",
  "muted-foreground": DECK.oilCloth,
};

export const PRESETS: ThemePreset[] = [
  {
    id: "current",
    name: "Current (Gold)",
    swatch: ["#0f0f0f", "#e59A2f"],
    colors: {},
  },
  {
    id: "rockwood-clay",
    name: "Rockwood · Clay CTA",
    swatch: [DECK.rockwood, DECK.cavernClay],
    colors: {
      ...rockwoodBase,
      primary: DECK.cavernClay,
      "primary-foreground": "#F7F2E8",
    },
  },
  {
    id: "rockwood-kelly",
    name: "Rockwood · Kelly CTA",
    swatch: [DECK.rockwood, DECK.kelly],
    colors: {
      ...rockwoodBase,
      primary: DECK.kelly,
      "primary-foreground": "#F2F6EE",
    },
  },
  {
    id: "rockwood-pink",
    name: "Rockwood · Neon Pink CTA",
    swatch: [DECK.rockwood, DECK.neonPink],
    colors: {
      ...rockwoodBase,
      primary: DECK.neonPink,
      "primary-foreground": "#1B1216",
    },
  },
  {
    id: "charcoal-clay",
    name: "Charcoal · Clay CTA",
    swatch: ["#101010", DECK.cavernClay],
    colors: {
      background: "#101010",
      card: "#191919",
      secondary: "#191919",
      border: "#2E2E2E",
      foreground: DECK.alabaster,
      "secondary-foreground": "#D9D9CF",
      "muted-foreground": "#8C8F85",
      primary: DECK.cavernClay,
      "primary-foreground": "#F7F2E8",
    },
  },
  {
    id: "alabaster-light",
    name: "Alabaster Light",
    swatch: [DECK.alabaster, DECK.rockwood],
    colors: {
      background: DECK.alabaster,
      card: "#F8F8F0",
      secondary: "#E2E3D6",
      border: "#CDCFBE",
      foreground: DECK.rockwood,
      "secondary-foreground": "#41504A",
      "muted-foreground": "#75796D",
      primary: DECK.rockwood,
      "primary-foreground": DECK.alabaster,
    },
  },
];

/** Display-font options. Suite 3 (Archivo) is the chosen identity per
 *  Courtney's final logo package; Archivo Black stands in for the package's
 *  Akzidenz-Grotesk Next Black Extended display accent (paid Berthold font,
 *  not delivered). Others kept for comparison. */
export const DISPLAY_FONTS: {
  id: string;
  name: string;
  family: string;
  /** Stylesheet URL to inject when selected (null = already loaded). */
  css: string | null;
}[] = [
  { id: "bebas", name: "Bebas Neue (current site)", family: "'Bebas Neue', sans-serif", css: null },
  {
    id: "archivo",
    name: "Archivo — CHOSEN (Suite 3)",
    family: "'Archivo', sans-serif",
    css: "https://fonts.googleapis.com/css2?family=Archivo:wght@200;300;400;600;700&display=swap",
  },
  {
    id: "archivo-black",
    name: "Archivo Black (≈ Akzidenz Black Ext.)",
    family: "'Archivo Black', sans-serif",
    css: "https://fonts.googleapis.com/css2?family=Archivo+Black&display=swap",
  },
  {
    id: "schibsted",
    name: "Schibsted Grotesk (Suites 2/4)",
    family: "'Schibsted Grotesk', sans-serif",
    css: "https://fonts.googleapis.com/css2?family=Schibsted+Grotesk:wght@400;500;700;800&display=swap",
  },
  {
    id: "ranade",
    name: "Ranade (Suite 5)",
    family: "'Ranade', sans-serif",
    css: "https://api.fontshare.com/v2/css?f[]=ranade@400,500,700&display=swap",
  },
];

/** Header logo options (Courtney's final package, assets in /public/rebrand).
 *  "Light" variants are derived from the delivered dark-green SVGs pending
 *  official inverted files. */
export const LOGO_OPTIONS: {
  id: string;
  name: string;
  /** null = the current text wordmark. */
  src: string | null;
  /** Tailwind height class for the header <img>. */
  heightClass: string;
}[] = [
  { id: "current", name: "Current text wordmark", src: null, heightClass: "" },
  {
    id: "lockup-light",
    name: "Horizontal lockup · light (dark themes)",
    src: "/rebrand/FP_lockup_horizontal_light.svg",
    heightClass: "h-9",
  },
  {
    id: "lockup-green",
    name: "Horizontal lockup · green (light theme)",
    src: "/rebrand/FP_lockup_horizontal_green.svg",
    heightClass: "h-9",
  },
  {
    id: "icon-2c-white",
    name: "Monogram · white + clay racket",
    src: "/rebrand/FP_icon_2color_white.svg",
    heightClass: "h-10",
  },
  {
    id: "icon-2c-green",
    name: "Monogram · green + clay racket",
    src: "/rebrand/FP_icon_2color_green.svg",
    heightClass: "h-10",
  },
  {
    id: "icon-light",
    name: "Monogram · light",
    src: "/rebrand/FP_icon_light.svg",
    heightClass: "h-10",
  },
];

/** Favicon options. "delivered" is Courtney's official RealFaviconGenerator
 *  set; the color variants are generated from the vector monogram
 *  (scripts kept simple: bg tile + recolored mark). Production ships the old
 *  gold favicon until the real flip. */
export const FAVICON_OPTIONS: {
  id: string;
  name: string;
  /** null = the current production favicon. */
  src: string | null;
  /** Panel swatch: [tile, mark]. */
  swatch: [string, string];
}[] = [
  { id: "current", name: "Current (gold)", src: null, swatch: ["#0f0f0f", "#e59a2f"] },
  {
    id: "delivered",
    name: "Green · white (delivered)",
    src: "/rebrand/favicon.svg",
    swatch: ["#303E39", "#FFFFFF"],
  },
  {
    id: "green-alabaster",
    name: "Green · alabaster",
    src: "/rebrand/favicon-green-alabaster.svg",
    swatch: ["#303E39", "#EEEFE3"],
  },
  {
    id: "black-white",
    name: "Black · white",
    src: "/rebrand/favicon-black-white.svg",
    swatch: ["#101010", "#FFFFFF"],
  },
  {
    id: "white-clay",
    name: "White · clay",
    src: "/rebrand/favicon-white-clay.svg",
    swatch: ["#FFFFFF", "#AE6C56"],
  },
  {
    id: "black-clay",
    name: "Black · clay",
    src: "/rebrand/favicon-black-clay.svg",
    swatch: ["#101010", "#AE6C56"],
  },
];

/** Apple touch icon for any new-brand favicon choice (delivered PNG). */
export const REBRAND_APPLE_TOUCH = "/rebrand/apple-touch-icon.png";
