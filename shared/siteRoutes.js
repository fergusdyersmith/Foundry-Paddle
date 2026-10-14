// The site's pages, in one place. The sitemap generator, the chat widget (which turns these
// paths into links) and the website chatbot (which may offer them) all read this list, so a
// new page reaches all three on the deploy that adds it. Before, each kept its own copy, and
// the chatbot's was missing /league, /juniors, /open, /events and /gift-cards (2026-10-14).

/** Canonical pages: in the sitemap, linkable in the chat, offered by the bot. */
export const SITEMAP_ROUTES = [
  "/",
  "/book",
  "/new-to-padel",
  "/find-players",
  "/coaching",
  "/schedule",
  "/memberships",
  "/the-sport",
  "/the-club",
  "/gallery",
  "/faq",
  "/contact",
  "/events",
  "/preview",
  "/juniors",
  "/open",
  "/league",
  "/gift-cards",
  "/survey",
  "/privacy",
  "/sms-terms",
];

/** Real pages kept out of nav and search on purpose, that the chat may still send people
 *  to: the group chats, and the Kumi sign-up. Not in the sitemap. */
export const UNLISTED_ROUTES = ["/community", "/join"];
