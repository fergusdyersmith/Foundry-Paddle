/** Padel skill tree for the public /survey page — transcribed from the Kumi app
 *  (padelclublist: app/services/coaching/skill_tree.py), which remains the
 *  source of truth for the member-facing tree on app.foundrypadel.com. Keep the
 *  categories, rubric wording, and scoring in sync with it when either changes.
 */

export interface SurveySkill {
  id: string;
  label: string;
}

export interface SurveyCategory {
  id: string;
  label: string;
  icon: string;
  /** 5-level ladder description, Beginner -> Advanced. */
  rubric: string[];
  skills: SurveySkill[];
}

/** The 5 rubric levels, low -> high. A 0-4 comfort score indexes into this. */
export const RUBRIC_LEVELS = [
  "Beginner",
  "Low Intermediate",
  "Intermediate",
  "High Intermediate",
  "Advanced",
];

/** The comfort labels a player picks from (0-4), parallel to RUBRIC_LEVELS. */
export const COMFORT_LABELS = [
  "Haven't tried",
  "Learning",
  "Getting there",
  "Comfortable",
  "Strong",
];

export const SKILL_TREE: SurveyCategory[] = [
  {
    id: "serve_rally",
    label: "Serve & Rally",
    icon: "🎾",
    rubric: [
      "Learning the serve, can't sustain rallies yet.",
      "Serves reliably and rallies consistently.",
      "Controls rallies and varies pace.",
      "Dictates rallies and places the serve.",
      "Weaponizes serve and controls rally tempo.",
    ],
    skills: [
      { id: "serve", label: "Serve" },
      { id: "return", label: "Return of serve" },
      { id: "forehand_drive", label: "Forehand drive" },
      { id: "backhand_drive", label: "Backhand drive" },
    ],
  },
  {
    id: "back_glass",
    label: "Back Glass",
    icon: "🧱",
    rubric: [
      "Doesn't play balls off the back wall.",
      "Starting to, but inconsistent.",
      "Comfortable off the back glass.",
      "Handles deep, awkward back-wall balls.",
      "Defends any back-wall ball with control.",
    ],
    skills: [{ id: "back_glass", label: "Back glass (defense)" }],
  },
  {
    id: "side_double_wall",
    label: "Side & Double Wall",
    icon: "📐",
    rubric: [
      "Avoids the corners.",
      "Attempts corner balls, often mistimed.",
      "Plays side-wall balls reliably.",
      "Handles double-wall / corner shots.",
      "Defends any corner cleanly.",
    ],
    skills: [
      { id: "side_wall", label: "Side wall" },
      { id: "double_glass", label: "Double glass (corner)" },
    ],
  },
  {
    id: "volleys",
    label: "Volleys (Net)",
    icon: "🏐",
    rubric: [
      "Inconsistent contact at the net.",
      "Blocks the ball back with control.",
      "Reliable volleys on both sides.",
      "Volleys with placement and control.",
      "Volleys aggressively and finishes points.",
    ],
    skills: [
      { id: "forehand_volley", label: "Forehand volley" },
      { id: "backhand_volley", label: "Backhand volley" },
      { id: "chiquita", label: "Chiquita" },
      { id: "dejada", label: "Drop shot (dejada)" },
    ],
  },
  {
    id: "bandeja",
    label: "Bandeja",
    icon: "🪃",
    rubric: [
      "Not yet.",
      "Just starting to develop it.",
      "A developing, workable bandeja.",
      "A solid, controlled bandeja.",
      "Uses the bandeja as a tactical weapon.",
    ],
    skills: [{ id: "bandeja", label: "Bandeja" }],
  },
  {
    id: "vibora_smash",
    label: "Víbora & Smash",
    icon: "⚡",
    rubric: [
      "Not yet.",
      "Not yet — occasional attempts.",
      "Occasional, not yet controlled.",
      "Emerging víbora, controlled smash.",
      "Full repertoire: víbora, por tres, controlled smash.",
    ],
    skills: [
      { id: "vibora", label: "Víbora" },
      { id: "gancho", label: "Gancho (hook smash)" },
      { id: "rulo", label: "Rulo (topspin smash)" },
      { id: "smash", label: "Smash / remate" },
      { id: "bajada", label: "Bajada (off the wall)" },
    ],
  },
  {
    id: "lobs_defense",
    label: "Lobs & Defense",
    icon: "🛡️",
    rubric: [
      "Reactive, no defensive plan.",
      "Basic lobs to reset the point.",
      "Understands defensive positioning.",
      "Counter-attacks smartly under pace.",
      "Elite defense and shot selection.",
    ],
    skills: [{ id: "lob", label: "Lob (globo)" }],
  },
  {
    id: "positioning_tactics",
    label: "Positioning & Tactics",
    icon: "🧭",
    rubric: [
      "Learning where to stand.",
      "Knows basic positioning.",
      "Understands up/back pair movement.",
      "Strong pair tactics, holds up under pace.",
      "Reads the game and controls tempo.",
    ],
    skills: [
      { id: "ready_position", label: "Ready position" },
      { id: "footwork", label: "Footwork & split-step" },
      { id: "court_position", label: "Court positioning" },
      { id: "transition", label: "Net transition" },
    ],
  },
];

