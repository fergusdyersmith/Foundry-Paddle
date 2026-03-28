import { useReducedMotion } from "framer-motion";
import { partnerLogoFiles } from "virtual:partner-logos";

const logoSrc = (filename: string) => `${import.meta.env.BASE_URL}partner-logos/${filename}`;

function altFromFilename(name: string): string {
  const base = name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ");
  return base.replace(/\b\w/g, (c) => c.toUpperCase());
}

function LogoSlide({ file, alt }: { file: string; alt: string }) {
  return (
    <div className="flex h-16 w-40 shrink-0 items-center justify-center px-4 md:h-20 md:w-48">
      <img
        src={logoSrc(file)}
        alt={alt}
        className="max-h-full max-w-full object-contain opacity-75 grayscale transition duration-300 hover:opacity-100 hover:grayscale-0"
      />
    </div>
  );
}

export function PartnerLogoBand() {
  const reduceMotion = useReducedMotion();

  if (partnerLogoFiles.length === 0) return null;

  if (reduceMotion) {
    return (
      <div className="flex flex-wrap justify-center gap-x-8 gap-y-10 px-2">
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
      <div className="flex w-max animate-partner-marquee">
        <div className="flex shrink-0 gap-2 md:gap-4">
          {partnerLogoFiles.map((file) => (
            <LogoSlide key={file} file={file} alt={altFromFilename(file)} />
          ))}
        </div>
        <div className="flex shrink-0 gap-2 md:gap-4" aria-hidden>
          {partnerLogoFiles.map((file) => (
            <div key={`copy-${file}`} className="flex h-16 w-40 shrink-0 items-center justify-center px-4 md:h-20 md:w-48">
              <img
                src={logoSrc(file)}
                alt=""
                className="max-h-full max-w-full object-contain opacity-75 grayscale"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
