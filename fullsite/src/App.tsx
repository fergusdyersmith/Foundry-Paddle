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
import Community from "./pages/Community";
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
      { path: "book", element: <Book /> },
      { path: "new-to-padel", element: <NewToPadel /> },
      // Alias for pickleball-targeted ads/flyers; canonical points to /new-to-padel.
      { path: "pickleball", element: <NewToPadel /> },
      // Footer-only page: the Kumi skill tree as a public self-assessment.
      { path: "survey", element: <SkillSurvey /> },
      // Preview (rebrand branch): coaching roster + live sessions per coach.
      { path: "coaching", element: <Coaching /> },
      // Hidden (no nav link, noindex, absent from the sitemap): the one place we
      // send people for the WhatsApp community, so the invite URL itself never
      // has to appear in the chatbot, on Instagram or at the front desk.
      { path: "community", element: <Community /> },
      { path: "privacy", element: <Privacy /> },
      { path: "sms-terms", element: <SmsTerms /> },
      { path: "terms", element: <SmsTerms /> },
      { path: "*", element: <NotFound /> },
    ],
  },
  // Operator wall-screen (hidden, noindex, no site chrome).
  { path: "/tv", element: <TvScreen />, errorElement: <StaleDeployBoundary /> },
];
