import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Head } from "vite-react-ssg";
import { Link } from "react-router-dom";
import { ArrowRight, Check, MapPin, Phone } from "lucide-react";
import Photo from "@/components/Photo";
import Seo from "@/components/Seo";
import StayInTouchForm from "@/components/StayInTouchForm";
import { GALLERY_IMAGE_DIR } from "@/data/gallery";
import { GOOGLE_MAPS_URL } from "@/constants/location";
import {
  PREVIEW_DATE,
  PREVIEW_DATE_LABEL,
  PREVIEW_INCLUDES,
  PREVIEW_PRICE,
  PREVIEW_SESSION_CAPACITY,
  PREVIEW_SESSIONS,
  PREVIEW_TITLE_PATTERN,
} from "@/constants/previewEvening";
import { mergePreviewSessions } from "@/lib/previewEvening";
import type { PadelEvent } from "@/types/events";

/**
 * Landing page for the neighbourhood preview evening, and the target of the QR code and
 * the printed URL in the North Peninsula Review ad.
 *
 * Who arrives here matters more than usual: someone holding a newspaper, who has probably
 * never heard of padel or of Playtomic, on a phone. So the page answers, in order, what
 * is this, when, what does it cost, and which button do I press. Everything else on the
 * site assumes a player; this page must not.
 *
 * The three sessions are prerendered from constants so the times are on the page with no
 * JavaScript and when the events feed is down. The feed then lays the live Playtomic
 * sessions over them: booking links, and places left. See lib/previewEvening.ts.
 */

const PHONE_DISPLAY = "(971) 378-7499";
const PHONE_TEL = "+19713787499";

const sectionHeading = "font-display text-4xl sm:text-5xl text-foreground";

/** "17:00" -> "5 PM", "17:30" -> "5:30 PM". Shorter than lib/events formatTime on purpose:
 *  these read as a headline on a card, not as a row in a timetable. */
function clock(t: string): string {
  const [h, m] = t.split(":").map(Number);
  const hour12 = h % 12 || 12;
  return `${hour12}${m ? `:${String(m).padStart(2, "0")}` : ""} ${h >= 12 ? "PM" : "AM"}`;
}

const expectations = [
  {
    title: "NEVER PLAYED? GOOD.",
    desc: "The evening is built for first-timers. Padel is doubles on a small glass court, the serve is underhand, and most people are rallying within a few minutes.",
  },
  {
    title: "COACHES ON COURT",
    desc: "Our coaches run every session. They will show you how to hold the racket, how the walls work, and get you into a game.",
  },
  {
    title: "JUST BRING SHOES",
    desc: "Comfortable athletic wear and non-marking shoes. We hand you a racket and balls when you arrive.",
  },
];

