import type { ComponentType } from "react";
import type { RouteRecord } from "vite-react-ssg";
import Layout from "./Layout";
import Index from "./pages/Index";
import StaleDeployBoundary from "./components/StaleDeployBoundary";

// Every page but the home page is its own chunk, so a visitor downloads the page they
// opened rather than all twenty-five. vite-react-ssg still prerenders each one, links its
// chunk as a modulepreload in that page's HTML, and loads it before hydrating, so nothing
// renders twice. A client-side navigation waits for the next page's chunk with the
// current page still on screen. Keep the import() written out inside each `lazy`:
// vite-react-ssg reads the function's source to find which chunk to preload.
const page = (m: { default: ComponentType }) => ({ Component: m.default });

// Route table consumed by vite-react-ssg. Every static path below is rendered to
// a real HTML file at build time; the "*" catch-all stays client-only.
export const routes: RouteRecord[] = [
  {
    path: "/",
    element: <Layout />,
    // A tab left open across a deploy crashes on the next CLIENT-SIDE navigation:
    // vite-react-ssg fetches static-loader-data-manifest-<old hash>.json, gets a
    // 404 whose body is "Not found", and parses it as JSON. Without this the user
    // sees React Router's raw "Unexpected Application Error!" and has to know to
    // refresh. See StaleDeployBoundary.
    errorElement: <StaleDeployBoundary />,
    children: [
      { index: true, element: <Index /> },
      { path: "the-sport", lazy: () => import("./pages/TheSport").then(page) },
      { path: "the-club", lazy: () => import("./pages/TheClub").then(page) },
      { path: "schedule", lazy: () => import("./pages/Schedule").then(page) },
      { path: "memberships", lazy: () => import("./pages/Memberships").then(page) },
      { path: "faq", lazy: () => import("./pages/FAQ").then(page) },
      { path: "contact", lazy: () => import("./pages/Contact").then(page) },
      // Venue hire: the space inventory and capacity figures behind the Travel
      // Portland listing. Not the Playtomic session feed — see Events.tsx.
      { path: "events", lazy: () => import("./pages/Events").then(page) },
      // The neighbourhood preview evening. Printed in the North Peninsula Review as
      // foundrypadel.com/preview and encoded in that ad's QR code: the path cannot move.
      { path: "preview", lazy: () => import("./pages/Preview").then(page) },
      // Same deal: printed as foundrypadel.com/juniors on the junior clinic ad.
      { path: "juniors", lazy: () => import("./pages/Juniors").then(page) },
      // The junior waiver, signed online. Linked from the clinic page and the reminder
      // emails; not in the sitemap, it is a form, not a page to find.
      { path: "juniors/waiver", lazy: () => import("./pages/JuniorWaiver").then(page) },
      // The December open. Printed on its flyers as foundrypadel.com/open.
      { path: "open", lazy: () => import("./pages/Open").then(page) },
      // The club league. Printed on its poster as foundrypadel.com/league.
      { path: "league", lazy: () => import("./pages/League").then(page) },
      // Score reporting for league teams. Linked from the league page and Ryan's weekly
      // fixtures; not in the sitemap, it is a form, not a page to find.
      { path: "league/score", lazy: () => import("./pages/LeagueScore").then(page) },
      // The other team's confirm-or-dispute link from the score email.
      { path: "league/confirm", lazy: () => import("./pages/LeagueConfirm").then(page) },
      { path: "book", lazy: () => import("./pages/Book").then(page) },
      // Gift certificates. The checkout page is prerendered like any other; the
      // thank-you page is where Square sends the buyer back to, and reads its order
      // reference and token from the query string, so it is client-only in practice.
      { path: "gift-cards", lazy: () => import("./pages/GiftCards").then(page) },
      { path: "gift/thanks", lazy: () => import("./pages/GiftThanks").then(page) },
      { path: "new-to-padel", lazy: () => import("./pages/NewToPadel").then(page) },
      // Alias for pickleball-targeted ads/flyers; canonical points to /new-to-padel.
      { path: "pickleball", lazy: () => import("./pages/NewToPadel").then(page) },
      // Footer-only page: the Kumi skill tree as a public self-assessment.
      { path: "survey", lazy: () => import("./pages/SkillSurvey").then(page) },
      // Preview (rebrand branch): coaching roster + live sessions per coach.
      // Free matchmaking: the on-ramp to /join, plus the measured best times to post
      // an open match. /join itself stays a reverse proxy of Kumi's page (server.js).
      { path: "find-players", lazy: () => import("./pages/FindPlayers").then(page) },
      { path: "coaching", lazy: () => import("./pages/Coaching").then(page) },
      // The tournament-shoot photo set (footer nav + sitemap).
      { path: "gallery", lazy: () => import("./pages/Gallery").then(page) },
      // Hidden (no nav link, noindex, absent from the sitemap): the one place we
      // send people for the WhatsApp community, so the invite URL itself never
      // has to appear in the chatbot, on Instagram or at the front desk.
      { path: "community", lazy: () => import("./pages/Community").then(page) },
      { path: "privacy", lazy: () => import("./pages/Privacy").then(page) },
      { path: "sms-terms", lazy: () => import("./pages/SmsTerms").then(page) },
      { path: "terms", lazy: () => import("./pages/SmsTerms").then(page) },
      // Prerendered to dist/404.html so server.js has a real page to send with a
      // 404 status on unknown paths (see the fallback in server.js). noindex.
      { path: "404", lazy: () => import("./pages/NotFound").then(page) },
      { path: "*", lazy: () => import("./pages/NotFound").then(page) },
    ],
  },
  // Operator wall-screen (hidden, noindex, no site chrome).
  { path: "/tv", lazy: () => import("./pages/TvScreen").then(page), errorElement: <StaleDeployBoundary /> },
];
