import { Instagram, Facebook } from "lucide-react";

const TikTokIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
  </svg>
);

const Footer = () => {
  return (
    <footer className="border-t border-border py-12 px-6">
      <div className="mx-auto max-w-4xl flex flex-col items-center gap-6">
        <div className="font-display text-xl tracking-widest text-foreground">
          FOUNDRY <span className="text-primary">PADEL</span>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-4 text-sm text-muted-foreground font-body">
          <a href="https://maps.app.goo.gl/C9nVVN2M1TUWvZLU9" target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-primary">8613 N Crawford St, Portland, OR 97203</a>
          <span className="hidden sm:inline">·</span>
          <a
            href="mailto:portland@foundrypadel.com"
            className="transition-colors hover:text-primary"
          >
            portland@foundrypadel.com
          </a>
        </div>
        <div className="flex flex-col items-center gap-3">
          <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-body">Follow Us On</span>
          <div className="flex items-center gap-5">
            <a href="https://instagram.com/foundrypadelpdx" target="_blank" rel="noopener noreferrer" className="text-muted-foreground transition-colors hover:text-primary">
              <Instagram size={20} />
            </a>
            <a href="https://facebook.com/foundrypadel" target="_blank" rel="noopener noreferrer" className="text-muted-foreground transition-colors hover:text-primary">
              <Facebook size={20} />
            </a>
            <a href="https://tiktok.com/@foundry.padel" target="_blank" rel="noopener noreferrer" className="text-muted-foreground transition-colors hover:text-primary">
              <TikTokIcon size={20} />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
