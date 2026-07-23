import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Award, Calendar, ExternalLink, Globe, Loader2, Mail, Target } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  COACHES,
  type CoachProfile,
  coachMatchesName,
  HEAD_COACH,
  TEAM_COACHES,
} from "@/constants/coaches";
import { PLAYTOMIC_TENANT_URL } from "@/constants/booking";
import Seo from "@/components/Seo";

/** A coach-led class from Kumi's public discovery endpoint (Playtomic data,
 *  proxied through our server). */
interface CoachClass {
  academy_class_id: string;
  name: string;
  coach_name: string | null;
  start_local: string;
  tentative: boolean;
  spots_left: number | null;
  price: string;
  join_url: string;
}

function useCoachClasses() {
  return useQuery<{ classes: CoachClass[] }>({
    queryKey: ["coaching-classes"],
    queryFn: async () => {
      const res = await fetch("/api/coaching/classes");
      if (!res.ok) throw new Error("Failed to load classes");
      return res.json();
    },
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
}

/** If a coach's (Playtomic-hosted) photo 404s, fall back to the placeholder
 *  instead of a broken image — Playtomic sometimes serves dead photo URLs. */
const onPhotoError = (e: React.SyntheticEvent<HTMLImageElement>) => {
  if (!e.currentTarget.src.endsWith("/coaches/placeholder.svg")) {
    e.currentTarget.src = "/coaches/placeholder.svg";
  }
};

/** Fisher-Yates. The team grid order is shuffled per page load so no coach is
 *  permanently "last" — see the rotation policy note on the page. */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const MetaRow = ({ icon: Icon, label, value }: { icon: typeof Award; label: string; value?: string }) =>
  value ? (
    <div className="flex gap-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
      <div>
        <p className="font-body text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
        <p className="font-body text-sm text-secondary-foreground">{value}</p>
      </div>
    </div>
  ) : null;

const Coaching = () => {
  // Stable order for SSR/hydration; shuffled once on mount.
  const [team, setTeam] = useState<CoachProfile[]>(TEAM_COACHES);
  const [selected, setSelected] = useState<CoachProfile | null>(null);
  const { data, isLoading, isError } = useCoachClasses();

  useEffect(() => {
    setTeam(shuffle(TEAM_COACHES));
  }, []);

  const selectedClasses = useMemo(() => {
    if (!selected || !data?.classes) return [];
    return data.classes.filter((c) => coachMatchesName(selected, c.coach_name));
  }, [selected, data]);

  return (
    <main className="bg-background min-h-screen pt-24">
      <Seo
        title="Padel Coaching in Portland: Meet the Foundry Coaches | Foundry Padel"
        description="Meet Foundry Padel's coaching team: RPP-certified coaches, beginner clinics, group lessons, and private sessions. See each coach's upcoming sessions and book on Playtomic."
        path="/coaching"
      />

      {/* Header */}
      <section className="px-6 pt-20 pb-12">
        <div className="mx-auto max-w-4xl text-center">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
            <h1 className="font-display text-6xl sm:text-8xl text-foreground mb-4">COACHING</h1>
            <div className="mb-6 flex items-center justify-center gap-4">
              <div className="h-px w-16 bg-primary" />
              <span className="font-body text-sm tracking-[0.2em] uppercase text-primary">
                Clinics · Group Lessons · Privates
              </span>
              <div className="h-px w-16 bg-primary" />
            </div>
            <p className="font-body text-base text-secondary-foreground">
              RPP-certified coaches for every level, from your first rally to tournament play.
              Tap a coach to see their upcoming sessions and how to book.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Head coach */}
      <section className="px-6 py-8">
        <div className="mx-auto max-w-4xl">
          <motion.button
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            onClick={() => setSelected(HEAD_COACH)}
            className="group grid w-full border border-border bg-card text-left transition-colors hover:border-primary sm:grid-cols-[240px_1fr]"
          >
            <img
              src={HEAD_COACH.photo}
              alt={HEAD_COACH.name}
              onError={onPhotoError}
              className="h-64 w-full object-cover sm:h-full"
            />
            <div className="p-8">
              <p className="mb-1 font-body text-xs uppercase tracking-[0.25em] text-primary">Head Coach</p>
              <h2 className="font-display text-3xl text-foreground sm:text-4xl">{HEAD_COACH.name}</h2>
              <p className="mt-3 font-body text-sm leading-relaxed text-secondary-foreground">
                {HEAD_COACH.bio}
                {HEAD_COACH.mock && (
                  <span className="ml-2 font-body text-[10px] uppercase tracking-wider text-muted-foreground">
                    (placeholder bio)
                  </span>
                )}
              </p>
              <span className="mt-5 inline-flex items-center gap-2 font-display text-xs tracking-[0.2em] text-primary opacity-80 transition-opacity group-hover:opacity-100">
                SEE {HEAD_COACH.firstName.toUpperCase()}'S SESSIONS <Calendar className="h-3.5 w-3.5" />
              </span>
            </div>
          </motion.button>
        </div>
      </section>

      {/* Team grid — order rotates every page load */}
      <section className="px-6 py-12 pb-24">
        <div className="mx-auto max-w-4xl">
          <div className="section-divider mb-12" />
          <h2 className="mb-10 text-center font-display text-3xl text-foreground sm:text-4xl">
            THE COACHING TEAM
          </h2>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 lg:gap-6">
            {team.map((coach) => (
              <button
                key={coach.id}
                onClick={() => setSelected(coach)}
                className="group border border-border bg-card text-left transition-colors hover:border-primary"
              >
                <img
                  src={coach.photo}
                  alt={coach.name}
                  onError={onPhotoError}
                  loading="lazy"
                  className="aspect-square w-full object-cover"
                />
                <div className="p-4">
                  <h3 className="font-display text-lg leading-tight tracking-wide text-foreground">
                    {coach.name}
                  </h3>
                  <p className="mt-1 line-clamp-2 font-body text-xs text-muted-foreground">
                    {coach.specialties}
                  </p>
                  {coach.levelRange && (
                    <p className="mt-2 font-body text-[10px] uppercase tracking-[0.15em] text-primary">
                      {coach.levelRange}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Coach detail */}
      <Sheet open={selected !== null} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle className="font-display text-2xl tracking-widest">
                  {selected.name}
                </SheetTitle>
              </SheetHeader>
              <div className="mt-4 flex flex-col gap-6">
                <img
                  src={selected.photo}
                  alt={selected.name}
                  onError={onPhotoError}
                  className="aspect-square w-full max-w-[240px] object-cover"
                />
                {selected.headCoach && (
                  <p className="-mt-3 font-body text-xs uppercase tracking-[0.25em] text-primary">
                    Head Coach
                  </p>
                )}
                <p className="font-body text-sm leading-relaxed text-secondary-foreground">
                  {selected.bio}
                  {selected.mock && (
                    <span className="ml-2 font-body text-[10px] uppercase tracking-wider text-muted-foreground">
                      (placeholder bio)
                    </span>
                  )}
                </p>

                <div className="flex flex-col gap-3">
                  <MetaRow icon={Target} label="Specialties" value={selected.specialties} />
                  <MetaRow icon={Award} label="Certifications" value={selected.certifications} />
                  <MetaRow icon={Globe} label="Languages" value={selected.languages} />
                </div>

                {/* Upcoming sessions (live from Playtomic via Kumi) */}
                <div>
                  <h4 className="mb-3 font-display text-lg tracking-wide text-foreground">
                    UPCOMING SESSIONS
                  </h4>
                  {isLoading ? (
                    <div className="flex justify-center py-6">
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    </div>
                  ) : isError ? (
                    <p className="font-body text-sm text-muted-foreground">
                      Couldn't load sessions. Check the Playtomic app.
                    </p>
                  ) : selectedClasses.length === 0 ? (
                    <p className="font-body text-sm text-muted-foreground">
                      No group sessions on the calendar in the next two weeks.
                    </p>
                  ) : (
                    <div className="flex flex-col gap-2.5">
                      {selectedClasses.map((c) => (
                        <a
                          key={c.academy_class_id + c.start_local}
                          href={c.join_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group flex items-center gap-3 border border-border bg-card px-3 py-2.5 transition-colors hover:border-primary"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-body text-sm font-medium text-foreground">
                              {c.name}
                            </p>
                            <p className="font-body text-xs text-muted-foreground">
                              {c.start_local} · {c.price}
                              {c.spots_left != null && ` · ${c.spots_left} spots left`}
                              {c.tentative && " · subject to change"}
                            </p>
                          </div>
                          <span className="inline-flex shrink-0 items-center gap-1.5 font-display text-xs tracking-widest text-primary">
                            BOOK <ExternalLink className="h-3 w-3" />
                          </span>
                        </a>
                      ))}
                    </div>
                  )}
                </div>

                {/* Private lessons */}
                <div className="border border-border bg-muted/30 p-4">
                  <h4 className="mb-2 font-display text-lg tracking-wide text-foreground">
                    PRIVATE LESSONS
                  </h4>
                  {selected.privateLessons ? (
                    <>
                      <p className="font-body text-sm text-secondary-foreground">
                        {selected.privateLessons.rate}
                      </p>
                      {selected.privateLessons.availability && (
                        <p className="mt-1 font-body text-xs text-muted-foreground">
                          {selected.privateLessons.availability}
                        </p>
                      )}
                      {selected.privateLessons.detail && (
                        <p className="mt-1 font-body text-xs text-muted-foreground">
                          {selected.privateLessons.detail}
                        </p>
                      )}
                      {selected.privateLessons.playtomicBookable ? (
                        <a
                          href={PLAYTOMIC_TENANT_URL}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-4 inline-flex items-center gap-2 border border-primary px-4 py-2 font-display text-xs tracking-widest text-primary transition-all hover:bg-primary hover:text-primary-foreground"
                        >
                          BOOK IN PLAYTOMIC <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <a
                          href={`mailto:portland@foundrypadel.com?subject=Private lesson with ${encodeURIComponent(selected.name)}`}
                          className="mt-4 inline-flex items-center gap-2 border border-primary px-4 py-2 font-display text-xs tracking-widest text-primary transition-all hover:bg-primary hover:text-primary-foreground"
                        >
                          EMAIL TO ARRANGE <Mail className="h-3 w-3" />
                        </a>
                      )}
                    </>
                  ) : (
                    <>
                      <p className="font-body text-sm text-muted-foreground">
                        Private availability coming soon.
                      </p>
                      <a
                        href={`mailto:portland@foundrypadel.com?subject=Private lesson with ${encodeURIComponent(selected.name)}`}
                        className="mt-4 inline-flex items-center gap-2 border border-primary px-4 py-2 font-display text-xs tracking-widest text-primary transition-all hover:bg-primary hover:text-primary-foreground"
                      >
                        EMAIL TO ARRANGE <Mail className="h-3 w-3" />
                      </a>
                    </>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </main>
  );
};

export default Coaching;
