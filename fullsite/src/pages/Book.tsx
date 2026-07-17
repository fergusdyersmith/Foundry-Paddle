import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { addDays, format, startOfDay } from "date-fns";
import {
  ArrowRight,
  Calendar,
  ChevronDown,
  ChevronUp,
  GraduationCap,
  Loader2,
  Zap,
} from "lucide-react";
import {
  PLAYTOMIC_APP_STORE_URL,
  PLAYTOMIC_BOOKING_URL,
  PLAYTOMIC_PLAY_STORE_URL,
} from "@/constants/booking";
import { OPEN_MATCH_CAPACITY } from "@/constants/events";
import { useScheduleEvents } from "@/hooks/useScheduleEvents";
import BookEventRow from "@/components/book/BookEventRow";
import Seo from "@/components/Seo";

const today = startOfDay(new Date());
const todayKey = format(today, "yyyy-MM-dd");
// Playtomic only returns ~30 days out, so fetch that whole window once and
// slice it into the clinic and open-match lists below.
const rangeEnd = addDays(today, 30);

const CLINIC_TYPES = new Set(["PUBLIC_CLASS", "COURSE_CLASS"]);
const CLINIC_LIMIT = 4;
// Open matches shown before the "view more" expander.
const MATCHES_VISIBLE = 3;

const WAYS_TO_PLAY = [
  {
    id: "reserve",
    icon: Calendar,
    title: "RESERVE A COURT",
    desc: "Got your group of four? Book a 90-minute court.",
  },
  {
    id: "clinics",
    icon: GraduationCap,
    title: "LEARN THE BASICS",
    desc: "New to padel? Join a coach-led clinic.",
  },
  {
    id: "matches",
    icon: Zap,
    title: "OPEN MATCHES",
    desc: "Need players? Hop into a match at your level.",
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

  const {
    data: events = [],
    isLoading,
    isError,
  } = useScheduleEvents(today, rangeEnd);

  const clinics = useMemo(
    () => events.filter((e) => CLINIC_TYPES.has(e.booking_type)).slice(0, CLINIC_LIMIT),
    [events],
  );

  // Only matches someone can still join: not full (4 players) and not already
  // started. Recomputed on every refetch (60s), so full matches drop off live.
  // The API returns events sorted by date then start time.
  const upcomingMatches = useMemo(() => {
    const nowTime = format(new Date(), "HH:mm");
    return events.filter(
      (e) =>
        e.booking_type === "OPEN_MATCH" &&
        e.signed_up < OPEN_MATCH_CAPACITY &&
        (e.date > todayKey || (e.date === todayKey && e.start_time > nowTime)),
    );
  }, [events]);

  const visibleMatches = upcomingMatches.slice(0, MATCHES_VISIBLE);
  const collapsedMatches = upcomingMatches.slice(MATCHES_VISIBLE);

  return (
    <main className="bg-background min-h-screen pt-24">
      <Seo
        title="Book a Padel Court in Portland — $60 / 90 min | Foundry Padel"
        description="Book an indoor padel court at Foundry in Portland — $60 per court for 90 minutes ($15 per player). Join a beginner clinic or an open match, racket rentals from $5. Open daily 8am–10pm."
        path="/book"
      />

      {/* Header + ways to play */}
      <section className="py-20 px-6">
        <div className="mx-auto max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <h1 className="font-display text-6xl sm:text-8xl text-foreground mb-4">BOOK A COURT</h1>
            <div className="flex items-center justify-center gap-4 mb-6">
              <div className="h-px w-16 bg-primary" />
              <span className="font-body text-sm tracking-[0.2em] uppercase text-primary">Three Ways to Play</span>
              <div className="h-px w-16 bg-primary" />
            </div>
            <p className="font-body text-base text-secondary-foreground">
              Drop-in play is{" "}
              <span className="text-foreground font-semibold">$15 per player</span>,{" "}
              <span className="text-foreground font-semibold">$60 per court</span> for 90 minutes.
              Racket rentals are <span className="text-foreground font-semibold">$5</span> ($10 for
              a high-end demo racket), and balls are for sale at the club. No partner needed.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-12 grid gap-3 sm:grid-cols-3"
          >
            {WAYS_TO_PLAY.map((w) => (
              <button
                key={w.id}
                onClick={() => scrollToSection(w.id)}
                className="group border border-border p-6 text-left transition-colors hover:border-primary"
              >
                <w.icon size={22} className="text-primary mb-3" />
                <h2 className="font-display text-lg text-foreground mb-1">{w.title}</h2>
                <p className="font-body text-xs text-muted-foreground">{w.desc}</p>
                <span className="mt-3 inline-flex items-center gap-1 font-display text-[10px] tracking-[0.2em] text-primary opacity-70 transition-opacity group-hover:opacity-100">
                  JUMP TO <ArrowRight className="h-3 w-3" />
                </span>
              </button>
            ))}
          </motion.div>
        </div>
      </section>

      {/* 1 — Reserve a court */}
      <section id="reserve" className="scroll-mt-28 px-6 py-12">
        <div className="mx-auto max-w-4xl">
          <div className="section-divider mb-16" />
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <SectionHeading
              title="RESERVE A COURT"
              sub="Have your four? Choose a time and court below. Open daily 8am–10pm · 90-minute sessions · 4 WPT-spec glass courts."
            />
            <div className="overflow-hidden rounded-sm border border-border bg-muted/30">
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
          </motion.div>
        </div>
      </section>

      {/* 2 + 3 — Clinics and open matches */}
      <section className="px-6 py-12">
        <div className="mx-auto max-w-6xl">
          <div className="section-divider mb-16" />
          <div className="grid gap-16 lg:grid-cols-2 lg:gap-12">
            {/* Learn the basics */}
            <motion.div
              id="clinics"
              className="scroll-mt-28"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <SectionHeading
                title="LEARN THE BASICS"
                sub="Never played? Book a coach-led clinic: small groups, all levels welcome, and you'll be rallying by the end of the first session."
              />
              {isLoading ? (
                <ListStatus>
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
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
                VIEW FULL SCHEDULE <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </motion.div>

            {/* Open matches */}
            <motion.div
              id="matches"
              className="scroll-mt-28"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.1 }}
            >
              <SectionHeading
                title="OPEN MATCHES"
                sub="Hop into a match without bringing a group. Join solo and Playtomic matches you with players at your level."
              />
              {isLoading ? (
                <ListStatus>
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
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
                        onClick={() => setShowAllMatches((s) => !s)}
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
            </motion.div>
          </div>
          <div className="section-divider mt-16" />
        </div>
      </section>
    </main>
  );
};

export default Book;
