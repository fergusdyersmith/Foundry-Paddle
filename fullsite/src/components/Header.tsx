import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { BOOK_PAGE_PATH } from "@/constants/booking";
import { motion, AnimatePresence } from "framer-motion";
import { LOGO_OPTIONS } from "@/theme-lab/themes";

// The Theme Lab (preview builds only) can swap the header logo; production
// always renders the default light monogram.
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
  { label: "FIND PLAYERS", path: "/find-players" },
  { label: "COACHING", path: "/coaching" },
  { label: "MEMBERSHIPS", path: "/memberships" },
];

/** Hamburger that folds into a cross: the outer bars swing to the centre and cross,
 *  the middle one fades. CSS transitions on SVG lines (index.css, "menu-toggle"). */
const MenuToggleIcon = ({ open }: { open: boolean }) => (
  <svg viewBox="0 0 24 24" width={24} height={24} className="menu-toggle" data-open={open || undefined} aria-hidden="true" focusable="false">
    <path className="menu-toggle-top" d="M3 6h18" />
    <path className="menu-toggle-mid" d="M3 12h18" />
    <path className="menu-toggle-bottom" d="M3 18h18" />
  </svg>
);

// Mobile links follow each other in when the menu opens.
const mobileList = { open: { transition: { staggerChildren: 0.04, delayChildren: 0.05 } }, closed: {} };
const mobileItem = { open: { opacity: 1, y: 0 }, closed: { opacity: 0, y: -8 } };

const Header = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const labLogo = useLabLogo();

  // Any navigation closes the menu, including the logo link and the back button.
  useEffect(() => setMobileOpen(false), [location.pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMobileOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  // Past the first few pixels the bar tightens up and firms its ground.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(`${path}/`);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 border-b backdrop-blur-md transition-[background-color,border-color,box-shadow] duration-300 ${
        scrolled
          ? "border-border bg-background/95 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.5)]"
          : "border-border/50 bg-background/80"
      }`}
    >
      <div
        className={`flex items-center justify-between px-6 transition-[padding] duration-300 lg:px-10 ${
          scrolled ? "py-2.5" : "py-4"
        }`}
      >
        <Link to="/" className="flex items-center" aria-label="Foundry Padel home">
          <img
            src={labLogo?.src ?? "/rebrand/FP_icon_light.svg"}
            alt=""
            className={`${labLogo?.heightClass ?? (scrolled ? "h-8" : "h-10")} w-auto transition-[height] duration-300`}
          />
        </Link>

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
                aria-current={isActive(link.path) ? "page" : undefined}
                className={`group relative py-1 font-body text-xs tracking-[0.2em] uppercase transition-colors hover:text-primary ${
                  isActive(link.path) ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {link.label}
                {/* Hover: a faint line grows from the left. Current page: a clay line
                    that slides across to the new link on navigation. */}
                <span
                  aria-hidden="true"
                  className="absolute inset-x-0 -bottom-1 h-px origin-left scale-x-0 bg-foreground/40 transition-transform duration-300 group-hover:scale-x-100"
                />
                {isActive(link.path) && (
                  <motion.span
                    layoutId="nav-current"
                    aria-hidden="true"
                    className="absolute inset-x-0 -bottom-1 h-px bg-primary"
                    transition={{ type: "spring", stiffness: 380, damping: 34 }}
                  />
                )}
              </Link>
            ),
          )}
          <Link
            to={BOOK_PAGE_PATH}
            className="bg-primary px-6 py-2 font-display text-sm tracking-widest text-primary-foreground transition-all hover:brightness-110 active:scale-[0.98]"
          >
            BOOK A COURT
          </Link>
        </nav>

        {/* Mobile toggle */}
        <button
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="lg:hidden text-foreground"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
          aria-controls="mobile-nav"
        >
          <MenuToggleIcon open={mobileOpen} />
        </button>
      </div>

      {/* Mobile nav */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.nav
            id="mobile-nav"
            aria-label="Main"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="lg:hidden overflow-hidden border-t border-border/50 bg-background"
          >
            <motion.div variants={mobileList} initial="closed" animate="open" className="flex flex-col items-center gap-6 py-8">
              {navLinks.map((link) =>
                "external" in link ? (
                  <motion.a
                    key={link.label}
                    variants={mobileItem}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setMobileOpen(false)}
                    className="font-body text-sm tracking-[0.2em] uppercase text-muted-foreground transition-colors hover:text-primary"
                  >
                    {link.label}
                  </motion.a>
                ) : (
                  <motion.div key={link.path} variants={mobileItem}>
                    <Link
                      to={link.path}
                      onClick={() => setMobileOpen(false)}
                      aria-current={isActive(link.path) ? "page" : undefined}
                      className={`font-body text-sm tracking-[0.2em] uppercase transition-colors hover:text-primary ${
                        isActive(link.path) ? "text-primary" : "text-muted-foreground"
                      }`}
                    >
                      {link.label}
                    </Link>
                  </motion.div>
                ),
              )}
              <motion.div variants={mobileItem}>
                <Link
                  to={BOOK_PAGE_PATH}
                  onClick={() => setMobileOpen(false)}
                  className="inline-block bg-primary px-8 py-3 font-display text-sm tracking-widest text-primary-foreground transition-all hover:brightness-110"
                >
                  BOOK A COURT
                </Link>
              </motion.div>
            </motion.div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Header;
