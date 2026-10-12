import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { partnerLogoFiles } from "virtual:partner-logos";

const logoSrc = (filename: string) => `${import.meta.env.BASE_URL}partner-logos/${filename}`;

// The partner each file actually shows. Names worked out from the filenames read "3 Bar
// Logo BWr" (it is adidas's three-bar mark), "Caprico" (the logo says Carioca Bowls) and
// "Ocidental", which is what a screen reader announced for each.
const PARTNER_NAMES: Record<string, string> = {
  "3-Bar_Logo_BWr.png": "adidas",
  "caprico.png": "Carioca Bowls",
  "ocidental.png": "Occidental Brewing",
  "touring.png": "Touring Coffee Roasters",
  "wilson.png": "Wilson",
};

function altFromFilename(name: string): string {
  if (PARTNER_NAMES[name]) return PARTNER_NAMES[name];
  const base = name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ");
  return base.replace(/\b\w/g, (c) => c.toUpperCase());
}

function LogoSlide({ file, alt }: { file: string; alt: string }) {
  return (
    <div className="flex h-12 w-24 shrink-0 items-center justify-center px-2 sm:h-14 sm:w-28 md:h-20 md:w-48 md:px-4">
      <img
        src={logoSrc(file)}
        alt={alt}
        className="max-h-full max-w-full object-contain opacity-75 grayscale transition duration-300 hover:opacity-100 hover:grayscale-0"
      />
    </div>
  );
}

export function PartnerLogoBand() {
  // The page is prerendered without knowing the viewer's motion preference, so the
  // first client render must match that (the marquee) and only switch to the static
  // grid once mounted. Reading the preference during hydration swapped the whole
  // subtree for reduced-motion viewers and threw React 418/423 on every home load.
  const prefersReduced = useReducedMotion();
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => setReduceMotion(Boolean(prefersReduced)), [prefersReduced]);

  if (partnerLogoFiles.length === 0) return null;

  if (reduceMotion) {
    return (
      <div className="flex flex-wrap justify-center gap-x-8 gap-y-10 px-2 py-2">
        {partnerLogoFiles.map((file) => (
          <LogoSlide key={file} file={file} alt={altFromFilename(file)} />
        ))}
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden py-2">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-background to-transparent md:w-20" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-background to-transparent md:w-20" />
      {/* Held still while a pointer rests on it, so a logo can be read (and its colour
          hover seen) without chasing it across the band. */}
      <div className="flex w-max animate-partner-marquee hover:[animation-play-state:paused] focus-within:[animation-play-state:paused]">
        <div className="flex shrink-0 gap-2 sm:gap-3 md:gap-6">
          {partnerLogoFiles.map((file) => (
            <LogoSlide key={file} file={file} alt={altFromFilename(file)} />
          ))}
        </div>
        <div className="flex shrink-0 gap-2 sm:gap-3 md:gap-6" aria-hidden>
          {partnerLogoFiles.map((file) => (
            <LogoSlide key={`copy-${file}`} file={file} alt="" />
          ))}
        </div>
      </div>
    </div>
  );
}