const Preview = () => {
  const [events, setEvents] = useState<PadelEvent[]>([]);
  // Decided in the browser, never at build time: a prerendered "this has happened" would
  // be frozen into the HTML by whichever deploy happened to run last.
  const [isOver, setIsOver] = useState(false);

  useEffect(() => {
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles" }).format(new Date());
    setIsOver(today > PREVIEW_DATE);

    let cancelled = false;
    fetch(`/api/events?date=${PREVIEW_DATE}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (!cancelled && Array.isArray(data)) setEvents(data);
      })
      // The planned sessions are already on the page; a failed feed costs the live
      // counts and nothing else.
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const sessions = useMemo(
    () => mergePreviewSessions(PREVIEW_SESSIONS, events, PREVIEW_DATE, PREVIEW_TITLE_PATTERN),
    [events],
  );
  const anyBookable = sessions.some((s) => s.bookUrl && !s.full);

  return (
    <main className="bg-background min-h-screen">
      <Seo
        title="Neighborhood Preview Evening, October 10 | Foundry Padel, St. Johns"
        description={`Try padel at Portland's first indoor padel club. ${PREVIEW_DATE_LABEL} in St. Johns. ${PREVIEW_PRICE} includes a racket and balls, a brat and a drink. Coaches on court, no experience needed.`}
        path="/preview"
      />
      <Head>
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SportsEvent",
            name: "Foundry Padel Neighborhood Preview Evening",
            description:
              "An evening for the neighborhood to try padel with coaches on court. No experience needed; racket and balls provided.",
            startDate: `${PREVIEW_DATE}T${PREVIEW_SESSIONS[0].start}:00-07:00`,
            endDate: `${PREVIEW_DATE}T${PREVIEW_SESSIONS[PREVIEW_SESSIONS.length - 1].end}:00-07:00`,
            eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
            eventStatus: "https://schema.org/EventScheduled",
            url: "https://www.foundrypadel.com/preview",
            location: {
              "@type": "Place",
              name: "Foundry Padel",
              address: {
                "@type": "PostalAddress",
                streetAddress: "8613 N Crawford St",
                addressLocality: "Portland",
                addressRegion: "OR",
                postalCode: "97203",
                addressCountry: "US",
              },
            },
            offers: {
              "@type": "Offer",
              price: PREVIEW_PRICE.replace("$", ""),
              priceCurrency: "USD",
              url: "https://www.foundrypadel.com/preview",
            },
            organizer: { "@type": "Organization", name: "Foundry Padel", url: "https://www.foundrypadel.com" },
          })}
        </script>
      </Head>

      {/* Hero */}
      <section className="relative flex min-h-[78vh] w-full items-center overflow-hidden">
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
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
            <span className="font-body text-sm tracking-[0.2em] uppercase text-primary">
              Neighborhood preview evening
            </span>
            <h1 className="mt-4 font-display text-5xl sm:text-7xl leading-none text-foreground">
              TRY IT BEFORE EVERYONE ELSE DOES
            </h1>
            <p className="mt-6 font-display text-2xl sm:text-3xl tracking-wide text-foreground">
              {PREVIEW_DATE_LABEL.toUpperCase()}
            </p>
            <p className="mx-auto mt-4 max-w-xl font-body text-base text-secondary-foreground">
              Padel is the fastest-growing sport in the world, and the first courts in the PNW are
              right here in St. Johns. Come pick up a racket, meet the neighbors, and see what
              the fuss is about.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <a
                href="#sessions"
                className="bg-primary px-10 py-4 font-display text-lg tracking-widest text-primary-foreground shadow-[0_0_40px_-8px_hsl(var(--primary)/0.7)] transition-all hover:brightness-110"
              >
                PICK A SESSION · {PREVIEW_PRICE}
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Sessions */}
      <section id="sessions" className="scroll-mt-24 px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <h2 className={sectionHeading}>PICK YOUR SESSION</h2>
            <p className="mx-auto mt-5 max-w-2xl font-body text-base leading-relaxed text-secondary-foreground">
              Each session is two hours with a coach on court, limited to{" "}
              {PREVIEW_SESSION_CAPACITY} people so everyone gets to play. They overlap on
              purpose, so there is always a crowd and you never walk into an empty room.
            </p>
          </div>

          {isOver ? (
            <div className="mx-auto mt-12 max-w-2xl border border-border p-10 text-center">
              <p className="font-display text-2xl text-foreground">THIS EVENING HAS BEEN AND GONE</p>
              <p className="mt-4 font-body text-base text-secondary-foreground">
                You can still try padel any day of the week. Start here.
              </p>
              <Link
                to="/new-to-padel"
                className="mt-8 inline-flex items-center gap-2 bg-primary px-8 py-3 font-display tracking-widest text-primary-foreground transition-all hover:brightness-110"
              >
                NEW TO PADEL <ArrowRight size={18} />
              </Link>
            </div>
          ) : (
            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {sessions.map((s, i) => (
                <motion.div
                  key={s.start}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.6, delay: i * 0.08 }}
                  className="flex flex-col border border-border bg-secondary p-8 text-center"
                >
                  <span className="font-body text-xs tracking-[0.2em] uppercase text-muted-foreground">
                    Session {i + 1}
                  </span>
                  <p className="mt-3 font-display text-4xl leading-none text-foreground">
                    {clock(s.start)} <span className="text-primary">to</span> {clock(s.end)}
                  </p>
                  <p className="mt-3 font-body text-sm text-secondary-foreground">
                    {PREVIEW_PRICE} per person{" · "}
                    {s.spotsLeft != null && !s.full && s.spotsLeft > 0 ? (
                      <span className="text-foreground">
                        {s.spotsLeft} {s.spotsLeft === 1 ? "spot" : "spots"} left
                      </span>
                    ) : s.full ? (
                      <>sold out</>
                    ) : (
                      <>{PREVIEW_SESSION_CAPACITY} spots</>
                    )}
                  </p>

                  <div className="mt-8 flex flex-1 flex-col justify-end">
                    {s.full ? (
                      s.waitlistUrl ? (
                        <a
                          href={s.waitlistUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="border border-primary px-6 py-3 font-display tracking-widest text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
                        >
                          FULL · JOIN THE WAITLIST
                        </a>
                      ) : (
                        <span className="border border-border px-6 py-3 font-display tracking-widest text-muted-foreground">
                          SESSION FULL
                        </span>
                      )
                    ) : s.bookUrl ? (
                      <a
                        href={s.bookUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-primary px-6 py-3 font-display tracking-widest text-primary-foreground transition-all hover:brightness-110"
                      >
                        BOOK THIS SESSION
                      </a>
                    ) : (
                      <span className="border border-border px-6 py-3 font-display tracking-widest text-muted-foreground">
                        BOOKING OPENS SOON
                      </span>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {!isOver && (
            <p className="mx-auto mt-10 max-w-2xl text-center font-body text-sm leading-relaxed text-muted-foreground">
              {anyBookable ? (
                <>
                  Booking happens on Playtomic, the app the club runs on. New to it? You will
                  create a free account as you book, which takes about a minute, and it is the
                  same account you would use to book a court afterwards. Rather talk to a
                  person?{" "}
                </>
              ) : (
                <>Online booking for the evening is being set up. To hold a spot now, </>
              )}
              <a href={`tel:${PHONE_TEL}`} className="whitespace-nowrap text-primary hover:underline">
                call {PHONE_DISPLAY}
              </a>
              .
            </p>
          )}
        </div>
      </section>

      {/* What the $25 covers */}
      <section className="px-6 pb-8">
        <div className="mx-auto max-w-5xl">
          <div className="section-divider mb-16" />
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
            className="grid gap-12 md:grid-cols-2 md:items-center"
          >
            <div>
              <h2 className={sectionHeading}>
                <span className="text-primary">{PREVIEW_PRICE}</span> AND YOU'RE SET
              </h2>
              <p className="mt-6 font-body text-base leading-relaxed text-secondary-foreground">
                One price per person covers the whole evening. Nothing to buy first and nothing
                to bring but shoes.
              </p>
              <ul className="mt-8 space-y-4">
                {PREVIEW_INCLUDES.map((item) => (
                  <li key={item} className="flex items-start gap-3 font-body text-base text-foreground">
                    <Check size={20} className="mt-0.5 shrink-0 text-primary" />
                    {item}
                  </li>
                ))}
              </ul>
              <p className="mt-6 font-body text-xs tracking-[0.1em] uppercase text-muted-foreground">
                Beer and wine for ages 21 and over
              </p>
            </div>
            <div className="aspect-[4/3] overflow-hidden border border-border">
              <Photo
                name="paddle-tap-four"
                dir={GALLERY_IMAGE_DIR}
                alt="Four players tap paddles across the net after a match at Foundry Padel"
                className="h-full w-full object-cover"
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* What to expect */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <div className="grid gap-10 md:grid-cols-3">
            {expectations.map((x) => (
              <div key={x.title} className="border-t border-primary pt-6">
                <h3 className="font-display text-2xl text-foreground">{x.title}</h3>
                <p className="mt-3 font-body text-sm leading-relaxed text-secondary-foreground">{x.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Where */}
      <section className="px-6 pb-20">
        <div className="mx-auto max-w-3xl border border-border p-10 text-center">
          <h2 className="font-display text-3xl text-foreground">FIND US</h2>
          <p className="mt-4 font-body text-base text-secondary-foreground">
            8613 N Crawford St, Portland, OR 97203
            <br />
            In St. Johns, next to Cathedral Park
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a
              href={GOOGLE_MAPS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 border border-primary px-8 py-3 font-display tracking-widest text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
            >
              <MapPin size={18} /> GET DIRECTIONS
            </a>
            <a
              href={`tel:${PHONE_TEL}`}
              className="inline-flex items-center gap-2 border border-border px-8 py-3 font-display tracking-widest text-foreground transition-colors hover:border-primary"
            >
              <Phone size={18} /> {PHONE_DISPLAY}
            </a>
          </div>
        </div>
      </section>

      {/* Nobody who scanned a newspaper ad should leave with nothing to do. Until the
          sessions can be booked, offer the list, so the club can tell them when they can. */}
      {!isOver && !anyBookable && (
        <section className="px-6 pb-24">
          <div className="mx-auto max-w-2xl text-center">
            <StayInTouchForm
              source="preview"
              headingClassName="font-display text-4xl sm:text-5xl text-foreground mb-3"
            />
          </div>
        </section>
      )}
    </main>
  );
};

export default Preview;
