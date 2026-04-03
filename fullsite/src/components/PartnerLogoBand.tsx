import { partnerLogoFiles } from "virtual:partner-logos";

const logoSrc = (filename: string) => `${import.meta.env.BASE_URL}partner-logos/${filename}`;

function altFromFilename(name: string): string {
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
  if (partnerLogoFiles.length === 0) return null;

  return (
    <div className="flex flex-nowrap items-center justify-center gap-2 py-2 sm:gap-3 md:gap-6">
      {partnerLogoFiles.map((file) => (
        <LogoSlide key={file} file={file} alt={altFromFilename(file)} />
      ))}
    </div>
  );
}
