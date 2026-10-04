import type { CSSProperties, FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Head } from "vite-react-ssg";
import { Check, MapPin, Phone } from "lucide-react";
import Photo from "@/components/Photo";
import Seo from "@/components/Seo";
import SmsConsentCheckbox from "@/components/SmsConsentCheckbox";
import { GALLERY_IMAGE_DIR } from "@/data/gallery";
import { GOOGLE_MAPS_URL } from "@/constants/location";
import {
  JUNIOR_AGE_RULES,
  JUNIOR_BLURB,
  JUNIOR_COACH,
  JUNIOR_DAYS,
  JUNIOR_FREE_LINE,
  JUNIOR_PLACES,
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

// Monica's number for the junior clinic (her request, 3 Oct 2026). The other pages keep
// the club's (971) 378-7499.
const PHONE_DISPLAY = "(612) 442-7600";
const PHONE_TEL = "+16124427600";
const sectionHeading = "font-display text-4xl sm:text-5xl text-foreground";
const field =
  "w-full border border-border bg-secondary px-5 py-4 font-body text-sm tracking-widest text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none transition-colors";
const fieldLabel = "mb-2 block font-body text-xs tracking-[0.2em] uppercase text-muted-foreground";

/** How many days to show at once. One, for now: the club has not committed to every
 *  closure day in public (the line came off the flyers on 25 September), so the page lists
 *  the next date only until more sessions are actually created. Raise this when they are. */
const DAYS_SHOWN = 1;

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
          "juniors",
          false, // only the two planned sessions; see mergePreviewSessions
        ),
      })),
    [upcoming, eventsByDate],
  );
  const next = upcoming[0];

  return (
    <main className="bg-background min-h-screen">
      <Seo
        title={`Junior Padel Clinic with ${JUNIOR_COACH} | Foundry Padel, St. Johns`}
        description={`Padel for kids on a day off school. This first clinic is free: ${JUNIOR_PLACES} places covered by a sponsor. Coached by ${JUNIOR_COACH}, racket and balls included. Ages 10 and up. Next: ${next?.label ?? "see dates"}.`}
        path="/juniors"
      />
      <Head>
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SportsEvent",
            name: `Junior Padel Clinic with ${JUNIOR_COACH}`,
            description: "A padel clinic for kids on a day off school. Racket and balls provided.",
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
            isAccessibleForFree: true,
            offers: {
              "@type": "Offer",
              price: "0",
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
            name="hero-juniors"
            alt={`${JUNIOR_COACH} lines up an overhead on court at Foundry Padel`}
            width={1067}
            height={1600}
            // A portrait frame in a wide hero: a desktop shows only a strip of it, so hold
            // the strip on his face and racket rather than dead centre.
            className="h-full w-full object-cover object-[50%_18%]"
            priority
          />
          <div className="absolute inset-0 bg-background/60" />
          <div className="hero-gradient absolute inset-0" />
        </div>
        <div className="relative z-10 mx-auto max-w-3xl px-6 pt-24 text-center">
          <div data-enter style={{ "--enter-y": "30px", "--enter-duration": "0.8s" } as CSSProperties}>
            <span className="font-body text-sm tracking-[0.2em] uppercase text-primary">Junior padel clinic</span>
            <h1 className="mt-4 font-display text-5xl sm:text-7xl leading-none text-foreground">
              SCHOOL'S OUT. COURTS ARE OPEN.
            </h1>
            <p className="mx-auto mt-6 max-w-xl font-body text-base text-secondary-foreground">
              Padel for kids on a day off school, for kids who have never held a racket and
              kids who have. Racket and balls provided. {JUNIOR_BLURB}
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <a
                href="#signup"
                className="bg-primary px-10 py-4 font-display text-lg tracking-widest text-primary-foreground shadow-[0_0_40px_-8px_hsl(var(--primary)/0.7)] transition-all hover:brightness-110"
              >
                SIGN UP · {JUNIOR_PRICE.toUpperCase()}
              </a>
              <a href="#dates" className="border border-border px-10 py-4 font-display text-lg tracking-widest text-foreground transition-colors hover:border-primary">
                SEE THE DATES
              </a>
            </div>
          </div>
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
                The next days off school have not been scheduled yet. Leave your details below and we
                will let you know.
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
                      {i === 0 ? "Next up" : "Then"} · No school: {day.reason.toLowerCase()}
                    </span>
                    <p className="mt-2 font-display text-3xl leading-none text-foreground">{day.label.toUpperCase()}</p>
                    <p className="mt-2 font-body text-sm text-secondary-foreground">{JUNIOR_FREE_LINE}</p>
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
                          {/* The signup is the form below, not Playtomic: the clinic is free
                              since 2 October. The feed still tells us when a session is full. */}
                          {s.full ? (
                            <span className="inline-block border border-border px-5 py-2.5 font-display text-sm tracking-widest text-muted-foreground">FULL</span>
                          ) : (
                            <a href="#signup" className="inline-block bg-primary px-5 py-2.5 font-display text-sm tracking-widest text-primary-foreground transition-all hover:brightness-110">
                              SIGN UP
                            </a>
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
            Nothing to pay and no app needed: fill in the form below and the place is held for
            your kid. Rather talk to a person?{" "}
            <a href={`tel:${PHONE_TEL}`} className="whitespace-nowrap text-primary hover:underline">call {PHONE_DISPLAY}</a>.
          </p>
        </div>
      </section>

      <SignupForm days={upcoming} full={days.map((d) => d.sessions.map((s) => Boolean(s.full)))} />

      <NextDatesSignup nextLabel={next?.label ?? null} />

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
                Please, only children enrolled in the clinic in attendance
              </p>
            </div>
            <div>
              <h2 className={sectionHeading}>
                <span className="text-primary">{JUNIOR_PRICE.toUpperCase()}</span>, AND THEY'RE SET
              </h2>
              <p className="mt-4 font-body text-sm text-secondary-foreground">{JUNIOR_FREE_LINE}</p>
              <ul className="mt-8 space-y-4">
                {[
                  "Ninety minutes on court, coached by Timbers legend " + JUNIOR_COACH,
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

type Child = { name: string; age: string };

/**
 * The signup. Free since 2 October (a sponsor covers 100 places), so there is no payment
 * step and no Playtomic: this form is the registration. One parent, one day, one row per
 * child in the organisers' sheet; the age picks the session. Records to Slack, Klaviyo
 * and the sheet shared with Monica; see server/juniors.js.
 */
function SignupForm({ days, full }: { days: JuniorDay[]; full: boolean[][] }) {
  const [form, setForm] = useState({ name: "", email: "", phone: "", notes: "", website: "" });
  const [day, setDay] = useState<string>(days[0]?.date ?? "");
  const [children, setChildren] = useState<Child[]>([{ name: "", age: "" }]);
  const [smsConsent, setSmsConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ dayLabel: string; count: number } | null>(null);

  // The page decides "today" after mount, so the day list can arrive after first render.
  useEffect(() => {
    if (!day && days[0]) setDay(days[0].date);
  }, [days, day]);

  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const setChild = (i: number, k: keyof Child) => (e: { target: { value: string } }) =>
    setChildren((cs) => cs.map((c, j) => (j === i ? { ...c, [k]: e.target.value } : c)));

  /** Which session an age lands in, or null when the club wants a call first. */
  const sessionFor = (age: number) => (age >= 14 ? "14+" : age >= 10 ? "10-13" : null);
  const dayIndex = Math.max(0, days.findIndex((d) => d.date === day));

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.name.trim() || !form.email.trim() || !day) {
      setError("Your name, an email and the day are needed.");
      return;
    }
    const kids = children.filter((c) => c.name.trim() || c.age.trim());
    if (kids.length === 0) {
      setError("Add at least one child: name and age.");
      return;
    }
    const payload = [];
    for (const c of kids) {
      const age = Number(c.age);
      if (!c.name.trim() || !Number.isInteger(age)) {
        setError("Each child needs a name and an age.");
        return;
      }
      const session = sessionFor(age);
      if (!session) {
        setError(`Under 10 is case by case. Call ${PHONE_DISPLAY} and we will talk it through.`);
        return;
      }
      const j = JUNIOR_SESSION_TIMES.findIndex((t) => t.group === session);
      if (full[dayIndex]?.[j]) {
        setError(`The ${JUNIOR_SESSION_TIMES[j].label} session is full that day. Call ${PHONE_DISPLAY} for the waitlist.`);
        return;
      }
      payload.push({ name: c.name.trim(), age, session });
    }
    setSubmitting(true);
    try {
      const phone = form.phone.trim();
      const res = await fetch("/api/juniors/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, phone, day, children: payload, ...(phone ? { smsConsent } : {}) }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error || "Something went wrong. Please try again.");
        return;
      }
      setDone({ dayLabel: json.dayLabel, count: payload.length });
    } catch {
      setError("We could not reach the club. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section id="signup" className="scroll-mt-24 px-6 pb-20">
      <div className="mx-auto max-w-2xl">
        <div className="section-divider mb-16" />
        <h2 className={`${sectionHeading} text-center`}>SIGN UP, IT'S FREE</h2>
        <p className="mx-auto mt-5 max-w-xl text-center font-body text-base leading-relaxed text-secondary-foreground">
          {JUNIOR_FREE_LINE} One form per family: your details, then each child. The age picks
          the session (10 to 13 at 9 AM, 14 and up at 10:30).
        </p>

        {done ? (
          <div className="mt-12 border border-primary bg-secondary p-10 text-center">
            <p className="font-display text-3xl text-foreground">
              {done.count === 1 ? "THEY'RE IN" : "THEY'RE ALL IN"}
            </p>
            <p className="mt-4 font-body text-base text-secondary-foreground">
              {done.count === 1 ? "A place is held" : `${done.count} places are held`} for {done.dayLabel}. Bring court shoes and
              water; racket and balls are here. Questions? Call {PHONE_DISPLAY}.
            </p>
          </div>
        ) : days.length === 0 ? (
          <div className="mt-12 border border-border p-10 text-center">
            <p className="font-body text-base text-secondary-foreground">No dates are open for signup yet. Leave your details below and we will tell you first.</p>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-12 space-y-5" noValidate>
            <div>
              <label className={fieldLabel} htmlFor="s-day">Which day</label>
              <select id="s-day" className={field} value={day} onChange={(e) => setDay(e.target.value)}>
                {days.map((d) => (
                  <option key={d.date} value={d.date}>{d.label} · no school, {d.reason.toLowerCase()}</option>
                ))}
              </select>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <div><label className={fieldLabel} htmlFor="s-name">Parent's name</label><input id="s-name" className={field} value={form.name} onChange={set("name")} autoComplete="name" /></div>
              <div><label className={fieldLabel} htmlFor="s-email">Email</label><input id="s-email" type="email" className={field} value={form.email} onChange={set("email")} autoComplete="email" /></div>
            </div>
            <div><label className={fieldLabel} htmlFor="s-phone">Mobile, if you would like a text too</label><input id="s-phone" type="tel" className={field} value={form.phone} onChange={set("phone")} autoComplete="tel" placeholder="(503) 555-0142" /></div>
            {form.phone.trim() && <SmsConsentCheckbox id="s-sms-consent" checked={smsConsent} onChange={setSmsConsent} />}

            <fieldset className="space-y-3">
              <legend className={fieldLabel}>Your kids</legend>
              {children.map((c, i) => (
                <div key={i} className="grid gap-3 sm:grid-cols-[1fr_8rem_auto] sm:items-end">
                  <div>
                    {i === 0 && <label className="mb-2 block font-body text-xs text-muted-foreground" htmlFor={`s-child-${i}`}>Child's name</label>}
                    <input id={`s-child-${i}`} className={field} value={c.name} onChange={setChild(i, "name")} placeholder="First and last name" />
                  </div>
                  <div>
                    {i === 0 && <label className="mb-2 block font-body text-xs text-muted-foreground" htmlFor={`s-age-${i}`}>Age</label>}
                    <input id={`s-age-${i}`} className={field} inputMode="numeric" value={c.age} onChange={setChild(i, "age")} placeholder="12" />
                  </div>
                  {children.length > 1 ? (
                    <button type="button" onClick={() => setChildren((cs) => cs.filter((_, j) => j !== i))} className="border border-border px-4 py-4 font-body text-xs tracking-widest text-muted-foreground hover:border-primary">
                      REMOVE
                    </button>
                  ) : (
                    <span className="hidden sm:block" />
                  )}
                </div>
              ))}
              {children.length < 6 && (
                <button type="button" onClick={() => setChildren((cs) => [...cs, { name: "", age: "" }])} className="font-body text-xs tracking-[0.15em] uppercase text-primary hover:underline">
                  + Add another child
                </button>
              )}
            </fieldset>

            <div><label className={fieldLabel} htmlFor="s-notes">Anything we should know</label><textarea id="s-notes" className={`${field} min-h-[5rem]`} value={form.notes} onChange={set("notes")} placeholder="Racket experience, anything a coach should know" /></div>
            <div className="hidden" aria-hidden="true"><input tabIndex={-1} autoComplete="off" value={form.website} onChange={set("website")} /></div>

            {error && <p className="font-body text-sm text-primary">{error}</p>}
            <button type="submit" disabled={submitting} className="w-full bg-primary px-8 py-4 font-display text-lg tracking-widest text-primary-foreground transition-all hover:brightness-110 disabled:opacity-60">
              {submitting ? "SAVING" : "HOLD THEIR PLACE"}
            </button>
            <p className="text-center font-body text-xs leading-relaxed text-muted-foreground">
              Ages 10 to 13: a parent stays for the session. Under 10: call us first. This also puts you on the club's email list; unsubscribe any time.
            </p>
          </form>
        )}
      </div>
    </section>
  );
}

/**
 * The list for parents who cannot make the date on show. The page lists one day at a time,
 * so without this the only way to hear about the next one was to call. Records to Slack and
 * Klaviyo; see server/juniors.js.
 */
function NextDatesSignup({ nextLabel }: { nextLabel: string | null }) {
  const [form, setForm] = useState({ name: "", email: "", phone: "", notes: "", website: "" });
  const [ages, setAges] = useState<string[]>([]);
  const [smsConsent, setSmsConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const toggleAge = (group: string) =>
    setAges((a) => (a.includes(group) ? a.filter((g) => g !== group) : [...a, group]));

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.name.trim() || !form.email.trim() || ages.length === 0) {
      setError("A name, an email and at least one age group are needed.");
      return;
    }
    setSubmitting(true);
    try {
      const phone = form.phone.trim();
      const res = await fetch("/api/juniors/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Consent travels only with a number, as on the stay-in-touch form.
        body: JSON.stringify({ ...form, phone, ages, ...(phone ? { smsConsent } : {}) }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error || "Something went wrong. Please try again.");
        return;
      }
      setDone(true);
    } catch {
      setError("We could not reach the club. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section id="next-dates" className="scroll-mt-24 px-6 pb-20">
      <div className="mx-auto max-w-2xl">
        <div className="section-divider mb-16" />
        <h2 className={`${sectionHeading} text-center`}>HEAR ABOUT THE NEXT DATES</h2>
        <p className="mx-auto mt-5 max-w-xl text-center font-body text-base leading-relaxed text-secondary-foreground">
          {nextLabel ? `Can't make ${nextLabel}? ` : ""}Leave your details and we will tell you when the
          next junior clinic is on the calendar.
        </p>

        {done ? (
          <div className="mt-12 border border-primary bg-secondary p-10 text-center">
            <p className="font-display text-3xl text-foreground">YOU'RE ON THE LIST</p>
            <p className="mt-4 font-body text-base text-secondary-foreground">
              We will be in touch as soon as the next dates are set.
            </p>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-12 space-y-5" noValidate>
            <div className="grid gap-5 sm:grid-cols-2">
              <div><label className={fieldLabel} htmlFor="j-name">Parent's name</label><input id="j-name" className={field} value={form.name} onChange={set("name")} autoComplete="name" /></div>
              <div><label className={fieldLabel} htmlFor="j-email">Email</label><input id="j-email" type="email" className={field} value={form.email} onChange={set("email")} autoComplete="email" /></div>
            </div>

            <fieldset>
              <legend className={fieldLabel}>Your kids' ages</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                {JUNIOR_SESSION_TIMES.map((t) => (
                  <label key={t.group} className={`flex cursor-pointer items-center gap-4 border p-4 transition-colors ${ages.includes(t.group) ? "border-primary bg-secondary" : "border-border hover:border-primary/60"}`}>
                    <input type="checkbox" checked={ages.includes(t.group)} onChange={() => toggleAge(t.group)} className="peer sr-only" />
                    {/* Both can be ticked, so the tick has to show, not just the border. */}
                    <span className={`flex h-5 w-5 shrink-0 items-center justify-center border peer-focus-visible:ring-2 peer-focus-visible:ring-primary ${ages.includes(t.group) ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground"}`}>
                      {ages.includes(t.group) && <Check size={14} strokeWidth={3} />}
                    </span>
                    <span>
                      <span className="block font-display text-xl text-foreground">{t.ages.toUpperCase()}</span>
                      <span className="block font-body text-xs tracking-[0.15em] uppercase text-primary">{t.label}</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div><label className={fieldLabel} htmlFor="j-phone">Mobile, if you would like a text too</label><input id="j-phone" type="tel" className={field} value={form.phone} onChange={set("phone")} autoComplete="tel" placeholder="(503) 555-0142" /></div>
            {form.phone.trim() && <SmsConsentCheckbox id="j-sms-consent" checked={smsConsent} onChange={setSmsConsent} />}
            <div><label className={fieldLabel} htmlFor="j-notes">Anything we should know</label><textarea id="j-notes" className={`${field} min-h-[5rem]`} value={form.notes} onChange={set("notes")} placeholder="How many kids, which days off suit you" /></div>
            {/* Honeypot: hidden from people, filled by bots. */}
            <div className="hidden" aria-hidden="true"><input tabIndex={-1} autoComplete="off" value={form.website} onChange={set("website")} /></div>

            {error && <p className="font-body text-sm text-primary">{error}</p>}
            <button type="submit" disabled={submitting} className="w-full bg-primary px-8 py-4 font-display text-lg tracking-widest text-primary-foreground transition-all hover:brightness-110 disabled:opacity-60">
              {submitting ? "SAVING" : "LET ME KNOW"}
            </button>
            <p className="text-center font-body text-xs leading-relaxed text-muted-foreground">
              This also puts you on the club's email list. Unsubscribe any time. Rather talk to a person?{" "}
              <a href={`tel:${PHONE_TEL}`} className="whitespace-nowrap text-primary hover:underline">Call {PHONE_DISPLAY}</a>.
            </p>
          </form>
        )}
      </div>
    </section>
  );
}

export default Juniors;
