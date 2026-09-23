import type { RouteRecord } from "vite-react-ssg";
import Layout from "./Layout";
import Index from "./pages/Index";
import TheSport from "./pages/TheSport";
import TheClub from "./pages/TheClub";
import Memberships from "./pages/Memberships";
import Schedule from "./pages/Schedule";
import FAQ from "./pages/FAQ";
import Contact from "./pages/Contact";
import Book from "./pages/Book";
import NewToPadel from "./pages/NewToPadel";
import SkillSurvey from "./pages/SkillSurvey";
import Coaching from "./pages/Coaching";
import FindPlayers from "./pages/FindPlayers";
import Community from "./pages/Community";
import Gallery from "./pages/Gallery";
import Events from "./pages/Events";
import Preview from "./pages/Preview";
import Juniors from "./pages/Juniors";
import GiftCards from "./pages/GiftCards";
import GiftThanks from "./pages/GiftThanks";
import TvScreen from "./pages/TvScreen";
import Privacy from "./pages/Privacy";
import SmsTerms from "./pages/SmsTerms";
import NotFound from "./pages/NotFound";
import StaleDeployBoundary from "./components/StaleDeployBoundary";

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
      { path: "the-sport", element: <TheSport /> },
      { path: "the-club", element: <TheClub /> },
      { path: "schedule", element: <Schedule /> },
      { path: "memberships", element: <Memberships /> },
      { path: "faq", element: <FAQ /> },
      { path: "contact", element: <Contact /> },
      // Venue hire: the space inventory and capacity figures behind the Travel
      // Portland listing. Not the Playtomic session feed — see Events.tsx.
      { path: "events", element: <Events /> },
      // The neighbourhood preview evening. Printed in the North Peninsula Review as
      // foundrypadel.com/preview and encoded in that ad's QR code: the path cannot move.
      { path: "preview", element: <Preview /> },
      // Same deal: printed as foundrypadel.com/juniors on the junior clinic ad.
      { path: "juniors", element: <Juniors /> },
      { path: "book", element: <Book /> },
      // Gift certificates. The checkout page is prerendered like any other; the
      // thank-you page is where Square sends the buyer back to, and reads its order
      // reference and token from the query string, so it is client-only in practice.
      { path: "gift-cards", element: <GiftCards /> },
      { path: "gift/thanks", element: <GiftThanks /> },
      { path: "new-to-padel", element: <NewToPadel /> },
      // Alias for pickleball-targeted ads/flyers; canonical points to /new-to-padel.
      { path: "pickleball", element: <NewToPadel /> },
      // Footer-only page: the Kumi skill tree as a public self-assessment.
      { path: "survey", element: <SkillSurvey /> },
      // Preview (rebrand branch): coaching roster + live sessions per coach.
      // Free matchmaking: the on-ramp to /join, plus the measured best times to post
      // an open match. /join itself stays a reverse proxy of Kumi's page (server.js).
      { path: "find-players", element: <FindPlayers /> },
      { path: "coaching", element: <Coaching /> },
      // The tournament-shoot photo set (footer nav + sitemap).
      { path: "gallery", element: <Gallery /> },
      // Hidden (no nav link, noindex, absent from the sitemap): the one place we
      // send people for the WhatsApp community, so the invite URL itself never
      // has to appear in the chatbot, on Instagram or at the front desk.
      { path: "community", element: <Community /> },
      { path: "privacy", element: <Privacy /> },
      { path: "sms-terms", element: <SmsTerms /> },
      { path: "terms", element: <SmsTerms /> },
      // Prerendered to dist/404.html so server.js has a real page to send with a
      // 404 status on unknown paths (see the fallback in server.js). noindex.
      { path: "404", element: <NotFound /> },
      { path: "*", element: <NotFound /> },
    ],
  },
  // Operator wall-screen (hidden, noindex, no site chrome).
  { path: "/tv", element: <TvScreen />, errorElement: <StaleDeployBoundary /> },
];
