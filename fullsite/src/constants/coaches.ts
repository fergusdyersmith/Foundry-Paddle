/** Coaching roster for the /coaching page.
 *
 *  Profile data (bios, rates, availability, photos) is snapshotted from the
 *  Kumi admin panel's Coaches tab; entries flagged `mock: true` are
 *  placeholder copy/photos awaiting real content. Upcoming class assignments
 *  come live from /api/coaching/classes (Kumi-ingested Playtomic data) and are
 *  matched to coaches via `aliases` (class data uses inconsistent name forms,
 *  e.g. "Kelly" vs "Kelly Correia").
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
  /** Placeholder bio/photo pending real content from the coach. */
  mock?: boolean;
}

export const COACHES: CoachProfile[] = [
  {
    id: "eugene",
    name: "Eugene Jung",
    firstName: "Eugene",
    photo: "https://padelmaps.org/static/coaches/eugene.jpg",
    aliases: ["eugene jung", "eugene"],
    bio: "Eugene is a competitive tennis player with a USTA 4.5 rating and has competed at the national level. A lifelong racquet sports enthusiast, he also founded Pips & Bounce, Portland's premier ping pong social club, combining his passion for sport with building community.",
    specialties:
      "Helping beginner and intermediate players build confidence: proper fundamentals, sound technique, and smart court habits for long-term development.",
    languages: "English",
    levelRange: "Beginner & intermediate",
    privateLessons: {
      // The only coach with no Playtomic pricing rules, so this is the one rate
      // still derived from free text ($60 + $40 court) rather than read from
      // pt_lesson. Confirm with Eugene, or set his pricing up in Playtomic and it
      // becomes self-maintaining like the others.
      playtomicBookable: false,
      rate: "$100/hour, court included",
      availability: "Mon (AM), Wed (before 5 PM), Thu and Fri (AM)",
    },
  },
  {
    id: "kelly",
    name: "Kelly Correia",
    firstName: "Kelly",
    photo:
      "https://res.cloudinary.com/playtomic/image/upload/c_limit,w_1280/v1/pro/users/6206748/1730570365323",
    aliases: ["kelly correia", "kelly"],
    bio: "RPP certified coach focused on tactics, technique, and footwork. Every session follows the same structure: ball feed to practice the skill, a focused drill to reinforce it, then a game situation to put it all together.",
    specialties:
      "Tactics, technique, footwork. Intermediate+: back glass, side glass, double-wall, lobs, bandeja, bajadas. Beginners: volleys, lobs, core technique.",
    certifications: "RPP",
    languages: "English",
    levelRange: "Beginner & intermediate",
    privateLessons: {
      playtomicBookable: true,
      rate: "$90/hour, court included",
      availability: "Tue and Thu, 10–11 AM",
      detail:
        "2–4 people: $100/hr, court included. 90-min and 2-hr sessions available.",
    },
  },
  {
    id: "ryan",
    name: "Ryan Chin",
    firstName: "Ryan",
    photo:
      "https://res.cloudinary.com/playtomic/image/upload/c_limit,w_1280/v1/pro/users/11704693/1760272483481",
    aliases: ["ryan chin", "ryan"],
    bio: "Played national-level tennis and racquetball through college, and fell in love with padel while traveling in Europe. Excited to see the sport grow and push players to the next level.",
    specialties:
      "Shot technique, tennis transition to padel, offensive net play, advanced tactics and strategy",
    certifications: "RPP Certified Coach (Level 1 & 2)",
    languages: "English",
    levelRange: "All levels",
    privateLessons: {
      playtomicBookable: true,
      rate: "$90/hour, court included",
      availability: "Tue, Wed, Thu · 5–8 PM (peak)",
      detail:
        "1 person: $90/hr · 2 people: $110/hr · 3 people: $130/hr · 4 people: $145/hr. 90-min and 2-hr sessions available.",
    },
  },
  {
    id: "carlos",
    name: "Carlos Ramírez Mazuera",
    firstName: "Carlos",
    photo:
      "https://res.cloudinary.com/playtomic/image/upload/c_limit,w_1280/v1/pro/users/15111349/1779924254191",
    aliases: ["carlos ramírez mazuera", "carlos ramirez mazuera", "carlos"],
    bio: "Bilingual RPP Level 1 & 2 padel coach, fitness and conditioning coach, and former competitive tennis player. Helping players build confidence, technique, movement, and enjoy the game from day one.",
    specialties:
      "Player development at every level, racquet-sports-to-padel transition, stroke development, match strategy and court positioning, fitness and conditioning for padel",
    certifications: "RPP Padel Coach (Levels 1 & 2), ISSA Personal Trainer",
    languages: "English, Spanish",
    levelRange: "All levels",
    privateLessons: {
      playtomicBookable: true,
      rate: "$85/hour, court included",
      availability: "Tue, Wed, Thu · 6:30–8:30 AM and 4:30–6:30 PM",
      detail:
        "2 people: $105/hr · 3 people: $125/hr · 4 people: $140/hr, court included. 90-min and 2-hr sessions available. Packages available.",
    },
  },
  {
    id: "juan",
    name: "Juan Gomez Humphrey",
    firstName: "Juan",
    photo:
      "https://res.cloudinary.com/playtomic/image/upload/c_limit,w_1280/v1/pro/users/14687214/1776654174130",
    aliases: ["juan gomez humphrey", "juan"],
    bio: "Passionate lifelong padel and tennis player. Coached tennis for 5 years and now RPP-certified coaching padel too. Started playing padel as a teenager in Mexico in the 90s and fell in love with the sport — now eager to pass on his experience and love of the game.",
    specialties:
      "All levels; strategy and on-court tactics; extra experience with young and junior players (also coaches tennis at Cleveland High School)",
    certifications: "RPP Level 2 Padel Certified",
    languages: "English, Spanish",
    levelRange: "All levels",
    privateLessons: {
      // The only coach with two price bands, so the headline is "from". $95 off-peak,
      // $115 at peak: both are real Playtomic pricing rules, not a negotiation.
      playtomicBookable: true,
      rate: "From $95/hour, court included",
      availability: "Mon–Wed · 9 AM–3 PM; Thu · 9 AM–12 PM; Fri · 9 AM–12 PM",
      detail:
        "$95/hr off-peak, $115/hr peak (weekdays 3–5 PM and Friday mornings). 2–3 people $95/hr off-peak, 4 people $100/hr. 90-min and 2-hr sessions available.",
    },
  },
  {
    id: "jack",
    name: "Jack Wang",
    firstName: "Jack",
    photo:
      "https://res.cloudinary.com/playtomic/image/upload/c_limit,w_1280/v1/pro/users/3448382/1782527321574",
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
  },
  {
    id: "axel",
    name: "Axel Garay",
    firstName: "Axel",
    photo:
      "https://res.cloudinary.com/playtomic/image/upload/c_limit,w_1280/v1/pro/users/14509083/1775683355620",
    aliases: ["axel garay", "axel"],
    bio: "Axel rounds out the Foundry coaching team, working with players across levels on fundamentals and consistent, repeatable technique.",
    specialties: "Fundamentals, consistency",
    levelRange: "All levels",
    mock: true,
  },
];

export const TEAM_COACHES = COACHES;

/** Match a class's coach_name (from Playtomic via Kumi) to a roster entry. */
export function coachMatchesName(coach: CoachProfile, coachName: string | null): boolean {
  if (!coachName) return false;
  const n = coachName.trim().toLowerCase();
  return coach.aliases.some((a) => n === a || n.startsWith(a + " ") || a.startsWith(n + " "));
}
