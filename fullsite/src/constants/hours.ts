/**
 * When the club is open. One fact, one place.
 *
 * This existed as five separate hardcoded strings across the footer, /contact,
 * the homepage, /new-to-padel and the FAQ, and they drifted: the visible copy
 * said 7AM–10PM while the meta descriptions, the membership peak/off-peak
 * bands and the JSON-LD in index.html all said 6am–midnight. Import from here
 * rather than typing the hours again.
 *
 * Two places keep their own copy, because neither can import a module:
 *
 *   - `openingHoursSpecification` in fullsite/index.html (06:00–23:59).
 *   - The "Opening hours / what time do you open" row in Kumi's
 *     `club_knowledge`, which answers both the on-site chat widget and the
 *     phone agent. Read at padelmaps.org/api/public-knowledge, managed in the
 *     Kumi admin at app.foundrypadel.com; the two hostnames are the same
 *     backend, but only padelmaps.org routes /api.
 *
 * Both were checked on 26 August 2026 and both already said 6am–midnight. It
 * was this file's five copies that were stale, not them.
 */

/** Compact form for stat badges and inline chips: "6AM–Midnight". */
export const HOURS_SHORT = "6AM–Midnight";

/** With the "open daily" framing, for the footer and contact details. */
export const HOURS_LINE = `Open Daily · ${HOURS_SHORT}`;

/** Sentence form, for body copy and FAQ answers. */
export const HOURS_SENTENCE = "every day from 6:00 AM to midnight";

/** Lowercase form for meta descriptions, where the copy runs together. */
export const HOURS_META = "6am–midnight";
