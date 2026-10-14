// Emits dist/sitemap.xml after the prerender build. Lists canonical URLs only:
// /pickleball (canonical -> /new-to-padel) and /terms (alias of /sms-terms)
// are deliberately excluded, and so is /gift/thanks, which is a transactional page
// nobody should arrive at from a search result.
import { writeFileSync } from "fs";
import { SITEMAP_ROUTES } from "../../shared/siteRoutes.js";

const SITE = "https://www.foundrypadel.com";
// The list lives in shared/siteRoutes.js, which the chat widget and chatbot read too.
const ROUTES = SITEMAP_ROUTES;

const today = new Date().toISOString().slice(0, 10);
const xml =
  '<?xml version="1.0" encoding="UTF-8"?>\n' +
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  ROUTES.map(
    (r) => `  <url><loc>${SITE}${r === "/" ? "" : r}</loc><lastmod>${today}</lastmod></url>`,
  ).join("\n") +
  "\n</urlset>\n";

writeFileSync(new URL("../dist/sitemap.xml", import.meta.url), xml);
console.log(`sitemap.xml written (${ROUTES.length} URLs)`);
