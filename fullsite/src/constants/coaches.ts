/** Coaching roster for the /coaching page.
 *
 *  Profile data (bios, rates, availability, photos) is snapshotted from the
 *  Kumi admin panel's Coaches tab; entries flagged `mock: true` are
 *  placeholder copy/photos awaiting real content. Upcoming class assignments
 *  come live from /api/coaching/classes (Kumi-ingested Playtomic data) and are
 *  matched to coaches via `aliases` (class data uses inconsistent name forms,
 *  e.g. "Kelly" vs "Kelly Correia").
 *
 *  `photo` is always a LOCAL path under fullsite/public/coaches. It used to point
 *  straight at Playtomic's Cloudinary, whose URLs end in the upload timestamp — so
 *  when Kelly changed his picture on 2026-09-12 the old object 404'd and his tile
 *  fell back to the grey placeholder. The images are mirrored into the repo by
 *  `node scripts/sync-coach-photos.mjs`; run it (dry run first) to pick up a coach's
 *  new photo. Do not hand-edit `photo` back to a remote URL.
 */

export interface PrivateLessons {
  /** True when bookable directly in the Playtomic app (Ryan today). */
  playtomicBookable: boolean;
  /**
   * Headline 1-on-1 price, ALWAYS court-inclusive, always the same shape:
   * "$N/hour, court included".
   *
   * SOURCE OF TRUTH is Playtomic's per-coach pricing rules, which Kumi syncs to
   * Coach.profile_json["pt_lesson"] and whose prices already include the court:
   *   GET manager.playtomic.io/api/v1/coach_pricing_rules?tenant_id=&user_id=
   *
   * Do NOT derive these by adding the $40 court fee to a coach's free-text rate.
   * That was tried and three of five came out wrong, because the free text was
   * stale (Juan) or simply a different number from what the coach had configured
   * in Playtomic (Carlos $60+court=$100 against a real $85, Kelly $60+court=$100
   * against a real $70). The free text is what someone typed into an admin form
   * once; pt_lesson is what a customer is actually charged at checkout.
   *
   * Group pricing goes in `detail`, not here. "PRIVATE LESSONS" means 1-on-1.
   */
  rate: string;
  availability?: string;
  /** Extra schedule/pricing detail for Playtomic-bookable lessons. */
  detail?: string;
}

export interface CoachProfile {
  id: string;
  name: string;
  /** Short name used in class titles and UI. */
  firstName: string;
  headCoach?: boolean;
  photo: string;
  /** Lowercased name forms seen in Playtomic class coach data. */
  aliases: string[];
  bio: string;
  specialties?: string;
  certifications?: string;
  languages?: string;
  levelRange?: string;
  privateLessons?: PrivateLessons;
  /**
   * False for a coach not taking private lessons here at the moment, which hides the
   * PRIVATE LESSONS panel outright.
   *
   * Absent means they are, and the panel shows either their rate or "Private
   * availability coming soon" with a mail link. That default is right for somebody who
   * has not set pricing up yet and wrong for somebody who has stopped coaching: it
   * invites a member to email about a lesson nobody is going to give, and "coming soon"
   * is a promise the club cannot keep on their behalf.
   *
   * They keep their bio on the page. Whether they return is the club's call, not this
   * file's, and deleting a coach loses the photo and the aliases that match their
   * historic classes.
   */
  takingPrivateLessons?: boolean;
  /** Placeholder bio/photo pending real content from the coach. */
  mock?: boolean;
}

