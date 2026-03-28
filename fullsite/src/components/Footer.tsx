import { Link } from "react-router-dom";
import { Instagram, Facebook } from "lucide-react";
import { BOOK_PAGE_PATH } from "@/constants/booking";

const TikTokIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
  </svg>
);

type FooterNavLink =
  | { label: string; path: string }
  | { label: string; href: string; external: true };

const footerLinks: FooterNavLink[] = [
  { label: "The Sport", path: "/fullsite/the-sport" },
  { label: "The Club", path: "/fullsite/the-club" },
  { label: "Memberships", path: "/fullsite/memberships" },
  { label: "FAQ", path: "/fullsite/faq" },
  { label: "Contact", path: "/fullsite/contact" },
  { label: "Book a Court", path: BOOK_PAGE_PATH },
];

const Footer = () => {
  return (
    <footer className="border-t border-border py-16 px-6">
      <div className="mx-auto max-w-5xl">
        <div className="grid sm:grid-cols-3 gap-12">
          {/* Brand */}
          <div>
            <Link to="/fullsite" className="font-display text-xl tracking-widest text-foreground">
              FOUNDRY <span className="text-primary">PADEL</span>
            </Link>
            <p className="mt-3 font-body text-sm text-muted-foreground">
              Portland's first padel club.<br />
              <a href="https://maps.app.goo.gl/C9nVVN2M1TUWvZLU9" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">8613 N Crawford St, Portland, OR 97203</a>
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
        </div>

        <div className="section-divider mt-12 mb-8" />
        <p className="font-body text-xs text-muted-foreground text-center">
          © {new Date().getFullYear()} Foundry Padel. All rights reserved.
        </p>
      </div>
    </footer>
  );
};

export default Footer;
