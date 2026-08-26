/**
 * When the club is open. One fact, one place.
 *
 * This existed as five separate hardcoded strings across the footer, /contact,
 * the homepage, /new-to-padel and the FAQ, and they drifted: the visible copy
 * said 7AM–10PM while the meta descriptions, the membership peak/off-peak
 * bands and the JSON-LD in index.html all said 6am–midnight. Import from here
 * rather than typing the hours again.
 *
 * Two places deliberately keep their own copy, because neither can import a
 * module: the `openingHoursSpecification` in fullsite/index.html (06:00–23:59)
 * and the phone agent's answer, which lives in `club_knowledge` in the Kumi
 * database. Both have to be changed by hand if the hours change.
 */

/** Compact form for stat badges and inline chips: "6AM–Midnight". */
export const HOURS_SHORT = "6AM–Midnight";

/** With the "open daily" framing, for the footer and contact details. */
export const HOURS_LINE = `Open Daily · ${HOURS_SHORT}`;

/** Sentence form, for body copy and FAQ answers. */
export const HOURS_SENTENCE = "every day from 6:00 AM to midnight";

/** Lowercase form for meta descriptions, where the copy runs together. */
export const HOURS_META = "6am–midnight";