export const COACHES: CoachProfile[] = [
  {
    id: "eugene",
    name: "Eugene Jung",
    firstName: "Eugene",
    photo: "/coaches/eugene.jpg",
    aliases: ["eugene jung", "eugene"],
    bio: "Eugene is a competitive tennis player with a USTA 4.5 rating and has competed at the national level. A lifelong racquet sports enthusiast, he also founded Pips & Bounce, Portland's premier ping pong social club, combining his passion for sport with building community.",
    specialties:
      "Helping beginner and intermediate players build confidence: proper fundamentals, sound technique, and smart court habits for long-term development.",
    languages: "English",
    levelRange: "Beginner & intermediate",
    // Not coaching here at the moment. The rate that sat here was the last one derived
    // from free text rather than Playtomic, and by 2026-09-18 it was also the cheapest
    // on the page, for lessons nobody was giving.
    takingPrivateLessons: false,
  },
  {
    id: "kelly",
    name: "Kelly Correia",
    firstName: "Kelly",
    photo: "/coaches/kelly.jpg",
    aliases: ["kelly correia", "kelly"],
    bio: "RPP certified coach focused on tactics, technique, and footwork. Every session follows the same structure: ball feed to practice the skill, a focused drill to reinforce it, then a game situation to put it all together.",
    specialties:
      "Tactics, technique, footwork. Intermediate+: back glass, side glass, double-wall, lobs, bandeja, bajadas. Beginners: volleys, lobs, core technique.",
    certifications: "RPP",
    languages: "English",
    levelRange: "Beginner & intermediate",
    privateLessons: {
      playtomicBookable: true,
      rate: "$125/hour, court included",
      availability: "Tue and Thu, 10–11 AM",
      detail:
        "2 people: $150/hr · 3 people: $170/hr · 4 people: $190/hr, court included. 90-min and 2-hr sessions available.",
    },
  },
  {
    id: "ryan",
    name: "Ryan Chin",
    firstName: "Ryan",
    photo: "/coaches/ryan.jpg",
    aliases: ["ryan chin", "ryan"],
    bio: "Played national-level tennis and racquetball through college, and fell in love with padel while traveling in Europe. Excited to see the sport grow and push players to the next level.",
    specialties:
      "Shot technique, tennis transition to padel, offensive net play, advanced tactics and strategy",
    certifications: "RPP Certified Coach (Level 1 & 2)",
    languages: "English",
    levelRange: "All levels",
    privateLessons: {
      playtomicBookable: true,
      rate: "$125/hour, court included",
      availability: "Tue, Wed, Thu · 5–10 PM; Mon · 5–8 PM and 9–10 PM",
      detail:
        "2 people: $150/hr · 3 people: $170/hr · 4 people: $190/hr, court included. 90-min and 2-hr sessions available.",
    },
  },
  {
    id: "carlos",
    name: "Carlos Ramírez Mazuera",
    firstName: "Carlos",
    photo: "/coaches/carlos.jpg",
    aliases: ["carlos ramírez mazuera", "carlos ramirez mazuera", "carlos"],
    bio: "Bilingual RPP Level 1 & 2 padel coach, fitness and conditioning coach, and former competitive tennis player. Helping players build confidence, technique, movement, and enjoy the game from day one.",
    specialties:
      "Player development at every level, racquet-sports-to-padel transition, stroke development, match strategy and court positioning, fitness and conditioning for padel",
    certifications: "RPP Padel Coach (Levels 1 & 2), ISSA Personal Trainer",
    languages: "English, Spanish",
    levelRange: "All levels",
    privateLessons: {
      playtomicBookable: true,
      rate: "$125/hour, court included",
      // Mornings only. The 4:30–6:30 PM slot was a Playtomic pricing rule that ran
      // one month and lapsed on 2026-08-28; it was still advertised here for three
      // weeks after it stopped being bookable.
      availability: "Tue, Wed, Thu · 6:30–8:30 AM",
      detail:
        "2 people: $150/hr · 3 people: $170/hr · 4 people: $190/hr, court included. 90-min and 2-hr sessions available. Packages available.",
    },
  },
  {
    id: "juan",
    name: "Juan Gomez Humphrey",
    firstName: "Juan",
    photo: "/coaches/juan.jpg",
    aliases: ["juan gomez humphrey", "juan"],
    bio: "Passionate lifelong padel and tennis player. Coached tennis for 5 years and now RPP-certified coaching padel too. Started playing padel as a teenager in Mexico in the 90s and fell in love with the sport — now eager to pass on his experience and love of the game.",
    specialties:
      "All levels; strategy and on-court tactics; extra experience with young and junior players (also coaches tennis at Cleveland High School)",
    certifications: "RPP Level 2 Padel Certified",
    languages: "English, Spanish",
    levelRange: "All levels",
    privateLessons: {
      playtomicBookable: true,
      rate: "$125/hour, court included",
      // Mon–Wed is two Playtomic rules back to back, 9–3 and 3–5, so it reads as one
      // 9–5 window here. They were priced differently until 2026-09-17; every coach
      // is on one rate now, so there is no longer an off-peak band to mention.
      availability: "Mon–Wed · 9 AM–5 PM; Thu and Fri · 9 AM–12 PM",
      detail:
        "2 people: $150/hr · 3 people: $170/hr · 4 people: $190/hr, court included. 90-min and 2-hr sessions available.",
    },
  },
  {
    id: "jack",
    name: "Jack Wang",
    firstName: "Jack",
    photo: "/coaches/jack.jpg",
    aliases: ["jack wang", "jack"],
    bio: "Full-time tennis coach bringing years of racquet-sport teaching to the court. Jack leads Foundry's 6-week padel course, taking players from first fundamentals to confident match play.",
    specialties: "6-week padel course, tennis-to-padel transition, fundamentals",
    levelRange: "All levels",
    mock: true,
  },
  {
    id: "tato",
    name: "Tato",
    firstName: "Tato",
    photo: "/coaches/tato.jpg",
    aliases: ["tato"],
    bio: "Tato leads Foundry's beginner open play clinics, where first-timers get comfortable on court fast: relaxed pace, lots of rallies, and plenty of encouragement.",
    specialties: "Beginner open play, first-timer onboarding",
    levelRange: "Beginner & intermediate",
    mock: true,
    // Not coaching here at the moment.
    takingPrivateLessons: false
  },
  {
    id: "axel",
    name: "Axel Garay",
    firstName: "Axel",
    photo: "/coaches/axel.jpg",
    aliases: ["axel garay", "axel"],
    bio: "Axel rounds out the Foundry coaching team, working with players across levels on fundamentals and consistent, repeatable technique.",
    specialties: "Fundamentals, consistency",
    levelRange: "All levels",
    mock: true,
    // Not coaching here at the moment.
    takingPrivateLessons: false
  },
];

export const TEAM_COACHES = COACHES;

/** Match a class's coach_name (from Playtomic via Kumi) to a roster entry. */
export function coachMatchesName(coach: CoachProfile, coachName: string | null): boolean {
  if (!coachName) return false;
  const n = coachName.trim().toLowerCase();
  return coach.aliases.some((a) => n === a || n.startsWith(a + " ") || a.startsWith(n + " "));
}
