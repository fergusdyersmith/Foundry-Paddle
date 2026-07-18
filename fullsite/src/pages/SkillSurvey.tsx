import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, ChevronDown, ChevronUp, RotateCcw } from "lucide-react";
import {
  COMFORT_LABELS,
  type ComfortMap,
  MIN_RATED,
  RUBRIC_LEVELS,
  SKILL_TREE,
  scoreSurvey,
} from "@/constants/skillTree";
import { APP_URL } from "@/constants/app";
import Seo from "@/components/Seo";

/** Same self-assessment tree as the member profile in the Foundry app, minus
 *  the account: ratings live in this browser only (localStorage). Members are
 *  pointed at the app to save it for real. */

const STORAGE_KEY = "foundry-skill-survey";

function loadComfort(): ComfortMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

const SkillSurvey = () => {
  const [comfort, setComfort] = useState<ComfortMap>(loadComfort);
  const [open, setOpen] = useState<string | null>(SKILL_TREE[0].id);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(comfort));
    } catch {
      /* private mode etc. — ratings just won't persist */
    }
  }, [comfort]);

  const result = useMemo(() => scoreSurvey(comfort), [comfort]);

  const rate = (skillId: string, value: number) =>
    setComfort((c) => ({ ...c, [skillId]: value }));

  const reset = () => setComfort({});

  const catAvg = (ids: string[]) =>
    ids.length ? ids.reduce((s, id) => s + (comfort[id] ?? 0), 0) / ids.length : 0;

  const focusSkills = useMemo(() => {
    if (result.ratedCount < MIN_RATED) return [];
    return SKILL_TREE.flatMap((c) =>
      c.skills.map((s) => ({ ...s, c: comfort[s.id] ?? 0 })),
    )
      .filter((s) => s.c <= 1)
      .sort((a, b) => a.c - b.c)
      .slice(0, 4);
  }, [comfort, result.ratedCount]);

  return (
    <main className="bg-background min-h-screen pt-24">
      <Seo
        title="Padel Skill Survey: What's Your Level? | Foundry Padel"
        description="Rate your comfort with every padel shot and get your Kumi Level plus an estimated Playtomic level. The same skill tree our coaches use, open to everyone."
        path="/survey"
      />

      {/* Header */}
      <section className="px-6 pt-20 pb-10">
        <div className="mx-auto max-w-3xl text-center">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
            <h1 className="font-display text-6xl sm:text-8xl text-foreground mb-4">SKILL SURVEY</h1>
            <div className="mb-6 flex items-center justify-center gap-4">
              <div className="h-px w-16 bg-primary" />
              <span className="font-body text-sm tracking-[0.2em] uppercase text-primary">Find Your Level</span>
              <div className="h-px w-16 bg-primary" />
            </div>
            <p className="font-body text-base text-secondary-foreground">
              Rate how comfortable you are with each padel shot. Rate at least {MIN_RATED} and
              we'll show your Kumi Level and an estimated Playtomic level. It's the same skill
              tree our coaches use, and your answers stay in this browser.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Live results bar */}
      <div className="sticky top-16 z-20 border-y border-border bg-background/95 px-6 py-3 backdrop-blur-sm">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-x-6 gap-y-2">
          <div className="flex items-center gap-4">
            <span className="font-display text-2xl text-primary">{result.masteryPct}%</span>
            <div className="font-body text-xs text-muted-foreground">
              <p className="uppercase tracking-[0.15em]">Tree mastery</p>
              <p className="text-foreground">{RUBRIC_LEVELS[result.overallLevelIdx]}</p>
            </div>
          </div>
          <div className="text-right font-body text-sm">
            {result.kumiBadge ? (
              <>
                <p className="font-semibold text-foreground">{result.kumiBadge}</p>
                <p className="text-xs text-muted-foreground">≈ Playtomic {result.playtomicEstimate}</p>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">
                Rate {MIN_RATED - result.ratedCount} more{" "}
                {MIN_RATED - result.ratedCount === 1 ? "shot" : "shots"} to reveal your level
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Skill tree */}
      <section className="px-6 py-12">
        <div className="mx-auto flex max-w-3xl flex-col gap-4">
          {SKILL_TREE.map((cat) => {
            const ids = cat.skills.map((s) => s.id);
            const avg = catAvg(ids);
            const pct = Math.round((avg / 4) * 100);
            const lvlIdx = Math.round(avg);
            const isOpen = open === cat.id;
            return (
              <div key={cat.id} className="border border-border">
                <button
                  onClick={() => setOpen(isOpen ? null : cat.id)}
                  className="flex w-full items-center gap-3 p-4 text-left"
                >
                  <span className="text-xl">{cat.icon}</span>
                  <span className="flex-1 font-display text-lg tracking-wide text-foreground">
                    {cat.label}
                  </span>
                  <span className="font-body text-xs text-muted-foreground">
                    {RUBRIC_LEVELS[lvlIdx]}
                  </span>
                  {isOpen ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
                <div className="mx-4 mb-4 h-1 overflow-hidden bg-muted">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${pct}%` }}
                  />
                </div>

                {isOpen && (
                  <div className="border-t border-border p-4">
                    {/* Rubric ladder — the club's Skill Levels reference */}
                    <div className="mb-5 border border-border bg-muted/30 p-4">
                      {cat.rubric.map((r, i) => (
                        <p
                          key={i}
                          className={`py-0.5 font-body text-xs ${
                            i === lvlIdx
                              ? "font-semibold text-foreground"
                              : "text-muted-foreground/60"
                          }`}
                        >
                          <span className={i === lvlIdx ? "text-primary" : ""}>
                            {RUBRIC_LEVELS[i]}:
                          </span>{" "}
                          {r}
                        </p>
                      ))}
                    </div>

                    {cat.skills.map((sk) => {
                      const c = comfort[sk.id];
                      return (
                        <div key={sk.id} className="py-2.5">
                          <div className="mb-2 flex items-baseline justify-between gap-4">
                            <span className="font-body text-sm text-foreground">{sk.label}</span>
                            <span className="font-body text-xs text-muted-foreground">
                              {c != null ? COMFORT_LABELS[c] : "Tap to rate"}
                            </span>
                          </div>
                          <div className="flex gap-1.5">
                            {[0, 1, 2, 3, 4].map((i) => (
                              <button
                                key={i}
                                onClick={() => rate(sk.id, i)}
                                title={COMFORT_LABELS[i]}
                                aria-label={`${sk.label}: ${COMFORT_LABELS[i]}`}
                                className={`h-6 flex-1 border transition-colors ${
                                  c != null && i <= c
                                    ? "border-primary bg-primary"
                                    : "border-border bg-transparent hover:border-primary/60"
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          <button
            onClick={reset}
            className="mt-2 inline-flex items-center gap-2 self-start font-display text-xs tracking-[0.2em] text-muted-foreground transition-colors hover:text-primary"
          >
            <RotateCcw className="h-3.5 w-3.5" /> START OVER
          </button>
        </div>
      </section>

      {/* Results + next steps */}
      <section className="px-6 pb-24">
        <div className="mx-auto max-w-3xl">
          <div className="section-divider mb-12" />
          {result.kumiBadge ? (
            <div className="border border-border p-8 text-center sm:p-12">
              <p className="mb-2 font-body text-xs uppercase tracking-[0.2em] text-primary">
                Your result
              </p>
              <p className="font-display text-4xl text-foreground sm:text-5xl">{result.kumiBadge}</p>
              <p className="mt-2 font-body text-sm text-muted-foreground">
                Kumi Level {result.kumiRating} · estimated Playtomic {result.playtomicEstimate} ·{" "}
                {result.masteryPct}% of the tree mastered
              </p>
              <p className="mx-auto mt-4 max-w-md font-body text-xs text-muted-foreground">
                This is a self-report estimate. Play matches and train with our coaches and your
                real level sharpens from actual results.
              </p>

              {focusSkills.length > 0 && (
                <div className="mx-auto mt-8 max-w-md border border-border bg-muted/30 p-5">
                  <p className="mb-3 font-body text-xs uppercase tracking-[0.2em] text-foreground">
                    🎯 Work on these next
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {focusSkills.map((f) => (
                      <span
                        key={f.id}
                        className="border border-border px-3 py-1 font-body text-xs text-secondary-foreground"
                      >
                        {f.label}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Link
                  to="/book"
                  className="bg-primary px-8 py-3 font-display text-sm tracking-widest text-primary-foreground transition-all hover:brightness-110"
                >
                  BOOK A CLINIC OR MATCH
                </Link>
                <a
                  href={APP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 font-display text-xs tracking-[0.2em] text-muted-foreground transition-colors hover:text-primary"
                >
                  MEMBERS: SAVE IT IN THE FOUNDRY APP <ArrowRight className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
          ) : (
            <p className="text-center font-body text-sm text-muted-foreground">
              Rate at least {MIN_RATED} shots above and your result appears here.
            </p>
          )}
          <div className="section-divider mt-12" />
        </div>
      </section>
    </main>
  );
};

export default SkillSurvey;
