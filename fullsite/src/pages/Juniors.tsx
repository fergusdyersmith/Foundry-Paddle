import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Head } from "vite-react-ssg";
import { Check, MapPin, Phone } from "lucide-react";
import Photo from "@/components/Photo";
import Seo from "@/components/Seo";
import { GALLERY_IMAGE_DIR } from "@/data/gallery";
import { GOOGLE_MAPS_URL } from "@/constants/location";
import { PLAYTOMIC_APP_STORE_URL, PLAYTOMIC_PLAY_STORE_URL } from "@/constants/booking";
import {
  JUNIOR_AGE_RULES,
  JUNIOR_BLURB,
  JUNIOR_COACH,
  JUNIOR_DAYS,
  JUNIOR_PRICE,
  JUNIOR_SESSION_TIMES,
  JUNIOR_TITLE_PATTERN,
  plannedSessionsFor,
  type JuniorDay,
} from "@/constants/juniorClinic";
import { mergePreviewSessions, type PreviewSession } from "@/lib/previewEvening";
import type { PadelEvent } from "@/types/events";

/**
 * The junior clinic: the target of the QR code and printed URL on its ad.
 *
 * Built on the preview evening's pattern. Sessions run on days Portland schools are
 * closed, so the page is a list of those days, each with its two sessions; the days
 * are prerendered from constants and the events feed is laid over them for booking
 * links and places left. The reader is a parent, probably on a phone, who wants to
 * know when, how much, what the rules are for their kid's age, and which button.
 */

const PHONE_DISPLAY = "(971) 378-7499";
const PHONE_TEL = "+19713787499";
const sectionHeading = "font-display text-4xl sm:text-5xl text-foreground";

/** How many closure days to show at once. The full list is a school year long. */
const DAYS_SHOWN = 4;

function todayInPortland(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles" }).format(new Date());
}

type DayWithSessions = { day: JuniorDay; sessions: PreviewSession[] };

