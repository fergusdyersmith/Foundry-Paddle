import { useEffect, useMemo, useState, type CSSProperties, type FormEvent } from "react";
import { motion } from "framer-motion";
import { Head } from "vite-react-ssg";
import { Check, ExternalLink, MapPin, Phone, Radio } from "lucide-react";
import Photo from "@/components/Photo";
import Seo from "@/components/Seo";
import { GALLERY_IMAGE_DIR } from "@/data/gallery";
import { GOOGLE_MAPS_URL } from "@/constants/location";
import { PLAYTOMIC_APP_STORE_URL, PLAYTOMIC_PLAY_STORE_URL } from "@/constants/booking";
import {
  OPEN_BRACKETS_URL,
  OPEN_CAPACITY,
  OPEN_CLOSES,
  OPEN_CLOSES_LABEL,
  OPEN_DATES_LABEL,
  OPEN_DATE_END,
  OPEN_DATE_START,
  OPEN_HOST,
  OPEN_HOST_LINE,
  OPEN_INCLUDES,
  OPEN_LEVELS,
  OPEN_NAME,
  OPEN_PRIZE_POOL,
  OPEN_SCHEDULE,
  OPEN_SUPPLIERS,
  OPEN_STREAM_LABEL,
  OPEN_STREAM_URL,
  OPEN_TIERS,
  SHIRT_SIZES,
} from "@/constants/openTournament";

/**
 * The December open. The page has one job the others do not: ask which level someone
 * wants to play (and, if they will say, their shirt size and partner) BEFORE showing the
 * Playtomic link that takes payment. Playtomic knows a rating; it does not know that a
 * 3.0 wants to play advanced. Only the level is required: Playtomic collects name, phone
 * and email at payment, so asking here again was friction for nothing (30 Sep). The
 * registration goes to the server, which records it and hands back the link and today's
 * price; see server/open.js.
 *
 * Below the form: the format, the levels, what the entry covers, the suppliers, and a
 * brackets section that fills from a JSON file the club updates over the weekend.
 */

const PHONE_DISPLAY = "(971) 378-7499";
const PHONE_TEL = "+19713787499";
// Questions about the Open go to the club inbox, not the desk phone (Kelly, 30 Sep).
const OPEN_EMAIL = "portland@foundrypadel.com";
const sectionHeading = "font-display text-4xl sm:text-5xl text-foreground";
const field =
  "w-full border border-border bg-secondary px-5 py-4 font-body text-sm tracking-widest text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none transition-colors";
const label = "mb-2 block font-body text-xs tracking-[0.2em] uppercase text-muted-foreground";

type Status = { tier: string; label: string; price: number; closed: boolean; bookable: boolean };
type Registered = { bookUrl: string | null; price: number; pay: number; tier: string };
type Bracket = { level: string; stage: string; updated?: string; rows: string[][] };

function todayInPortland(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles" }).format(new Date());
}

/** The same tier rule as the server, for the prerender. */
function tierFor(today: string) {
  let tier: (typeof OPEN_TIERS)[number] = OPEN_TIERS[0];
  for (const t of OPEN_TIERS) if (t.from <= today) tier = t;
  return tier;
}

