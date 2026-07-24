// Emits dist/sitemap.xml after the prerender build. Lists canonical URLs only:
// /pickleball (canonical -> /new-to-padel) and /terms (alias of /sms-terms)
// are deliberately excluded.
import { writeFileSync } from "fs";

const SITE = "https://www.foundrypadel.com";
const ROUTES = [
  "/",
  "/book",
  "/new-to-padel",
  "/coaching",
  "/schedule",
  "/memberships",
  "/the-sport",
  "/the-club",
  "/faq",
  "/contact",
  "/survey",
  "/privacy",
  "/sms-terms",
];

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
