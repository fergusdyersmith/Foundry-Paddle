import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Head } from "vite-react-ssg";
import { Check, ExternalLink, MapPin, Phone } from "lucide-react";
import Photo from "@/components/Photo";
import Seo from "@/components/Seo";
import SmsConsentCheckbox from "@/components/SmsConsentCheckbox";
import CheckDraw from "@/components/motion/CheckDraw";
import Reveal from "@/components/motion/Reveal";
import { GALLERY_IMAGE_DIR } from "@/data/gallery";
import { GOOGLE_MAPS_URL } from "@/constants/location";
import {
  LEAGUE_CALENDAR,
  LEAGUE_CLOSES,
  LEAGUE_CLOSES_LABEL,
  LEAGUE_DATES_LABEL,
  LEAGUE_DATE_END,
  LEAGUE_DATE_START,
  LEAGUE_GROUPS,
  LEAGUE_HOST,
  LEAGUE_LEVELS,
  LEAGUE_NAME,
  LEAGUE_NPL_LINE,
  LEAGUE_PRICE_PLAYER,
  LEAGUE_PRICE_TEAM,
  LEAGUE_PRIZE_LINE,
  LEAGUE_RULES,
  LEAGUE_SEASON,
  LEAGUE_TABLE_URL,
  LEAGUE_WEEKS,
} from "@/constants/league";
import { clubToday } from "@/lib/clubTime";
import { useTurnstile } from "@/hooks/useTurnstile";

/**
 * The club league: six weeks, one match a week, teams of two who book their own court.
 * The page has one job the Open's does not: this form IS the signup, there is no Playtomic
 * behind it (Playtomic's league feature wants to book the courts itself, Ryan, 13 Oct).
 * A recorded signup is a team on the list; the team fee is collected afterwards, by the
 * link in LEAGUE_PAY_URL once the club has decided how. See server/league.js.
 *
 * Below the form: how a week works, the rules, the calendar, the levels, and a table that
 * fills from a JSON file Ryan updates each week.
 */

const PHONE_DISPLAY = "(971) 378-7499";
const PHONE_TEL = "+19713787499";
const LEAGUE_EMAIL = "portland@foundrypadel.com";
const sectionHeading = "font-display text-4xl sm:text-5xl text-foreground";
const field =
  "w-full border border-border bg-secondary px-5 py-4 font-body text-sm tracking-widest text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none transition-colors";
const label = "mb-2 block font-body text-xs tracking-[0.2em] uppercase text-muted-foreground";
const optional = <span className="normal-case tracking-normal">(optional)</span>;

type Status = { closed: boolean; closes: string; priceTeam: number; payable: boolean };
type Registered = { payUrl: string | null; priceTeam: number; partner: string | null };
type Table = { group: string; updated?: string; rows: string[][] };

