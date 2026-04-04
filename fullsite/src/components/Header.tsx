import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { BOOK_PAGE_PATH } from "@/constants/booking";
import { Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const navLinks = [
  { label: "HOME", path: "/" },
  { label: "THE SPORT", path: "/the-sport" },
  { label: "THE CLUB", path: "/the-club" },
  { label: "MEMBERSHIPS", path: "/memberships" },
  { label: "FAQ", path: "/faq" },
  { label: "CONTACT", path: "/contact" },
];

const Header = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link to="/" className="font-display text-2xl tracking-widest text-foreground">
          FOUNDRY <span className="text-primary">PADEL</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`font-body text-xs tracking-[0.2em] uppercase transition-colors hover:text-primary ${
                location.pathname === link.path ? "text-primary" : "text-muted-foreground"
              }`}
            >
              {link.label}
            </Link>
          ))}
          <Link
            to={BOOK_PAGE_PATH}
            className={`border border-primary px-6 py-2 font-display text-sm tracking-widest transition-all hover:bg-primary hover:text-primary-foreground ${
              location.pathname === BOOK_PAGE_PATH ? "bg-primary text-primary-foreground" : "text-primary"
            }`}
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
              {navLinks.map((link) => (
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
              ))}
              <Link
                to={BOOK_PAGE_PATH}
                onClick={() => setMobileOpen(false)}
                className="border border-primary px-8 py-3 font-display text-sm tracking-widest text-primary transition-all hover:bg-primary hover:text-primary-foreground"
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