const Juniors = () => {
  const [today, setToday] = useState<string | null>(null);
  const [eventsByDate, setEventsByDate] = useState<Record<string, PadelEvent[]>>({});

  // Decided in the browser: prerendering "today" would freeze whichever day the deploy ran.
  useEffect(() => setToday(todayInPortland()), []);

  const upcoming = useMemo(
    () => (today ? JUNIOR_DAYS.filter((d) => d.date >= today) : JUNIOR_DAYS).slice(0, DAYS_SHOWN),
    [today],
  );

  useEffect(() => {
    if (!today) return;
    let cancelled = false;
    // One request per day shown, not the range endpoint: the days are months apart.
    Promise.all(
      upcoming.map((d) =>
        fetch(`/api/events?date=${d.date}`)
          .then((r) => (r.ok ? r.json() : []))
          .then((data) => [d.date, Array.isArray(data) ? data : []] as const)
          .catch(() => [d.date, []] as const),
      ),
    ).then((pairs) => {
      if (!cancelled) setEventsByDate(Object.fromEntries(pairs));
    });
    return () => {
      cancelled = true;
    };
  }, [today, upcoming]);

  const days: DayWithSessions[] = useMemo(
    () =>
      upcoming.map((day) => ({
        day,
        sessions: mergePreviewSessions(
          plannedSessionsFor(day),
          eventsByDate[day.date] ?? [],
          day.date,
          JUNIOR_TITLE_PATTERN,
        ),
      })),
    [upcoming, eventsByDate],
  );
  const anyBookable = days.some((d) => d.sessions.some((s) => s.bookUrl && !s.full));
  const next = upcoming[0];

  return (
    <main className="bg-background min-h-screen">
      <Seo
        title={`Junior Padel Clinic with ${JUNIOR_COACH} | Foundry Padel, St. Johns`}
        description={`Padel for kids on days Portland schools are closed. ${JUNIOR_PRICE} a session with ${JUNIOR_COACH}, racket and balls included. Ages 10 and up. Next: ${next?.label ?? "see dates"}.`}
        path="/juniors"
      />
      <Head>
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SportsEvent",
            name: `Junior Padel Clinic with ${JUNIOR_COACH}`,
            description: "A padel clinic for kids on days Portland Public Schools are closed. Racket and balls provided.",
            startDate: `${JUNIOR_DAYS[0].date}T${JUNIOR_SESSION_TIMES[0].start}:00-07:00`,
            eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
            eventStatus: "https://schema.org/EventScheduled",
            url: "https://www.foundrypadel.com/juniors",
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
              price: JUNIOR_PRICE.replace("$", ""),
              priceCurrency: "USD",
              url: "https://www.foundrypadel.com/juniors",
            },
            organizer: { "@type": "Organization", name: "Foundry Padel", url: "https://www.foundrypadel.com" },
          })}
        </script>
      </Head>

      {/* Hero */}
      <section className="relative flex min-h-[78vh] w-full items-center overflow-hidden">
        <div className="absolute inset-0">
          <Photo
            name="drill-overhead-with-basket"
            dir={GALLERY_IMAGE_DIR}
            alt="A player lines up an overhead during a coaching drill, ball basket courtside at Foundry Padel"
            className="h-full w-full object-cover"
            priority
          />
          <div className="absolute inset-0 bg-background/60" />
          <div className="hero-gradient absolute inset-0" />
        </div>
        <div className="relative z-10 mx-auto max-w-3xl px-6 pt-24 text-center">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
            <span className="font-body text-sm tracking-[0.2em] uppercase text-primary">Junior padel clinic</span>
            <h1 className="mt-4 font-display text-5xl sm:text-7xl leading-none text-foreground">
              SCHOOL'S OUT. COURTS ARE OPEN.
            </h1>
            <p className="mx-auto mt-6 max-w-xl font-body text-base text-secondary-foreground">
              Padel for kids on the days Portland schools are closed, for kids who have never
              held a racket and kids who have. Racket and balls provided. {JUNIOR_BLURB}
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <a
                href="#dates"
                className="bg-primary px-10 py-4 font-display text-lg tracking-widest text-primary-foreground shadow-[0_0_40px_-8px_hsl(var(--primary)/0.7)] transition-all hover:brightness-110"
              >
                SEE THE DATES · {JUNIOR_PRICE}
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Dates */}
      <section id="dates" className="scroll-mt-24 px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <h2 className={sectionHeading}>PICK A DAY AND A TIME</h2>
            <p className="mx-auto mt-5 max-w-2xl font-body text-base leading-relaxed text-secondary-foreground">
              Two sessions each day, one for each age group. {JUNIOR_BLURB}
            </p>
          </div>

          {days.length === 0 ? (
            <div className="mx-auto mt-12 max-w-2xl border border-border p-10 text-center">
              <p className="font-display text-2xl text-foreground">NO DATES ON THE CALENDAR YET</p>
              <p className="mt-4 font-body text-base text-secondary-foreground">
                The next school closure days have not been scheduled. Call us and we will let you know.
              </p>
            </div>
          ) : (
            <div className="mt-12 space-y-6">
              {days.map(({ day, sessions }, i) => (
                <motion.div
                  key={day.date}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.6, delay: i * 0.06 }}
                  className="grid gap-6 border border-border bg-secondary p-8 md:grid-cols-[1.2fr_1fr_1fr] md:items-center"
                >
                  <div>
                    <span className="font-body text-xs tracking-[0.2em] uppercase text-muted-foreground">
                      {i === 0 ? "Next up" : "Then"} · {day.reason}
                    </span>
                    <p className="mt-2 font-display text-3xl leading-none text-foreground">{day.label.toUpperCase()}</p>
                    <p className="mt-2 font-body text-sm text-secondary-foreground">{JUNIOR_PRICE} per child, per session</p>
                  </div>
                  {sessions.map((s, j) => {
                    const label = JUNIOR_SESSION_TIMES[j]?.label ?? `${s.start} to ${s.end}`;
                    const spots =
                      s.spotsLeft != null && !s.full && s.spotsLeft > 0
                        ? `${s.spotsLeft} ${s.spotsLeft === 1 ? "spot" : "spots"} left`
                        : null;
                    return (
                      <div key={s.start} className="flex flex-col border-t border-border pt-5 md:border-l md:border-t-0 md:pl-6 md:pt-0">
                        <span className="font-body text-xs tracking-[0.2em] uppercase text-primary">
                          {JUNIOR_SESSION_TIMES[j]?.ages}
                        </span>
                        <p className="mt-1 font-display text-2xl text-foreground">{label}</p>
                        {spots && <p className="mt-1 font-body text-xs text-secondary-foreground">{spots}</p>}
                        <div className="mt-4">
                          {s.full ? (
                            s.waitlistUrl ? (
                              <a href={s.waitlistUrl} target="_blank" rel="noopener noreferrer" className="inline-block border border-primary px-5 py-2.5 font-display text-sm tracking-widest text-primary transition-colors hover:bg-primary hover:text-primary-foreground">
                                FULL · WAITLIST
                              </a>
                            ) : (
                              <span className="inline-block border border-border px-5 py-2.5 font-display text-sm tracking-widest text-muted-foreground">FULL</span>
                            )
                          ) : s.bookUrl ? (
                            <a href={s.bookUrl} target="_blank" rel="noopener noreferrer" className="inline-block bg-primary px-5 py-2.5 font-display text-sm tracking-widest text-primary-foreground transition-all hover:brightness-110">
                              BOOK
                            </a>
                          ) : (
                            <span className="inline-block border border-border px-5 py-2.5 font-display text-sm tracking-widest text-muted-foreground">BOOKING OPENS SOON</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </motion.div>
              ))}
            </div>
          )}

          <p className="mx-auto mt-10 max-w-2xl text-center font-body text-sm leading-relaxed text-muted-foreground">
            {anyBookable ? (
              <>
                Booking is in Playtomic, the free app the club runs on. Tap a session, then choose
                "Open in app" to pay and hold the spot. New to it? Get the app for{" "}
                <a href={PLAYTOMIC_APP_STORE_URL} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">iPhone</a>
                {" "}or{" "}
                <a href={PLAYTOMIC_PLAY_STORE_URL} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Android</a>
                , make a free account in your own name, then come back and tap the session again. Rather talk to a person?{" "}
              </>
            ) : (
              <>Online booking is being set up. To hold a spot now, </>
            )}
            <a href={`tel:${PHONE_TEL}`} className="whitespace-nowrap text-primary hover:underline">call {PHONE_DISPLAY}</a>.
            {" "}Every day Portland Public Schools are closed to students is a clinic day; the next few are listed above.
          </p>
        </div>
      </section>

      {/* Ages and what to bring */}
      <section className="px-6 pb-8">
        <div className="mx-auto max-w-5xl">
          <div className="section-divider mb-16" />
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
            className="grid gap-12 md:grid-cols-2 md:items-start"
          >
            <div>
              <h2 className={sectionHeading}>WHO IT'S FOR</h2>
              <div className="mt-8 space-y-6">
                {JUNIOR_AGE_RULES.map((r) => (
                  <div key={r.heading} className="border-t border-primary pt-4">
                    <h3 className="font-display text-2xl text-foreground">{r.heading.toUpperCase()}</h3>
                    <p className="mt-2 font-body text-sm leading-relaxed text-secondary-foreground">{r.body}</p>
                  </div>
                ))}
              </div>
              <p className="mt-8 font-body text-xs tracking-[0.1em] uppercase text-muted-foreground">
                Please, only children enrolled in the clinic on court
              </p>
            </div>
            <div>
              <h2 className={sectionHeading}>
                <span className="text-primary">{JUNIOR_PRICE}</span> AND THEY'RE SET
              </h2>
              <ul className="mt-8 space-y-4">
                {[
                  "Ninety minutes on court, coached by " + JUNIOR_COACH,
                  "Racket and balls included",
                  "Just bring court shoes and water",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 font-body text-base text-foreground">
                    <Check size={20} className="mt-0.5 shrink-0 text-primary" />
                    {item}
                  </li>
                ))}
              </ul>
              <div className="mt-10 aspect-[4/3] overflow-hidden border border-border">
                <Photo
                  name="coaching-demo"
                  dir={GALLERY_IMAGE_DIR}
                  alt="A coach demonstrates a low volley to a player at Foundry Padel"
                  className="h-full w-full object-cover"
                />
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Where */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-3xl border border-border p-10 text-center">
          <h2 className="font-display text-3xl text-foreground">FIND US</h2>
          <p className="mt-4 font-body text-base text-secondary-foreground">
            8613 N Crawford St, Portland, OR 97203
            <br />
            In St. Johns, next to Cathedral Park
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a href={GOOGLE_MAPS_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 border border-primary px-8 py-3 font-display tracking-widest text-primary transition-colors hover:bg-primary hover:text-primary-foreground">
              <MapPin size={18} /> GET DIRECTIONS
            </a>
            <a href={`tel:${PHONE_TEL}`} className="inline-flex items-center gap-2 border border-border px-8 py-3 font-display tracking-widest text-foreground transition-colors hover:border-primary">
              <Phone size={18} /> {PHONE_DISPLAY}
            </a>
          </div>
        </div>
      </section>
    </main>
  );
};

export default Juniors;
