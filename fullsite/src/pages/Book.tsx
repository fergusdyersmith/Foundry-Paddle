import type { CSSProperties } from "react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { addDays, parseISO } from "date-fns";
import {
  ArrowRight,
  Calendar,
  ChevronDown,
  ChevronUp,
  GraduationCap,
  Zap,
} from "lucide-react";
import {
  PLAYTOMIC_APP_STORE_URL,
  PLAYTOMIC_BOOKING_URL,
  PLAYTOMIC_PLAY_STORE_URL,
} from "@/constants/booking";
import { OPEN_MATCH_CAPACITY } from "@/constants/events";
import { formatUsd, ratesOn } from "@shared/rates";
import { openFirst } from "@/lib/events";
import { clubNow, clubToday } from "@/lib/clubTime";
import { useScheduleEvents } from "@/hooks/useScheduleEvents";
import BookEventRow from "@/components/book/BookEventRow";
import Seo from "@/components/Seo";
import PageHeader from "@/components/PageHeader";
import Reveal from "@/components/motion/Reveal";
import BallLoader from "@/components/motion/BallLoader";
import { HOURS_META } from "@/constants/hours";

const CLINIC_TYPES = new Set(["PUBLIC_CLASS", "COURSE_CLASS"]);
// Clinics someone can still join, then a couple that are already full. Kept as two
// numbers, not one: a single cap over the combined list would drop the full ones
// entirely on any week with four open clinics, and they are worth seeing.
const CLINIC_LIMIT = 4;
const FULL_CLINIC_LIMIT = 2;
// Open matches shown before the "view more" expander.
const MATCHES_VISIBLE = 3;

// `enter` staggers the three cards in on first paint (they are above the fold on
// desktop, so data-enter rather than Reveal).
const WAYS_TO_PLAY = [
  {
    id: "reserve",
    icon: Calendar,
    title: "RESERVE A COURT",
    desc: "Got your group of four? Book a 90-minute court.",
    enter: "0.2s",
  },
  {
    id: "clinics",
    icon: GraduationCap,
    title: "LEARN THE BASICS",
    desc: "New to padel? Join a coach-led clinic.",
    enter: "0.28s",
  },
  {
    id: "matches",
    icon: Zap,
    title: "OPEN MATCHES",
    desc: "Need players? Hop into a match at your level.",
    enter: "0.36s",
  },
];

const scrollToSection = (id: string) =>
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

const SectionHeading = ({ title, sub }: { title: string; sub: string }) => (
  <div className="mb-6">
    <h2 className="font-display text-3xl sm:text-4xl text-foreground mb-2">{title}</h2>
    <p className="font-body text-sm text-muted-foreground">{sub}</p>
  </div>
);

const ListStatus = ({ children }: { children: React.ReactNode }) => (
  <div className="flex items-center justify-center border border-dashed border-border px-4 py-10 text-center font-body text-sm text-muted-foreground">
    {children}
  </div>
);

