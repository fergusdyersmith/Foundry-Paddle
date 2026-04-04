import { Link } from "react-router-dom";
import { Instagram, Facebook } from "lucide-react";
import { BOOK_PAGE_PATH } from "@/constants/booking";
import { GOOGLE_MAPS_EMBED_SRC, GOOGLE_MAPS_URL } from "@/constants/location";

const TikTokIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
  </svg>
);

type FooterNavLink =
  | { label: string; path: string }
  | { label: string; href: string; external: true };

const footerLinks: FooterNavLink[] = [
  { label: "The Sport", path: "/the-sport" },
  { label: "The Club", path: "/the-club" },
  { label: "Memberships", path: "/memberships" },
  { label: "FAQ", path: "/faq" },
  { label: "Contact", path: "/contact" },
  { label: "Book a Court", path: BOOK_PAGE_PATH },
];

const Footer = () => {
  return (
    <footer className="border-t border-border py-16 px-6">
      <div className="mx-auto max-w-5xl">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-4">
          {/* Brand */}
          <div>
            <Link to="/" className="font-display text-xl tracking-widest text-foreground">
              FOUNDRY <span className="text-primary">PADEL</span>
            </Link>
            <p className="mt-3 font-body text-sm text-muted-foreground">
              Portland's first padel club.<br />
              <a href={GOOGLE_MAPS_URL} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">8613 N Crawford St, Portland, OR 97203</a>
            </p>
          </div>

          {/* Links */}
          <div>
            <span className="font-body text-xs uppercase tracking-[0.2em] text-muted-foreground">Navigate</span>
            <div className="mt-3 flex flex-col gap-2">
              {footerLinks.map((link) =>
                "external" in link ? (
                  <a
                    key={link.label}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-body text-sm text-secondary-foreground hover:text-primary transition-colors"
                  >
                    {link.label}
                  </a>
                ) : (
                  <Link key={link.path} to={link.path} className="font-body text-sm text-secondary-foreground hover:text-primary transition-colors">
                    {link.label}
                  </Link>
                ),
              )}
            </div>
          </div>

          {/* Contact & Social */}
          <div>
            <span className="font-body text-xs uppercase tracking-[0.2em] text-muted-foreground">Connect</span>
            <div className="mt-3">
              <a href="mailto:portland@foundrypadel.com" className="font-body text-sm text-secondary-foreground hover:text-primary transition-colors">
                portland@foundrypadel.com
              </a>
              <div className="flex items-center gap-5 mt-4">
                <a href="https://instagram.com/foundrypadelpdx" target="_blank" rel="noopener noreferrer" className="text-muted-foreground transition-colors hover:text-primary"><Instagram size={18} /></a>
                <a href="https://www.facebook.com/share/1Cerw2CTec/?mibextid=wwXIfr" target="_blank" rel="noopener noreferrer" className="text-muted-foreground transition-colors hover:text-primary"><Facebook size={18} /></a>
                <a href="https://tiktok.com/@foundry.padel" target="_blank" rel="noopener noreferrer" className="text-muted-foreground transition-colors hover:text-primary"><TikTokIcon size={18} /></a>
              </div>
            </div>
          </div>

          {/* Map — compact, same column rhythm as above */}
          <div>
            <span className="font-body text-xs uppercase tracking-[0.2em] text-muted-foreground">Location</span>
            <div className="mt-3">
              <a
                href={GOOGLE_MAPS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="block aspect-square w-full max-w-[240px] border border-border overflow-hidden md:max-w-none"
                aria-label="View on Google Maps"
              >
                <iframe
                  title="Foundry Padel location"
                  src={GOOGLE_MAPS_EMBED_SRC}
                  className="h-full w-full pointer-events-none"
                  style={{ filter: "grayscale(1) invert(1) contrast(1.2) brightness(0.6)" }}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </a>
            </div>
          </div>
        </div>

        <div className="section-divider mt-12 mb-8" />
        <p className="font-body text-xs text-muted-foreground text-center">
          © {new Date().getFullYear()} Foundry Padel Inc. All rights reserved.
        </p>
      </div>
    </footer>
  );
};

export default Footer;
