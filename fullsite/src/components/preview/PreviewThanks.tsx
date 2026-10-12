import { useMemo } from "react";
import { Link } from "react-router-dom";
import { addDays, parseISO } from "date-fns";
import { ArrowRight } from "lucide-react";
import Photo from "@/components/Photo";
import Seo from "@/components/Seo";
import StayInTouchForm from "@/components/StayInTouchForm";
import Reveal from "@/components/motion/Reveal";
import BallLoader from "@/components/motion/BallLoader";
import BookEventRow from "@/components/book/BookEventRow";
import FindUs from "@/components/preview/FindUs";
import { GALLERY_IMAGE_DIR } from "@/data/gallery";
import { PREVIEW_DATE_LABEL } from "@/constants/previewEvening";
import { useScheduleEvents } from "@/hooks/useScheduleEvents";
import { isFullEvent, isPastEvent } from "@/lib/events";
import { clubToday } from "@/lib/clubTime";
import { formatUsd, ratesOn } from "@shared/rates";

/**
 * /preview once the evening has been. The URL is printed in the newspaper ad and in its
 * QR code, so people keep arriving here; each one gets a thank-you, a way to hear about
 * the next evening (the signup is tagged signup_source "preview"), and the sessions they
 * can book this week. The evening's own page (pages/Preview.tsx) is kept for the next
 * one: set new dates in constants/previewEvening.ts and it comes back.
 */

// Sessions a newcomer can walk into: coached clinics and open matches.
const BOOKABLE_TYPES = new Set(["PUBLIC_CLASS", "COURSE_CLASS", "OPEN_MATCH"]);
const DAYS_AHEAD = 14;
const SESSIONS_SHOWN = 6;

const sectionHeading = "font-display text-4xl sm:text-5xl text-foreground";

const PreviewThanks = () => {
  const todayKey = clubToday();
  const rates = ratesOn(todayKey);
  const [from, to] = useMemo(() => {
    const start = parseISO(todayKey);
    return [start, addDays(start, DAYS_AHEAD)];
  }, [todayKey]);
  const { data: events = [], isLoading, isError } = useScheduleEvents(from, to);

  // Only what can still be booked, soonest first. The API sorts by date then time.
  const upcoming = useMemo(
    () =>
      events
        .filter((e) => BOOKABLE_TYPES.has(e.booking_type) && !isPastEvent(e) && !isFullEvent(e))
        .slice(0, SESSIONS_SHOWN),
    [events],
  );

  return (
    <main className="bg-background min-h-screen">
      <Seo
        title="Thanks for Coming to the Preview Evening | Foundry Padel, St. Johns"
        description={`Thank you to everyone who came to Foundry Padel's neighborhood preview evening. Hear about the next one, or book a beginner clinic, an open match or a court in St. Johns from ${formatUsd(rates.perPlayer90)} per player.`}
        path="/preview"
      />

      {/* Hero */}
      <section className="relative flex min-h-[70vh] w-full items-center overflow-hidden">
        <div className="absolute inset-0">
          <Photo
            name="group-high-five"
            dir={GALLERY_IMAGE_DIR}
            alt="Four players high-five over the net at the end of a match at Foundry Padel"
            className="h-full w-full object-cover"
            priority
          />
          <div className="absolute inset-0 bg-background/60" />
          <div className="hero-gradient absolute inset-0" />
        </div>
        <div className="relative z-10 mx-auto max-w-3xl px-6 pt-24 text-center">
          <div data-enter>
            <span className="font-body text-sm tracking-[0.2em] uppercase text-primary">
              Neighborhood preview evening · {PREVIEW_DATE_LABEL}
            </span>
            <h1 className="mt-4 font-display text-5xl sm:text-7xl leading-none text-foreground">
              THANK YOU, ST. JOHNS
            </h1>
            <p className="mx-auto mt-6 max-w-xl font-body text-base text-secondary-foreground">
              To everyone who came down, picked up a racket and gave padel a go: thank you for
              making it such a good evening. We will be doing it again.
            </p>
            <p className="mx-auto mt-3 max-w-xl font-body text-base text-secondary-foreground">
              Until then the courts are open every day, and you do not need a partner or any
              experience to play.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <a
                href="#play"
                className="bg-primary px-10 py-4 font-display text-lg tracking-widest text-primary-foreground shadow-[0_0_40px_-8px_hsl(var(--primary)/0.7)] transition-all hover:brightness-110"
              >
                PLAY THIS WEEK
              </a>
              <a
                href="#next"
                className="border border-foreground/40 bg-background/60 px-8 py-4 font-display text-sm tracking-widest text-foreground backdrop-blur-sm transition-all hover:border-foreground"
              >
                HEAR ABOUT THE NEXT ONE
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* The list for the next evening */}
      <section id="next" className="scroll-mt-24 px-6 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <StayInTouchForm
            source="preview"
            heading="Hear About the Next One"
            subtitle="Be first to know when the next preview evening is on."
            headingClassName="font-display text-4xl sm:text-5xl text-foreground mb-3"
            defaultInterests={["events"]}
          />
        </div>
      </section>

      {/* What they can book now */}
      <section id="play" className="scroll-mt-24 px-6 pb-20">
        <div className="mx-auto max-w-3xl">
          <div className="section-divider mb-16" />
          <Reveal className="text-center">
            <h2 className={sectionHeading}>PLAY THIS WEEK</h2>
            <p className="mx-auto mt-5 max-w-2xl font-body text-base leading-relaxed text-secondary-foreground">
              Beginner clinics with a coach, and open matches you can join on your own: we
              match you with three players at your level. Drop-in play is{" "}
              <span className="text-foreground">{formatUsd(rates.perPlayer90)} per player</span> for
              90 minutes, and rackets are $5 to rent.
            </p>
          </Reveal>

          <div className="mt-10">
            {isLoading ? (
              <BallLoader label="Loading sessions" className="py-10" />
            ) : isError || upcoming.length === 0 ? (
              <p className="border border-dashed border-border px-4 py-10 text-center font-body text-sm text-muted-foreground">
                {isError
                  ? "We could not load the sessions just now."
                  : "Nothing open to join in the next two weeks yet."}{" "}
                <Link to="/schedule" className="text-primary hover:underline">
                  See the full schedule
                </Link>
                .
              </p>
            ) : (
              <Reveal variant="stagger" className="flex flex-col gap-3">
                {upcoming.map((e) => (
                  <BookEventRow key={e.id} event={e} />
                ))}
              </Reveal>
            )}
          </div>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              to="/book"
              className="bg-primary px-8 py-3 font-display tracking-widest text-primary-foreground transition-all hover:brightness-110"
            >
              BOOK A COURT
            </Link>
            <Link
              to="/schedule"
              className="inline-flex items-center gap-2 border border-border px-8 py-3 font-display tracking-widest text-foreground transition-colors hover:border-primary"
            >
              FULL SCHEDULE <ArrowRight size={18} className="nudge" />
            </Link>
          </div>
          <p className="mt-6 text-center font-body text-sm text-muted-foreground">
            First time on court?{" "}
            <Link to="/new-to-padel" className="text-primary hover:underline">
              Here is what to expect
            </Link>
            .
          </p>
        </div>
      </section>

      <FindUs />
    </main>
  );
};

export default PreviewThanks;
