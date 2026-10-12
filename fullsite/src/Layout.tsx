import { lazy, Suspense, useEffect } from "react";
import { Outlet } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MotionConfig } from "framer-motion";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ScrollToTop from "@/components/ScrollToTop";
import ChatWidget from "@/components/ChatWidget";
import Analytics from "@/components/Analytics";
import { initMotion } from "@/lib/motion";
import { clearStaleDeployFlag } from "@/lib/staleDeploy";

// Rebrand preview overlay — only in builds with VITE_THEME_LAB=1 (the Railway
// test service). The flag is compile-time, so production bundles exclude the
// lab entirely.
const THEME_LAB_ENABLED = import.meta.env.VITE_THEME_LAB === "1";
const ThemeLab = THEME_LAB_ENABLED
  ? lazy(() => import("@/theme-lab/ThemeLab"))
  : null;

// One client for the whole app. Kept at module scope so it survives re-renders
// (and is created once during static prerendering).
const queryClient = new QueryClient();

// Root layout shared by every route: providers + chrome (Header/Footer) around
// the routed page. Rendered on the server during prerender and hydrated on the
// client, so all page content ships as crawlable HTML.
const Layout = () => {
  // Scroll entrances switch on only after hydration, so the prerendered page is never
  // hidden from a visitor (or crawler) whose JavaScript hasn't run. See lib/motion.ts.
  useEffect(() => initMotion(), []);
  // Reaching here means the page loaded, so a past stale-deploy reload did its job.
  useEffect(() => clearStaleDeployFlag(), []);

  return (
    <QueryClientProvider client={queryClient}>
      {/* The framer-driven bits (menus, panels) follow the visitor's reduced-motion
          setting, as the CSS entrances already do. */}
      <MotionConfig reducedMotion="user">
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <ScrollToTop />
          <Analytics />
          <Header />
          <Outlet />
          <Footer />
          <ChatWidget />
          {ThemeLab && (
            <Suspense fallback={null}>
              <ThemeLab />
            </Suspense>
          )}
        </TooltipProvider>
      </MotionConfig>
    </QueryClientProvider>
  );
};

export default Layout;