const Book = () => {
  const [showAllMatches, setShowAllMatches] = useState(false);

  // Read on every render, in Portland's terms, rather than once when the module loaded:
  // a module-level date froze at whatever day the tab was opened (or the build ran).
  const todayKey = clubToday();
  // Today's published rates. Dated in shared/rates.js, which the schedule prices open
  // matches from too, so the drop-in line below cannot say one number while a match on the
  // same page says another — and it steps up on its own the day the club's rates do.
  const rates = ratesOn(todayKey);
  // Playtomic only returns ~30 days out, so fetch that whole window once and
  // slice it into the clinic and open-match lists below.
  const [today, rangeEnd] = useMemo(() => {
    const start = parseISO(todayKey);
    return [start, addDays(start, 30)];
  }, [todayKey]);

  const {
    data: events = [],
    isLoading,
    isError,
  } = useScheduleEvents(today, rangeEnd);

  // Open clinics lead, so the ones a booking can still fill are what a visitor reads
  // first; the full ones follow rather than taking the top of a four-row list.
  const clinics = useMemo(
    () =>
      openFirst(
        events.filter((e) => CLINIC_TYPES.has(e.booking_type)),
        { openLimit: CLINIC_LIMIT, fullLimit: FULL_CLINIC_LIMIT },
      ),
    [events],
  );

  // Only matches someone can still join: not full (4 players) and not already
  // started. Recomputed on every refetch (60s), so full matches drop off live.
  // The API returns events sorted by date then start time.
  const upcomingMatches = useMemo(() => {
    const now = clubNow();
    return events.filter(
      (e) =>
        e.booking_type === "OPEN_MATCH" &&
        e.signed_up < OPEN_MATCH_CAPACITY &&
        (e.date > now.date || (e.date === now.date && e.start_time > now.time)),
    );
  }, [events]);

  const visibleMatches = upcomingMatches.slice(0, MATCHES_VISIBLE);
  const collapsedMatches = upcomingMatches.slice(MATCHES_VISIBLE);

  return (
    <main className="bg-background min-h-screen pt-24">
      {/* The rates are in the title and the description too, where they go stale just as
          quietly as in the copy — Google shows this text long after a price changes. */}
      <Seo
        title={`Book a Padel Court in Portland — ${formatUsd(rates.court90)} / 90 min | Foundry Padel`}
        description={`Book an indoor padel court at Foundry in Portland — ${formatUsd(rates.court90)} per court for 90 minutes (${formatUsd(rates.perPlayer90)} per player). Join a beginner clinic or an open match, racket rentals from $5. Open daily ${HOURS_META}.`}
        path="/book"
      />

      {/* Header + ways to play */}
      <section className="py-20 px-6">
        <div className="mx-auto max-w-4xl">
          <PageHeader title="BOOK A COURT" kicker="Three Ways to Play">
            <p className="font-body text-base text-secondary-foreground">
              Drop-in play is{" "}
              <span className="text-foreground font-semibold">
                {formatUsd(rates.perPlayer90)} per player
              </span>
              ,{" "}
              <span className="text-foreground font-semibold">
                {formatUsd(rates.court90)} per court
              </span>{" "}
              for 90 minutes.
              Racket rentals are <span className="text-foreground font-semibold">$5</span> ($10 for
              a high-end demo racket), and balls are for sale at the club. No partner needed.
            </p>
          </PageHeader>

          <div className="mt-12 grid gap-3 sm:grid-cols-3">
            {WAYS_TO_PLAY.map((w) => (
              <button
                key={w.id}
                type="button"
                onClick={() => scrollToSection(w.id)}
                data-enter
                style={{ "--enter-delay": w.enter } as CSSProperties}
                className="group border border-border p-6 text-left transition-colors hover:border-primary"
              >
                <w.icon size={22} className="text-primary mb-3" />
                {/* Not a heading: a heading inside a button is read as the button's whole
                    name, and each section below has its own h2 with this same title. */}
                <span className="mb-1 block font-display text-lg text-foreground">{w.title}</span>
                <p className="font-body text-xs text-muted-foreground">{w.desc}</p>
                <span className="mt-3 inline-flex items-center gap-1 font-display text-[10px] tracking-[0.2em] text-primary opacity-70 transition-opacity group-hover:opacity-100">
                  JUMP TO <ArrowRight className="nudge h-3 w-3" />
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 1 — Reserve a court */}
      <section id="reserve" className="scroll-mt-28 px-6 py-12">
        <div className="mx-auto max-w-4xl">
          <div className="section-divider mb-16" />
          {/* Only the heading moves: the Playtomic iframe is left out of the motion
              system (docs/motion.md, "Where not to animate"). */}
          <Reveal>
            <SectionHeading
              title="RESERVE A COURT"
              sub={`Have your four? Choose a time and court below. Open daily ${HOURS_META} · 90-minute sessions · 4 WPT-spec glass courts.`}
            />
          </Reveal>
          <div className="overflow-hidden border border-border bg-muted/30">
            <iframe
              src={PLAYTOMIC_BOOKING_URL}
              title="Book a court — Playtomic"
              className="block h-[min(45vh,450px)] w-full min-h-[320px]"
              loading="lazy"
              allow="payment *; fullscreen"
            />
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 font-body text-xs text-muted-foreground">
            <span className="uppercase tracking-[0.2em]">Or book in the Playtomic app</span>
            <div className="flex items-center gap-3">
              <a
                href={PLAYTOMIC_APP_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-9 items-center transition-opacity hover:opacity-90"
                aria-label="Download Playtomic on the App Store"
              >
                <img
                  src={`${import.meta.env.BASE_URL}store-badge-apple-store.svg`}
                  alt=""
                  className="h-9 w-auto object-contain"
                  width={120}
                  height={40}
                />
              </a>
              <a
                href={PLAYTOMIC_PLAY_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-9 items-center transition-opacity hover:opacity-90"
                aria-label="Get Playtomic on Google Play"
              >
                <img
                  src={`${import.meta.env.BASE_URL}store-badge-google-play.png`}
                  alt=""
                  className="h-9 w-auto object-contain"
                  width={155}
                  height={40}
                />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* 2 + 3 — Clinics and open matches */}
      <section className="px-6 py-12">
        <div className="mx-auto max-w-6xl">
          <div className="section-divider mb-16" />
          <div className="grid gap-16 lg:grid-cols-2 lg:gap-12">
            {/* Learn the basics */}
            <Reveal id="clinics" className="min-w-0 scroll-mt-28">
              <SectionHeading
                title="LEARN THE BASICS"
                sub="Never played? Book a coach-led clinic: small groups, all levels welcome, and you'll be rallying by the end of the first session."
              />
              {isLoading ? (
                <ListStatus>
                  <BallLoader label="Loading clinics" />
                </ListStatus>
              ) : isError ? (
                <ListStatus>
                  Couldn't load upcoming clinics.&nbsp;
                  <Link to="/schedule" className="text-primary hover:underline">
                    See the full schedule
                  </Link>
                </ListStatus>
              ) : clinics.length === 0 ? (
                <ListStatus>
                  New clinic dates drop soon.&nbsp;
                  <Link to="/schedule" className="text-primary hover:underline">
                    Check the full schedule
                  </Link>
                </ListStatus>
              ) : (
                <div className="flex flex-col gap-3">
                  {clinics.map((e) => (
                    <BookEventRow key={e.id} event={e} />
                  ))}
                </div>
              )}
              <Link
                to="/schedule"
                className="mt-5 inline-flex items-center gap-2 font-display text-xs tracking-[0.2em] text-muted-foreground transition-colors hover:text-primary"
              >
                VIEW FULL SCHEDULE <ArrowRight className="nudge h-3.5 w-3.5" />
              </Link>
            </Reveal>

            {/* Open matches */}
            <Reveal id="matches" delay={1} className="min-w-0 scroll-mt-28">
              <SectionHeading
                title="OPEN MATCHES"
                sub="Hop into a match without bringing a group. Join solo and Playtomic matches you with players at your level."
              />
              {isLoading ? (
                <ListStatus>
                  <BallLoader label="Loading open matches" />
                </ListStatus>
              ) : isError ? (
                <ListStatus>
                  Couldn't load open matches.&nbsp;
                  <Link to="/schedule" className="text-primary hover:underline">
                    See the full schedule
                  </Link>
                </ListStatus>
              ) : upcomingMatches.length === 0 ? (
                <ListStatus>
                  No open matches on the calendar right now. Start one in the Playtomic app
                  and other players can join you.
                </ListStatus>
              ) : (
                <>
                  <p className="mb-3 font-body text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Next up
                  </p>
                  <div className="flex flex-col gap-3">
                    {visibleMatches.map((e) => (
                      <BookEventRow key={e.id} event={e} />
                    ))}
                  </div>

                  {collapsedMatches.length > 0 && (
                    <div className="mt-5">
                      <button
                        type="button"
                        onClick={() => setShowAllMatches((s) => !s)}
                        aria-expanded={showAllMatches}
                        className="inline-flex items-center gap-2 font-display text-xs tracking-[0.2em] text-muted-foreground transition-colors hover:text-primary"
                      >
                        {showAllMatches ? "SHOW FEWER" : `VIEW MORE (${collapsedMatches.length})`}
                        {showAllMatches ? (
                          <ChevronUp className="h-3.5 w-3.5" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5" />
                        )}
                      </button>
                      {showAllMatches && (
                        <div className="mt-4 flex flex-col gap-3">
                          {collapsedMatches.map((e) => (
                            <BookEventRow key={e.id} event={e} />
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </Reveal>
          </div>

          {/* Nothing on the list worth joining? The answer is to post your own, and
              /find-players is the only place that says which times are worth posting. */}
          <p className="mt-16 text-center font-body text-sm text-muted-foreground">
            Nothing here that fits?{" "}
            <Link to="/find-players" className="text-primary underline underline-offset-2">
              Post your own open match
            </Link>{" "}
            and see which times actually fill, or have one texted to you when a match
            comes up at your level.
          </p>

          <div className="section-divider mt-16" />
        </div>
      </section>
    </main>
  );
};

export default Book;