const Open = () => {
  const [status, setStatus] = useState<Status | null>(null);
  const [today, setToday] = useState<string | null>(null);
  const [brackets, setBrackets] = useState<Bracket[] | null>(null);

  // No rating field: Playtomic shows the club a player's rating once they book.
  const [form, setForm] = useState({ name: "", shirt: "", level: "", playtomicEmail: "", partner: "", notes: "", website: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<Registered | null>(null);

  useEffect(() => {
    setToday(todayInPortland());
    fetch("/api/open/status").then((r) => (r.ok ? r.json() : null)).then((s) => s && setStatus(s)).catch(() => {});
    fetch(OPEN_BRACKETS_URL).then((r) => (r.ok ? r.json() : null)).then((b) => Array.isArray(b) && b.length && setBrackets(b)).catch(() => {});
  }, []);

  const tier = useMemo(() => tierFor(today ?? OPEN_TIERS[0].from), [today]);
  const price = status?.price ?? tier.price;
  const isOver = today != null && today > OPEN_DATE_END;
  const isClosed = status?.closed ?? (today != null && today >= OPEN_CLOSES);
  const isEarly = (status?.tier ?? tier.key) === "early" && !isClosed;
  // Days of early bird left, counted in the browser so the number is never a stale
  // prerender. The regular tier starts on OPEN_TIERS[1].from.
  const daysLeft = today
    ? Math.max(0, Math.round((Date.parse(OPEN_TIERS[1].from) - Date.parse(today)) / 86400000))
    : null;
  const urgency = isEarly
    ? `Early bird ends ${OPEN_TIERS[0].until}${daysLeft != null ? ` (${daysLeft} ${daysLeft === 1 ? "day" : "days"} left)` : ""}. After that it's $${OPEN_TIERS[1].price}.`
    : null;

  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.level) {
      setError("Pick the level you want to play.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/open/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error || "Something went wrong. Please try again.");
        return;
      }
      setDone(json);
    } catch {
      setError("We could not reach the club. Nothing has been charged; please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="bg-background min-h-screen">
      <Seo
        title={`${OPEN_NAME}: two-day padel tournament, ${OPEN_DATES_LABEL} | Foundry Padel`}
        description={`A two-day padel tournament for beginners, intermediate and advanced players at Foundry Padel, Portland. Pool play Saturday, single-elimination bracket Sunday, everyone plays both days, ${OPEN_PRIZE_POOL ?? "prizes"} in prizes, a brat and a drink each day included. Entry from $${OPEN_TIERS[0].price}; registration closes ${OPEN_CLOSES_LABEL}.`}
        path="/open"
      />
      <Head>
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SportsEvent",
            name: OPEN_NAME,
            description: "A two-day padel tournament for beginners, intermediate and advanced players. Pool play Saturday, single-elimination bracket Sunday. Everyone plays both days.",
            startDate: `${OPEN_DATE_START}T09:00:00-08:00`,
            endDate: `${OPEN_DATE_END}T18:00:00-08:00`,
            eventAttendanceMode: "https://schema.org/MixedEventAttendanceMode",
            eventStatus: "https://schema.org/EventScheduled",
            url: "https://www.foundrypadel.com/open",
            maximumAttendeeCapacity: OPEN_CAPACITY,
            location: {
              "@type": "Place",
              name: "Foundry Padel",
              address: { "@type": "PostalAddress", streetAddress: "8613 N Crawford St", addressLocality: "Portland", addressRegion: "OR", postalCode: "97203", addressCountry: "US" },
            },
            offers: OPEN_TIERS.map((t) => ({ "@type": "Offer", name: t.label, price: t.price, priceCurrency: "USD", url: "https://www.foundrypadel.com/open" })),
            organizer: { "@type": "Organization", name: "Foundry Padel", url: "https://www.foundrypadel.com" },
            director: { "@type": "Person", name: OPEN_HOST },
          })}
        </script>
      </Head>

      {/* Hero */}
      <section className="relative flex min-h-[80vh] w-full items-center overflow-hidden">
        <div className="absolute inset-0">
          <Photo name="mezzanine-four-courts" dir={GALLERY_IMAGE_DIR} alt="Foundry Padel's four glass courts seen from the mezzanine" className="h-full w-full object-cover" priority />
          <div className="absolute inset-0 bg-background/60" />
          <div className="hero-gradient absolute inset-0" />
        </div>
        <div className="relative z-10 mx-auto max-w-3xl px-6 pt-24 text-center">
          <div data-enter style={{ "--enter-y": "30px" } as CSSProperties}>
            <span className="font-body text-sm tracking-[0.2em] uppercase text-primary">Two days · three levels · {OPEN_PRIZE_POOL ? `${OPEN_PRIZE_POOL} in prizes` : "prizes in every level"}</span>
            <h1 className="mt-4 font-display text-6xl sm:text-8xl leading-none text-foreground">{OPEN_NAME.toUpperCase()}</h1>
            <p className="mt-6 font-display text-2xl sm:text-3xl tracking-wide text-foreground">{OPEN_DATES_LABEL.toUpperCase()}</p>
            <p className="mx-auto mt-4 max-w-xl font-body text-base text-secondary-foreground">
              Pool play on Saturday, a single-elimination bracket on Sunday, in beginner, intermediate and
              advanced draws. Everyone plays both days, win or lose. {OPEN_PRIZE_POOL ? `${OPEN_PRIZE_POOL} in prizes` : "Prizes in every level"}, a shirt on your back, and a brat and a drink on us each day. {OPEN_HOST_LINE}
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <a href="#register" className="bg-primary px-10 py-4 font-display text-lg tracking-widest text-primary-foreground shadow-[0_0_40px_-8px_hsl(var(--primary)/0.7)] transition-all hover:brightness-110">
                {isEarly ? `LOCK IN EARLY BIRD · $${price}` : `REGISTER · $${price}`}
              </a>
            </div>
            {urgency && <p className="mt-4 font-body text-sm tracking-[0.08em] uppercase text-primary">{urgency}</p>}
          </div>
        </div>
      </section>

      {/* Price tiers */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-4xl">
          <div className="mx-auto grid max-w-2xl gap-4 sm:grid-cols-2">
            {OPEN_TIERS.map((t) => {
              const current = !isClosed && t.key === (status?.tier ?? tier.key);
              const past = today != null && t.key !== tier.key && t.from < tier.from;
              return (
                <div key={t.key} className={`border p-6 text-center ${current ? "border-primary bg-secondary" : "border-border"} ${past ? "opacity-50" : ""}`}>
                  <p className="font-body text-xs tracking-[0.2em] uppercase text-muted-foreground">{t.label}{current ? " · now" : ""}</p>
                  <p className="mt-2 font-display text-5xl text-foreground">${t.price}</p>
                  <p className="mt-2 font-body text-xs text-secondary-foreground">until {t.until}</p>
                </div>
              );
            })}
          </div>
          <p className="mx-auto mt-6 max-w-2xl text-center font-body text-sm text-muted-foreground">
            Registration closes {OPEN_CLOSES_LABEL}. Entry is capped at {OPEN_CAPACITY} players across all levels.
          </p>
        </div>
      </section>

      {/* Register */}
      <section id="register" className="scroll-mt-24 px-6 pb-20">
        <div className="mx-auto max-w-2xl">
          <div className="section-divider mb-16" />
          <h2 className={`${sectionHeading} text-center`}>{isEarly ? "LOCK IN THE EARLY BIRD" : "REGISTER"}</h2>
          <p className="mx-auto mt-5 max-w-xl text-center font-body text-base leading-relaxed text-secondary-foreground">
            Pick the level you want to play and we will send you straight to Playtomic to pay and hold your place. Everything else is optional.
            {urgency ? ` ${urgency}` : ""}
          </p>

          {isOver ? (
            <div className="mt-12 border border-border p-10 text-center">
              <p className="font-display text-2xl text-foreground">THIS ONE HAS BEEN PLAYED</p>
              <p className="mt-4 font-body text-base text-secondary-foreground">Thanks to everyone who came. The next one will be here first.</p>
            </div>
          ) : isClosed ? (
            <div className="mt-12 border border-border p-10 text-center">
              <p className="font-display text-2xl text-foreground">REGISTRATION HAS CLOSED</p>
              <p className="mt-4 font-body text-base text-secondary-foreground">
                The draws are being made. If you think there is still a place, <a href={`tel:${PHONE_TEL}`} className="text-primary hover:underline">call {PHONE_DISPLAY}</a>.
              </p>
            </div>
          ) : done ? (
            <div className="mt-12 border border-primary bg-secondary p-10 text-center">
              <p className="font-display text-3xl text-foreground">ONE MORE STEP</p>
              <p className="mt-4 font-body text-base text-secondary-foreground">
                You are not in until you pay on Playtomic. Your entry is <span className="text-foreground">${done.pay}</span>
                {done.tier === "early" ? ", the early-bird price, locked in the moment you pay" : ""}.
              </p>
              {done.bookUrl ? (
                <a href={done.bookUrl} target="_blank" rel="noopener noreferrer" className="mt-8 inline-flex items-center gap-2 bg-primary px-10 py-4 font-display text-lg tracking-widest text-primary-foreground transition-all hover:brightness-110">
                  PAY ON PLAYTOMIC <ExternalLink size={18} />
                </a>
              ) : (
                <p className="mt-8 font-body text-sm text-muted-foreground">
                  Payment opens on Playtomic shortly. We have your details and will email you the link the moment it is live.
                </p>
              )}
              <p className="mx-auto mt-6 max-w-md font-body text-xs leading-relaxed text-muted-foreground">
                Playtomic registers in its app. New to it? Get it for{" "}
                <a href={PLAYTOMIC_APP_STORE_URL} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">iPhone</a> or{" "}
                <a href={PLAYTOMIC_PLAY_STORE_URL} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Android</a>, make a free account, then come back and tap the button again.

              </p>
            </div>
          ) : (
            <form onSubmit={submit} className="mt-12 space-y-5" noValidate>
              <fieldset>
                <legend className={label}>Level you want to play</legend>
                <div className="grid gap-3 sm:grid-cols-3">
                  {OPEN_LEVELS.map((l) => (
                    <label key={l.key} className={`cursor-pointer border p-4 transition-colors ${form.level === l.key ? "border-primary bg-secondary" : "border-border hover:border-primary/60"}`}>
                      <input type="radio" name="level" value={l.key} checked={form.level === l.key} onChange={set("level")} className="sr-only" />
                      <span className="block font-display text-xl text-foreground">{l.label.toUpperCase()}</span>
                      <span className="block font-body text-xs tracking-[0.15em] uppercase text-primary">Rating {l.rating}</span>
                      <span className="mt-2 block font-body text-xs leading-relaxed text-secondary-foreground">{l.blurb}</span>
                    </label>
                  ))}
                </div>
                <p className="mt-3 font-body text-xs leading-relaxed text-muted-foreground">
                  The ratings are a guide, not a rule. If you are a 3.0 who wants the advanced draw, pick advanced and say so below. We seed the brackets after Saturday's pool play anyway.
                </p>
              </fieldset>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className={label} htmlFor="o-name">Your name <span className="normal-case tracking-normal">(optional)</span></label>
                  <input id="o-name" className={field} value={form.name} onChange={set("name")} autoComplete="name" placeholder="As it appears on Playtomic" />
                </div>
                <div>
                  <label className={label} htmlFor="o-shirt">T-shirt size <span className="normal-case tracking-normal">(optional)</span></label>
                  <select id="o-shirt" className={field} value={form.shirt} onChange={set("shirt")}>
                    <option value="">Choose</option>
                    {SHIRT_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className={label} htmlFor="o-partner">Your partner <span className="normal-case tracking-normal">(optional)</span></label>
                  <input id="o-partner" className={field} value={form.partner} onChange={set("partner")} autoComplete="off" placeholder="Their name, and have them register too" />
                </div>
              </div>
              <p className="font-body text-xs leading-relaxed text-muted-foreground">
                We recommend entering with a partner. On your own? Leave it blank and we will match you with someone at your level.
              </p>
              <div><label className={label} htmlFor="o-pemail">Email on your Playtomic account <span className="normal-case tracking-normal">(optional)</span></label><input id="o-pemail" type="email" className={field} value={form.playtomicEmail} onChange={set("playtomicEmail")} autoComplete="email" placeholder="So we can match this to your booking" /></div>
              <div><label className={label} htmlFor="o-notes">Anything we should know <span className="normal-case tracking-normal">(optional)</span></label><textarea id="o-notes" className={`${field} min-h-[5rem]`} value={form.notes} onChange={set("notes")} placeholder="Playing up a level, dietary needs, anything else" /></div>
              {/* Honeypot: hidden from people, filled by bots. */}
              <div className="hidden" aria-hidden="true"><input tabIndex={-1} autoComplete="off" value={form.website} onChange={set("website")} /></div>

              {error && <p className="font-body text-sm text-primary">{error}</p>}
              <button type="submit" disabled={submitting} className="w-full bg-primary px-8 py-4 font-display text-lg tracking-widest text-primary-foreground transition-all hover:brightness-110 disabled:opacity-60">
                {submitting ? "SAVING" : isEarly ? `LOCK IN $${price} · CONTINUE TO PAYMENT` : `CONTINUE TO PAYMENT · $${price}`}
              </button>
              <p className="text-center font-body text-xs text-muted-foreground">
                Questions? Email <a href={`mailto:${OPEN_EMAIL}`} className="whitespace-nowrap text-primary hover:underline">{OPEN_EMAIL}</a> or call <a href={`tel:${PHONE_TEL}`} className="whitespace-nowrap text-primary hover:underline">{PHONE_DISPLAY}</a>.
              </p>
            </form>
          )}
        </div>
      </section>

      {/* Format and what's included */}
      <section className="px-6 pb-8">
        <div className="mx-auto max-w-5xl">
          <div className="section-divider mb-16" />
          <div className="grid gap-12 md:grid-cols-2 md:items-start">
            <div>
              <h2 className={sectionHeading}>THE FORMAT</h2>
              <div className="mt-8 space-y-6">
                {OPEN_SCHEDULE.map((s) => (
                  <div key={s.day} className="border-t border-primary pt-4">
                    <h3 className="font-display text-2xl text-foreground">{s.day.toUpperCase()}</h3>
                    <p className="mt-2 font-body text-sm leading-relaxed text-secondary-foreground">{s.what}</p>
                  </div>
                ))}
              </div>
              <p className="mt-6 font-body text-sm leading-relaxed text-secondary-foreground">
                Enter with a partner if you have one; if not, we pair singles by level. Once we see how many players are in each level, we finalise the three draws and let everyone know before the weekend.
              </p>
            </div>
            <div>
              <h2 className={sectionHeading}>YOUR ENTRY COVERS</h2>
              <ul className="mt-8 space-y-4">
                {OPEN_INCLUDES.map((item) => (
                  <li key={item} className="flex items-start gap-3 font-body text-base text-foreground"><Check size={20} className="mt-0.5 shrink-0 text-primary" />{item}</li>
                ))}
              </ul>
              <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-5">
                {OPEN_SUPPLIERS.map((s) => (
                  <div key={s.name} className="flex items-center gap-3">
                    <span className="font-body text-[10px] tracking-[0.2em] uppercase text-muted-foreground">{s.role}</span>
                    {s.src ? <img src={s.src} alt={s.name} className="h-11 w-auto" loading="lazy" /> : <span className="font-display text-lg text-foreground">{s.name}</span>}
                  </div>
                ))}
              </div>
              <p className="mt-4 font-body text-xs tracking-[0.1em] uppercase text-muted-foreground">Beer and wine for ages 21 and over</p>
            </div>
          </div>
        </div>
      </section>

      {/* Levels */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className={`${sectionHeading} text-center`}>THREE LEVELS</h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {OPEN_LEVELS.map((l) => (
              <motion.div key={l.key} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-60px" }} transition={{ duration: 0.6 }} className="border border-border bg-secondary p-8">
                <span className="font-body text-xs tracking-[0.2em] uppercase text-primary">Rating {l.rating}</span>
                <p className="mt-2 font-display text-3xl text-foreground">{l.label.toUpperCase()}</p>
                <p className="mt-3 font-body text-sm leading-relaxed text-secondary-foreground">{l.blurb}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Brackets and stream */}
      <section id="brackets" className="scroll-mt-24 px-6 pb-20">
        <div className="mx-auto max-w-5xl">
          <div className="section-divider mb-16" />
          <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
            <div>
              <h2 className={sectionHeading}>DRAWS AND RESULTS</h2>
              <p className="mt-4 max-w-xl font-body text-base leading-relaxed text-secondary-foreground">
                The draws for each level appear here once registration closes, and the brackets update through the weekend as results come in.
              </p>
            </div>
            <div className="flex items-center gap-3 border border-border px-5 py-3">
              <Radio size={18} className="text-primary" />
              <div>
                <p className="font-body text-xs tracking-[0.15em] uppercase text-foreground">{OPEN_STREAM_LABEL}</p>
                <p className="font-body text-xs text-muted-foreground">
                  {OPEN_STREAM_URL ? <a href={OPEN_STREAM_URL} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Watch from anywhere</a> : "Watch from anywhere. Link here on the day."}
                </p>
              </div>
            </div>
          </div>

          {brackets ? (
            <div className="mt-10 grid gap-8 md:grid-cols-3">
              {brackets.map((b) => (
                <div key={b.level + b.stage} className="border border-border p-6">
                  <p className="font-body text-xs tracking-[0.2em] uppercase text-primary">{b.level}</p>
                  <p className="font-display text-2xl text-foreground">{b.stage.toUpperCase()}</p>
                  <table className="mt-4 w-full font-body text-sm text-secondary-foreground">
                    <tbody>{b.rows.map((r, i) => <tr key={i} className="border-t border-border">{r.map((c, j) => <td key={j} className={`py-2 ${j ? "text-right text-foreground" : ""}`}>{c}</td>)}</tr>)}</tbody>
                  </table>
                  {b.updated && <p className="mt-3 font-body text-xs text-muted-foreground">Updated {b.updated}</p>}
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {OPEN_LEVELS.map((l) => (
                <div key={l.key} className="border border-dashed border-border p-8 text-center">
                  <p className="font-display text-2xl text-muted-foreground">{l.label.toUpperCase()}</p>
                  <p className="mt-2 font-body text-xs tracking-[0.15em] uppercase text-muted-foreground">Draw published after registration closes</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Photo + where */}
      <section className="px-6 pb-24">
        <div className="mx-auto grid max-w-5xl gap-10 md:grid-cols-2 md:items-center">
          <div className="aspect-[4/3] overflow-hidden border border-border">
            <Photo name="celebration-with-a-partner" dir={GALLERY_IMAGE_DIR} alt="Two partners laugh and raise their paddles after winning a point at Foundry Padel" className="h-full w-full object-cover" />
          </div>
          <div className="border border-border p-10 text-center">
            <h2 className="font-display text-3xl text-foreground">FIND US</h2>
            <p className="mt-4 font-body text-base text-secondary-foreground">Foundry Padel, Portland<br />8613 N Crawford St, Portland, OR 97203</p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4">
              <a href={GOOGLE_MAPS_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 border border-primary px-8 py-3 font-display tracking-widest text-primary transition-colors hover:bg-primary hover:text-primary-foreground"><MapPin size={18} /> GET DIRECTIONS</a>
              <a href={`tel:${PHONE_TEL}`} className="inline-flex items-center gap-2 border border-border px-8 py-3 font-display tracking-widest text-foreground transition-colors hover:border-primary"><Phone size={18} /> {PHONE_DISPLAY}</a>
            </div>
            <p className="mt-6 font-body text-sm text-secondary-foreground">Questions about the Open: <a href={`mailto:${OPEN_EMAIL}`} className="text-primary hover:underline">{OPEN_EMAIL}</a></p>
          </div>
        </div>
      </section>
    </main>
  );
};

export default Open;
