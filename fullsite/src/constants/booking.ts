/** External court booking (Playtomic whitelabel), used in the Book page iframe. */
export const PLAYTOMIC_BOOKING_URL =
  "https://playtomic.io/wl/70cae734-e32f-4e3a-9f72-516d9f025125";

/** Public club page on Playtomic (book in the browser). */
export const PLAYTOMIC_CLUB_URL = "https://playtomic.com/clubs/foundry-padel";

/** Opens this venue in Playtomic (app / mobile web). */
export const PLAYTOMIC_TENANT_URL =
  "https://app.playtomic.io/tenant/70cae734-e32f-4e3a-9f72-516d9f025125";

export const PLAYTOMIC_APP_STORE_URL =
  "https://apps.apple.com/us/app/playtomic-padel-pickleball/id1242321076";

export const PLAYTOMIC_PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=com.playtomic";

/** Internal route that embeds Playtomic — use this for nav and CTAs so users stay on the site. */
export const BOOK_PAGE_PATH = "/book";

/** Buying a membership: one Playtomic category per tier.
 *
 * These are the real product pages, so the key has to keep matching the tier it is sold
 * as. Sending someone to the wrong category takes their money for the wrong membership,
 * which is not something the page can detect or undo.
 *
 * The `?utm_source=manager` is what Playtomic appends when a link is copied out of the
 * Manager UI, and it is kept exactly as supplied so the links are known-good. Worth
 * knowing: it means sign-ups that came from this website are attributed to "manager" in
 * Playtomic's own reporting, indistinguishable from ones staff sent by hand. Changing
 * the value here is the only edit needed to separate them.
 */
export const PLAYTOMIC_MEMBERSHIP_URLS = {
  student:
    "https://app.playtomic.io/category/ee662524-28bc-4879-adfc-143ca94c7409?utm_source=manager",
  regular:
    "https://app.playtomic.io/category/9b433241-1ba3-45a8-bdac-9afd66560a84?utm_source=manager",
  padelhead:
    "https://app.playtomic.io/category/a8c503c3-ea17-41e6-aa4b-3e0c2a77a908?utm_source=manager",
} as const;