export const ALL_SKILL_IDS = SKILL_TREE.flatMap((c) => c.skills.map((s) => s.id));

/** Rate at least this many shots before the level estimate means anything
 *  (mirrors the Kumi backend's minimum). */
export const MIN_RATED = 8;

/** Comfort map: skill_id -> 0-4. */
export type ComfortMap = Record<string, number>;

export interface SurveyResult {
  ratedCount: number;
  /** Tree completion 0-100, unrated shots counting as 0 (matches the app). */
  masteryPct: number;
  /** Rubric level index (0-4) from the all-shots average. */
  overallLevelIdx: number;
  /** Kumi rating on the club's scale, from rated shots only. Null until MIN_RATED. */
  kumiRating: number | null;
  /** 🌱 Beginner / ⭐ Intermediate / 🏆 Advanced badge for the rating. */
  kumiBadge: string | null;
  /** Rough Playtomic-scale estimate (1.0-5.0). Null until MIN_RATED. */
  playtomicEstimate: string | null;
}

/** Kumi Level badge thresholds, same as the app's profile header. */
function badgeFor(rating: number): string {
  if (rating < 2.5) return "🌱 Beginner";
  if (rating < 3.5) return "⭐ Intermediate";
  return "🏆 Advanced";
}

/** Score the survey the way Kumi does: the level estimate averages only the
 *  shots you actually rated (so a half-finished survey isn't dragged to zero),
 *  while mastery % counts the whole tree. Rating band 1.0-4.25 mirrors the
 *  backend's beginner..advanced range; Playtomic estimate is the app's rough
 *  0-4 -> 1-5 mapping. */
export function scoreSurvey(comfort: ComfortMap): SurveyResult {
  const rated = ALL_SKILL_IDS.map((id) => comfort[id]).filter(
    (c): c is number => typeof c === "number" && c >= 0 && c <= 4,
  );
  const allAvg =
    ALL_SKILL_IDS.reduce((s, id) => s + (comfort[id] ?? 0), 0) / ALL_SKILL_IDS.length;

  const result: SurveyResult = {
    ratedCount: rated.length,
    masteryPct: Math.round((allAvg / 4) * 100),
    overallLevelIdx: Math.round(allAvg),
    kumiRating: null,
    kumiBadge: null,
    playtomicEstimate: null,
  };

  if (rated.length >= MIN_RATED) {
    const avg = rated.reduce((s, c) => s + c, 0) / rated.length;
    const rating = Math.round((1.0 + (avg / 4) * (4.25 - 1.0)) * 100) / 100;
    result.kumiRating = rating;
    result.kumiBadge = badgeFor(rating);
    result.playtomicEstimate = (1 + avg).toFixed(1);
  }

  return result;
}