const League = () => {
  const [status, setStatus] = useState<Status | null>(null);
  const [today, setToday] = useState<string | null>(null);
  const [tables, setTables] = useState<Table[] | null>(null);

  const [form, setForm] = useState({
    league: "", level: "", name: "", email: "", phone: "", partner: "", partnerEmail: "", partnerPhone: "",
    team: "", rating: "", availability: "", notes: "", website: "",
  });
  const [smsConsent, setSmsConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<Registered | null>(null);

  useEffect(() => {
    setToday(clubToday());
    fetch("/api/league/status").then((r) => (r.ok ? r.json() : null)).then((s) => s && setStatus(s)).catch(() => {});
    fetch(LEAGUE_TABLE_URL).then((r) => (r.ok ? r.json() : null)).then((t) => Array.isArray(t) && t.length && setTables(t)).catch(() => {});
  }, []);

  const isOver = today != null && today > LEAGUE_DATE_END;
  const isClosed = status?.closed ?? (today != null && today >= LEAGUE_CLOSES);
  const underWay = today != null && today >= LEAGUE_DATE_START && !isOver;
  const daysLeft = today ? Math.max(0, Math.round((Date.parse(LEAGUE_CLOSES) - Date.parse(today)) / 86400000)) : null;
  const price = status?.priceTeam ?? LEAGUE_PRICE_TEAM;

  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const human = useTurnstile();

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.league) { setError("Pick the men's or the women's league."); return; }
    if (!form.level) { setError("Pick the level you want to play."); return; }
    if (!form.name.trim() || !form.email.trim()) { setError("Your name and an email are needed."); return; }
    if (!human.ready) {
      setError("One moment: we are still checking this came from a person. Try again in a second.");
      return;
    }
    setSubmitting(true);
    try {
      const phone = form.phone.trim();
      const res = await fetch("/api/league/register", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...human.headers() },
        body: JSON.stringify({ ...form, phone, ...(phone ? { smsConsent } : {}) }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        human.reset();
        setError(json.error || "Something went wrong. Please try again.");
        return;
      }
      setDone(json);
    } catch {
      human.reset();
      setError("We could not reach the club. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="bg-background min-h-screen">
      <Seo
        title={`${LEAGUE_NAME}: ${LEAGUE_WEEKS}-week padel league, ${LEAGUE_DATES_LABEL} | Foundry Padel`}
        description={`A ${LEAGUE_WEEKS}-week doubles padel league at Foundry Padel, Portland. One match a week, played whenever suits both teams. Three sets a match, every set counts. $${LEAGUE_PRICE_TEAM} a team; signups close ${LEAGUE_CLOSES_LABEL}.`}
        path="/league"
      />
      <Head>
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SportsEvent",
            name: `${LEAGUE_NAME} ${LEAGUE_SEASON}`,
            description: `A ${LEAGUE_WEEKS}-week doubles padel league. One match a week, three sets a match, teams book their own court.`,
            startDate: LEAGUE_DATE_START,
            endDate: LEAGUE_DATE_END,
            eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
            eventStatus: "https://schema.org/EventScheduled",
            url: "https://www.foundrypadel.com/league",
            location: {
              "@type": "Place",
              name: "Foundry Padel",
              address: { "@type": "PostalAddress", streetAddress: "8613 N Crawford St", addressLocality: "Portland", addressRegion: "OR", postalCode: "97203", addressCountry: "US" },
            },
            offers: [{ "@type": "Offer", name: "Team entry", price: LEAGUE_PRICE_TEAM, priceCurrency: "USD", url: "https://www.foundrypadel.com/league" }],
            organizer: { "@type": "Organization", name: "Foundry Padel", url: "https://www.foundrypadel.com" },
          })}
        </script>
      </Head>

      {/* Hero */}
      <section className="relative flex min-h-[80vh] w-full items-center overflow-hidden">
        <div className="absolute inset-0">
          <Photo name="celebration-with-a-partner" dir={GALLERY_IMAGE_DIR} alt="Two partners celebrate a point at Foundry Padel" className="h-full w-full object-cover" priority />
          <div className="absolute inset-0 bg-background/60" />
          <div className="hero-gradient absolute inset-0" />
        </div>
        <div className="relative z-10 mx-auto max-w-3xl px-6 pt-24 text-center">
          <div data-enter>
            <span className="font-body text-sm tracking-[0.2em] uppercase text-primary">{LEAGUE_WEEKS} weeks · one match a week · men's and women's leagues</span>
            <h1 className="mt-4 font-display text-6xl sm:text-8xl leading-none text-foreground">{LEAGUE_NAME.toUpperCase()}</h1>
            <p className="mt-6 font-display text-2xl sm:text-3xl tracking-wide text-foreground">{LEAGUE_DATES_LABEL.toUpperCase()}</p>
            <p className="mx-auto mt-4 max-w-xl font-body text-base text-secondary-foreground">
              Grab a partner, a men's league and a women's league. Every week {LEAGUE_HOST} posts who you play; you and the other team pick the day and the hour. Three sets a match, every set counts, and a table that says where you stand. {LEAGUE_NPL_LINE}
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <a href="#signup" className="bg-primary px-10 py-4 font-display text-lg tracking-widest text-primary-foreground shadow-[0_0_40px_-8px_hsl(var(--primary)/0.7)] transition-all hover:brightness-110">
                {isClosed ? "SEE THE TABLE" : `ENTER A TEAM · $${price}`}
              </a>
            </div>
            {!isClosed && (
              <p className="mt-4 font-body text-sm tracking-[0.08em] uppercase text-primary">
                Signups close {LEAGUE_CLOSES_LABEL}{daysLeft != null ? ` (${daysLeft} ${daysLeft === 1 ? "day" : "days"} left)` : ""}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Price */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-4xl">
          <div className="mx-auto grid max-w-2xl gap-4 sm:grid-cols-2">
            <div className="border border-primary bg-secondary p-6 text-center">
              <p className="font-body text-xs tracking-[0.2em] uppercase text-muted-foreground">Per team</p>
              <p className="mt-2 font-display text-5xl text-foreground">${LEAGUE_PRICE_TEAM}</p>
              <p className="mt-2 font-body text-xs text-secondary-foreground">${LEAGUE_PRICE_PLAYER} each, for the whole season</p>
            </div>
            <div className="border border-border p-6 text-center">
              <p className="font-body text-xs tracking-[0.2em] uppercase text-muted-foreground">Court time</p>
              <p className="mt-2 font-display text-5xl text-foreground">YOURS</p>
              <p className="mt-2 font-body text-xs text-secondary-foreground">Book each match like any other game, at member or off-peak rates</p>
            </div>
          </div>
          <p className="mx-auto mt-6 max-w-2xl text-center font-body text-sm text-muted-foreground">
            The fee runs the league: the fixtures, the table, and the NPL trip for the pairings who earn it. Signups close {LEAGUE_CLOSES_LABEL}; the schedule follows the week after.
          </p>
        </div>
      </section>

      {/* Sign up */}
      <section id="signup" className="scroll-mt-24 px-6 pb-20">
        <div className="mx-auto max-w-2xl">
          <div className="section-divider mb-16" />
          <h2 className={`${sectionHeading} text-center`}>ENTER A TEAM</h2>
          <p className="mx-auto mt-5 max-w-xl text-center font-body text-base leading-relaxed text-secondary-foreground">
            One form per team. The men's or the women's league, your details, your partner's name, and the level you want to play. No partner yet? Sign up on your own and we will pair you with someone at your level.
          </p>

          {isOver ? (
            <div className="mt-12 border border-border p-10 text-center">
              <p className="font-display text-2xl text-foreground">THIS SEASON HAS BEEN PLAYED</p>
              <p className="mt-4 font-body text-base text-secondary-foreground">Thanks to every team. The next season will be here first.</p>
            </div>
          ) : isClosed ? (
            <div className="mt-12 border border-border p-10 text-center">
              <p className="font-display text-2xl text-foreground">SIGNUPS HAVE CLOSED</p>
              <p className="mt-4 font-body text-base text-secondary-foreground">
                The schedule is being made. If you think there is still a place, email <a href={`mailto:${LEAGUE_EMAIL}`} className="text-primary hover:underline">{LEAGUE_EMAIL}</a>.
              </p>
            </div>
          ) : done ? (
            <div className="mt-12 border border-primary bg-secondary p-10 text-center">
              <CheckDraw className="mx-auto mb-6 h-14 w-14 text-foreground" />
              <p className="font-display text-3xl text-foreground">{done.partner ? "YOU'RE ON THE LIST" : "YOU'RE ON THE LIST, PARTNER TO COME"}</p>
              <p className="mt-4 font-body text-base text-secondary-foreground">
                {done.partner
                  ? `We have you and ${done.partner} down. `
                  : "We have you down and will find you a partner at your level once signups close. "}
                The schedule and your first opponent arrive by email the week before week one.
              </p>
              {done.payUrl ? (
                <>
                  <p className="mt-6 font-body text-base text-secondary-foreground">One more thing: the team fee is <span className="text-foreground">${done.priceTeam}</span>, paid once for the season.</p>
                  <a href={done.payUrl} target="_blank" rel="noopener noreferrer" className="mt-6 inline-flex items-center gap-2 bg-primary px-10 py-4 font-display text-lg tracking-widest text-primary-foreground transition-all hover:brightness-110">
                    PAY THE TEAM FEE <ExternalLink size={18} />
                  </a>
                </>
              ) : (
                <p className="mt-6 font-body text-sm text-muted-foreground">
                  The ${done.priceTeam} team fee is paid once for the season. We will email you the payment link, nothing to do now.
                </p>
              )}
            </div>
          ) : (
            <form onSubmit={submit} className="mt-12 space-y-5" noValidate>
              <fieldset>
                <legend className={label}>Which league</legend>
                <div className="grid gap-3 sm:grid-cols-2">
                  {LEAGUE_GROUPS.map((g) => (
                    <label key={g.key} className={`cursor-pointer border p-4 transition-colors focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-primary ${form.league === g.key ? "border-primary bg-secondary" : "border-border hover:border-primary/60"}`}>
                      <input type="radio" name="league" value={g.key} checked={form.league === g.key} onChange={set("league")} className="sr-only" />
                      <span className="block font-display text-xl text-foreground">{g.label.toUpperCase()}</span>
                      <span className="mt-1 block font-body text-xs leading-relaxed text-secondary-foreground">{g.blurb}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <fieldset>
                <legend className={label}>Level you want to play</legend>
                <div className="grid gap-3 sm:grid-cols-3">
                  {LEAGUE_LEVELS.map((l) => (
                    <label key={l.key} className={`cursor-pointer border p-4 transition-colors focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-primary ${form.level === l.key ? "border-primary bg-secondary" : "border-border hover:border-primary/60"}`}>
                      <input type="radio" name="level" value={l.key} checked={form.level === l.key} onChange={set("level")} className="sr-only" />
                      <span className="block font-display text-xl text-foreground">{l.label.toUpperCase()}</span>
                      <span className="block font-body text-xs tracking-[0.15em] uppercase text-primary">Rating {l.rating}</span>
                      <span className="mt-2 block font-body text-xs leading-relaxed text-secondary-foreground">{l.blurb}</span>
                    </label>
                  ))}
                </div>
                <p className="mt-3 font-body text-xs leading-relaxed text-muted-foreground">
                  A guide, not a rule. Divisions are set once signups are in: enough teams at a level and it gets its own table, otherwise levels share one.
                </p>
              </fieldset>

              <div className="grid gap-5 sm:grid-cols-2">
                <div><label className={label} htmlFor="l-name">Your name</label><input id="l-name" className={field} value={form.name} onChange={set("name")} autoComplete="name" /></div>
                <div><label className={label} htmlFor="l-email">Your email</label><input id="l-email" type="email" className={field} value={form.email} onChange={set("email")} autoComplete="email" /></div>
              </div>
              <div><label className={label} htmlFor="l-phone">Mobile, if you would like a text too {optional}</label><input id="l-phone" type="tel" className={field} value={form.phone} onChange={set("phone")} autoComplete="tel" placeholder="(503) 555-0142" /></div>
              {form.phone.trim() && <SmsConsentCheckbox id="l-sms-consent" checked={smsConsent} onChange={setSmsConsent} />}

              <div className="grid gap-5 sm:grid-cols-2">
                <div><label className={label} htmlFor="l-partner">Your partner {optional}</label><input id="l-partner" className={field} value={form.partner} onChange={set("partner")} autoComplete="off" placeholder="Leave blank and we will pair you" /></div>
                <div><label className={label} htmlFor="l-pemail">Partner's email {optional}</label><input id="l-pemail" type="email" className={field} value={form.partnerEmail} onChange={set("partnerEmail")} autoComplete="off" placeholder="So they get the schedule too" /></div>
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <div><label className={label} htmlFor="l-team">Team name {optional}</label><input id="l-team" className={field} value={form.team} onChange={set("team")} autoComplete="off" placeholder="For the table" /></div>
                <div><label className={label} htmlFor="l-rating">Your Playtomic rating {optional}</label><input id="l-rating" className={field} value={form.rating} onChange={set("rating")} autoComplete="off" placeholder="About 2.5" /></div>
              </div>
              <div><label className={label} htmlFor="l-avail">When you can usually play {optional}</label><input id="l-avail" className={field} value={form.availability} onChange={set("availability")} autoComplete="off" placeholder="Weeknights after 7, Sunday mornings" /></div>
              <div><label className={label} htmlFor="l-notes">Anything we should know {optional}</label><textarea id="l-notes" className={`${field} min-h-[5rem]`} value={form.notes} onChange={set("notes")} placeholder="A week you are away, playing up a level, anything else" /></div>
              {/* Honeypot: hidden from people, filled by bots. */}
              <div className="hidden" aria-hidden="true"><input tabIndex={-1} autoComplete="off" value={form.website} onChange={set("website")} /></div>

              {error && <p role="alert" className="font-body text-sm text-primary">{error}</p>}
              <div ref={human.ref} />
              <button type="submit" disabled={submitting} className="w-full bg-primary px-8 py-4 font-display text-lg tracking-widest text-primary-foreground transition-all hover:brightness-110 disabled:opacity-60">
                {submitting ? "SAVING" : `ENTER THE LEAGUE · $${price} A TEAM`}
              </button>
              <p className="text-center font-body text-xs text-muted-foreground">
                Questions? Email <a href={`mailto:${LEAGUE_EMAIL}`} className="whitespace-nowrap text-primary hover:underline">{LEAGUE_EMAIL}</a> or call <a href={`tel:${PHONE_TEL}`} className="whitespace-nowrap text-primary hover:underline">{PHONE_DISPLAY}</a>.
              </p>
            </form>
          )}
        </div>
      </section>

      {/* How it works */}
      <section className="px-6 pb-8">
        <div className="mx-auto max-w-5xl">
          <div className="section-divider mb-16" />
          <div className="grid gap-12 md:grid-cols-2 md:items-start">
            <div>
              <h2 className={sectionHeading}>HOW A WEEK WORKS</h2>
              <div className="mt-8 space-y-6">
                {LEAGUE_RULES.map((r) => (
                  <div key={r.head} className="border-t border-primary pt-4">
                    <h3 className="font-display text-2xl text-foreground">{r.head.toUpperCase()}</h3>
                    <p className="mt-2 font-body text-sm leading-relaxed text-secondary-foreground">{r.body}</p>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h2 className={sectionHeading}>THE SIX WEEKS</h2>
              <ul className="mt-8 divide-y divide-border border-y border-border">
                {LEAGUE_CALENDAR.map((w) => (
                  <li key={w.week} className="flex items-baseline gap-4 py-3">
                    <span className="w-16 shrink-0 font-body text-xs tracking-[0.2em] uppercase text-primary">Week {w.week}</span>
                    <span className="font-display text-xl text-foreground">{w.label}</span>
                    {"note" in w && w.note && <span className="ml-auto text-right font-body text-xs text-muted-foreground">{w.note}</span>}
                  </li>
                ))}
              </ul>
              <ul className="mt-8 space-y-4">
                {[
                  `$${LEAGUE_PRICE_TEAM} a team for the season, court time booked by you`,
                  LEAGUE_PRIZE_LINE,
                  `${LEAGUE_HOST} posts who you play each week and keeps the table`,
                  "Two leagues, men's and women's. Two men or two women to a team, no mixed pairs",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 font-body text-base text-foreground"><Check size={20} className="mt-0.5 shrink-0 text-primary" />{item}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Levels */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className={`${sectionHeading} text-center`}>WHICH LEVEL</h2>
          <Reveal variant="stagger" className="mt-10 grid gap-6 md:grid-cols-3">
            {LEAGUE_LEVELS.map((l) => (
              <div key={l.key} className="border border-border bg-secondary p-8">
                <span className="font-body text-xs tracking-[0.2em] uppercase text-primary">Rating {l.rating}</span>
                <p className="mt-2 font-display text-3xl text-foreground">{l.label.toUpperCase()}</p>
                <p className="mt-3 font-body text-sm leading-relaxed text-secondary-foreground">{l.blurb}</p>
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      {/* Table */}
      <section id="table" className="scroll-mt-24 px-6 pb-20">
        <div className="mx-auto max-w-5xl">
          <div className="section-divider mb-16" />
          <h2 className={sectionHeading}>THE TABLE</h2>
          <p className="mt-4 max-w-xl font-body text-base leading-relaxed text-secondary-foreground">
            One point for every set won. The table appears here once the first week is played and updates each week as scores come in.
            Played your match? <Link to="/league/score" className="text-primary hover:underline">Report the score</Link>.
          </p>
          {tables ? (
            <div className="mt-10 grid gap-8 md:grid-cols-2">
              {tables.map((t) => (
                <div key={t.group} className="border border-border p-6">
                  <p className="font-body text-xs tracking-[0.2em] uppercase text-primary">{t.group}</p>
                  <table className="mt-4 w-full font-body text-sm text-secondary-foreground">
                    <tbody>{t.rows.map((r, i) => <tr key={i} className="border-t border-border">{r.map((c, j) => <td key={j} className={`py-2 ${j ? "text-right text-foreground" : ""}`}>{c}</td>)}</tr>)}</tbody>
                  </table>
                  {t.updated && <p className="mt-3 font-body text-xs text-muted-foreground">Updated {t.updated}</p>}
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-10 border border-dashed border-border p-8 text-center">
              <p className="font-display text-2xl text-muted-foreground">{underWay ? "FIRST SCORES COMING IN" : "SEASON STARTS NOVEMBER 2"}</p>
              <p className="mt-2 font-body text-xs tracking-[0.15em] uppercase text-muted-foreground">Table published after week one</p>
            </div>
          )}
        </div>
      </section>

      {/* Photo + where */}
      <section className="px-6 pb-24">
        <div className="mx-auto grid max-w-5xl gap-10 md:grid-cols-2 md:items-center">
          <div className="aspect-[4/3] overflow-hidden border border-border">
            <Photo name="mezzanine-four-courts" dir={GALLERY_IMAGE_DIR} alt="Foundry Padel's four glass courts seen from the mezzanine" className="h-full w-full object-cover" />
          </div>
          <div className="border border-border p-10 text-center">
            <h2 className="font-display text-3xl text-foreground">FIND US</h2>
            <p className="mt-4 font-body text-base text-secondary-foreground">Foundry Padel, Portland<br />8613 N Crawford St, Portland, OR 97203</p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4">
              <a href={GOOGLE_MAPS_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 border border-primary px-8 py-3 font-display tracking-widest text-primary transition-colors hover:bg-primary hover:text-primary-foreground"><MapPin size={18} /> GET DIRECTIONS</a>
              <a href={`tel:${PHONE_TEL}`} className="inline-flex items-center gap-2 border border-border px-8 py-3 font-display tracking-widest text-foreground transition-colors hover:border-primary"><Phone size={18} /> {PHONE_DISPLAY}</a>
            </div>
            <p className="mt-6 font-body text-sm text-secondary-foreground">Questions about the league: <a href={`mailto:${LEAGUE_EMAIL}`} className="text-primary hover:underline">{LEAGUE_EMAIL}</a></p>
          </div>
        </div>
      </section>
    </main>
  );
};

export default League;
