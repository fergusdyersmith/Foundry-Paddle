import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { BOOK_PAGE_PATH } from "@/constants/booking";
import { Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { LOGO_OPTIONS } from "@/theme-lab/themes";

// Rebrand-preview only: the Theme Lab can swap the header logo. Reads the
// lab's localStorage state; inert (always the text wordmark) in plain builds.
const THEME_LAB_ENABLED = import.meta.env.VITE_THEME_LAB === "1";

function useLabLogo() {
  const [logoId, setLogoId] = useState("current");
  useEffect(() => {
    if (!THEME_LAB_ENABLED) return;
    const read = () => {
      try {
        const s = JSON.parse(window.localStorage.getItem("foundry-theme-lab") || "{}");
        setLogoId(s.logoId || "current");
      } catch {
        /* keep current */
      }
    };
    read();
    window.addEventListener("theme-lab-update", read);
    return () => window.removeEventListener("theme-lab-update", read);
  }, []);
  return LOGO_OPTIONS.find((l) => l.id === logoId && l.src) ?? null;
}

type NavItem =
  | { label: string; path: string }
  | { label: string; href: string; external: true };

// Deliberately lean: conversion pages up top; FAQ/Contact/App live in the
// footer, and the logo covers Home. (See the July 2026 nav consolidation.)
const navLinks: NavItem[] = [
  { label: "THE SPORT", path: "/the-sport" },
  { label: "THE CLUB", path: "/the-club" },
  { label: "SCHEDULE", path: "/schedule" },
  { label: "COACHING", path: "/coaching" },
  { label: "MEMBERSHIPS", path: "/memberships" },
];

const Header = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const labLogo = useLabLogo();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        {labLogo ? (
          <Link to="/" className="flex items-center" aria-label="Foundry Padel home">
            <img src={labLogo.src!} alt="Foundry Padel" className={`${labLogo.heightClass} w-auto`} />
          </Link>
        ) : (
          <Link to="/" className="font-display text-2xl tracking-widest text-foreground">
            FOUNDRY <span className="text-primary">PADEL</span>
          </Link>
        )}

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-8">
          {navLinks.map((link) =>
            "external" in link ? (
              <a
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="font-body text-xs tracking-[0.2em] uppercase text-muted-foreground transition-colors hover:text-primary"
              >
                {link.label}
              </a>
            ) : (
              <Link
                key={link.path}
                to={link.path}
                className={`font-body text-xs tracking-[0.2em] uppercase transition-colors hover:text-primary ${
                  location.pathname === link.path ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {link.label}
              </Link>
            ),
          )}
          <Link
            to={BOOK_PAGE_PATH}
            className="bg-primary px-6 py-2 font-display text-sm tracking-widest text-primary-foreground transition-all hover:brightness-110"
          >
            BOOK A COURT
          </Link>
        </nav>

        {/* Mobile toggle */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="lg:hidden text-foreground"
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile nav */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.nav
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden overflow-hidden border-t border-border/50 bg-background"
          >
            <div className="flex flex-col items-center gap-6 py-8">
              {navLinks.map((link) =>
                "external" in link ? (
                  <a
                    key={link.label}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setMobileOpen(false)}
                    className="font-body text-sm tracking-[0.2em] uppercase text-muted-foreground transition-colors hover:text-primary"
                  >
                    {link.label}
                  </a>
                ) : (
                  <Link
                    key={link.path}
                    to={link.path}
                    onClick={() => setMobileOpen(false)}
                    className={`font-body text-sm tracking-[0.2em] uppercase transition-colors hover:text-primary ${
                      location.pathname === link.path ? "text-primary" : "text-muted-foreground"
                    }`}
                  >
                    {link.label}
                  </Link>
                ),
              )}
              <Link
                to={BOOK_PAGE_PATH}
                onClick={() => setMobileOpen(false)}
                className="bg-primary px-8 py-3 font-display text-sm tracking-widest text-primary-foreground transition-all hover:brightness-110"
              >
                BOOK A COURT
              </Link>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Header;
