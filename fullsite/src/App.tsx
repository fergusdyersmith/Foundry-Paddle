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
import Privacy from "./pages/Privacy";
import SmsTerms from "./pages/SmsTerms";
import NotFound from "./pages/NotFound";

// Route table consumed by vite-react-ssg. Every static path below is rendered to
// a real HTML file at build time; the "*" catch-all stays client-only.
export const routes: RouteRecord[] = [
  {
    path: "/",
    element: <Layout />,
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
      { path: "privacy", element: <Privacy /> },
      { path: "sms-terms", element: <SmsTerms /> },
      { path: "terms", element: <SmsTerms /> },
      { path: "*", element: <NotFound /> },
    ],
  },
];
