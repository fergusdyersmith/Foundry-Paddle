import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Head } from "vite-react-ssg";
import Seo from "@/components/Seo";
import CheckDraw from "@/components/motion/CheckDraw";
import { LEAGUE_CALENDAR, LEAGUE_HOST, LEAGUE_NAME } from "@/constants/league";
import { clubToday } from "@/lib/clubTime";
import { useTurnstile } from "@/hooks/useTurnstile";

/**
 * Score reporting for league teams: the week, the two teams, three set scores, and who
 * is reporting. Either team reports; the winners are asked to. Goes to Slack and the
 * Scores tab of the organisers' sheet (server/league.js), from which Ryan keeps the
 * table on /league. A form, not a page to find: noindex, not in the sitemap.
 */

const LEAGUE_EMAIL = "portland@foundrypadel.com";
const field =
  "w-full border border-border bg-secondary px-5 py-4 font-body text-sm tracking-widest text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none transition-colors";
const label = "mb-2 block font-body text-xs tracking-[0.2em] uppercase text-muted-foreground";
const EMPTY_SETS: [string, string][] = [["", ""], ["", ""], ["", ""]];

/** The week today falls in, or the last one that has started; week 1 before the season. */
function currentWeek(today: string | null) {
  if (!today) return 1;
  let w = 1;
  for (const c of LEAGUE_CALENDAR) if (c.from <= today) w = c.week;
  return w;
}

const LeagueScore = () => {
  const [week, setWeek] = useState<number | null>(null);
  const [form, setForm] = useState({ team: "", opponent: "", name: "", email: "", notes: "", website: "" });
  const [sets, setSets] = useState<[string, string][]>(EMPTY_SETS);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ won: number; lost: number } | null>(null);
  const human = useTurnstile();

  useEffect(() => setWeek(currentWeek(clubToday())), []);

  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const setGames = (i: number, side: 0 | 1) => (e: { target: { value: string } }) =>
    setSets((s) => s.map((pair, j) => (j === i ? ((side === 0 ? [e.target.value, pair[1]] : [pair[0], e.target.value]) as [string, string]) : pair)));

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.team.trim() || !form.opponent.trim()) { setError("Both team names are needed, as they appear on the schedule."); return; }
    const parsed = sets.map(([a, b]) => [Number(a), Number(b)]);
    if (sets.some(([a, b]) => a.trim() === "" || b.trim() === "") || parsed.some(([a, b]) => !Number.isInteger(a) || !Number.isInteger(b))) {
      setError("All three sets are needed: games to you, then games to them.");
      return;
    }
    if (!form.name.trim() || !form.email.trim()) { setError("Your name and an email are needed, so we can check a score with you."); return; }
    if (!human.ready) {
      setError("One moment: we are still checking this came from a person. Try again in a second.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/league/score", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...human.headers() },
        body: JSON.stringify({ ...form, week: week ?? 1, sets: parsed }),
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
      <Seo title={`Report a score | ${LEAGUE_NAME} | Foundry Padel`} description={`Report a ${LEAGUE_NAME} match result: the week, both teams and the three set scores.`} path="/league/score" />
      <Head><meta name="robots" content="noindex, nofollow" /></Head>
      <section className="px-6 pb-20 pt-32">
        <div className="mx-auto max-w-2xl">
          <p className="font-body text-xs tracking-[0.2em] uppercase text-primary">{LEAGUE_NAME}</p>
          <h1 className="mt-3 font-display text-5xl text-foreground sm:text-6xl">REPORT A SCORE</h1>
          <p className="mt-5 max-w-xl font-body text-base leading-relaxed text-secondary-foreground">
            Winners, this one is yours, the same day if you can. Three sets, games to your team first. {LEAGUE_HOST} puts it in the table on the <Link to="/league#table" className="text-primary hover:underline">league page</Link>.
          </p>

          {done ? (
            <div className="mt-12 border border-primary bg-secondary p-10 text-center">
              <CheckDraw className="mx-auto mb-6 h-14 w-14 text-foreground" />
              <p className="font-display text-3xl text-foreground">SCORE IN</p>
              <p className="mt-4 font-body text-base text-secondary-foreground">
                {done.won} {done.won === 1 ? "set" : "sets"} to {form.team.trim()}, {done.lost} to {form.opponent.trim()}. It reaches the table at the next update.
              </p>
              <button type="button" onClick={() => { setDone(null); setSets(EMPTY_SETS); setForm((f) => ({ ...f, opponent: "", notes: "" })); }} className="mt-8 border border-border px-8 py-3 font-display tracking-widest text-foreground transition-colors hover:border-primary">
                REPORT ANOTHER
              </button>
            </div>
          ) : (
            <form onSubmit={submit} className="mt-12 space-y-5" noValidate>
              <div>
                <label className={label} htmlFor="sc-week">Week</label>
                <select id="sc-week" className={field} value={week ?? 1} onChange={(e) => setWeek(Number(e.target.value))}>
                  {LEAGUE_CALENDAR.map((w) => <option key={w.week} value={w.week}>Week {w.week} · {w.label}</option>)}
                </select>
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <div><label className={label} htmlFor="sc-team">Your team</label><input id="sc-team" className={field} value={form.team} onChange={set("team")} autoComplete="off" placeholder="As it appears on the schedule" /></div>
                <div><label className={label} htmlFor="sc-opp">Their team</label><input id="sc-opp" className={field} value={form.opponent} onChange={set("opponent")} autoComplete="off" /></div>
              </div>

              <fieldset>
                <legend className={label}>The three sets, games to you then games to them</legend>
                <div className="grid gap-3 sm:grid-cols-3">
                  {sets.map((pair, i) => (
                    <div key={i} className="border border-border p-4">
                      <p className="font-body text-xs tracking-[0.15em] uppercase text-primary">Set {i + 1}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <input aria-label={`Set ${i + 1}, games to you`} className={`${field} text-center`} inputMode="numeric" value={pair[0]} onChange={setGames(i, 0)} placeholder="6" />
                        <span className="font-display text-xl text-muted-foreground">to</span>
                        <input aria-label={`Set ${i + 1}, games to them`} className={`${field} text-center`} inputMode="numeric" value={pair[1]} onChange={setGames(i, 1)} placeholder="4" />
                      </div>
                    </div>
                  ))}
                </div>
                <p className="mt-3 font-body text-xs leading-relaxed text-muted-foreground">A set ends 6-0 to 6-4, 7-5, or 7-6 on the tiebreak. Every set counts, so all three are played.</p>
              </fieldset>

              <div className="grid gap-5 sm:grid-cols-2">
                <div><label className={label} htmlFor="sc-name">Your name</label><input id="sc-name" className={field} value={form.name} onChange={set("name")} autoComplete="name" /></div>
                <div><label className={label} htmlFor="sc-email">Your email</label><input id="sc-email" type="email" className={field} value={form.email} onChange={set("email")} autoComplete="email" /></div>
              </div>
              <div><label className={label} htmlFor="sc-notes">Anything to add <span className="normal-case tracking-normal">(optional)</span></label><input id="sc-notes" className={field} value={form.notes} onChange={set("notes")} placeholder="Played in week 3 instead, a retirement, anything else" /></div>
              <div className="hidden" aria-hidden="true"><input tabIndex={-1} autoComplete="off" value={form.website} onChange={set("website")} /></div>

              {error && <p role="alert" className="font-body text-sm text-primary">{error}</p>}
              <div ref={human.ref} />
              <button type="submit" disabled={submitting} className="w-full bg-primary px-8 py-4 font-display text-lg tracking-widest text-primary-foreground transition-all hover:brightness-110 disabled:opacity-60">
                {submitting ? "SAVING" : "SEND THE SCORE"}
              </button>
              <p className="text-center font-body text-xs text-muted-foreground">
                Something not right? Email <a href={`mailto:${LEAGUE_EMAIL}`} className="whitespace-nowrap text-primary hover:underline">{LEAGUE_EMAIL}</a>.
              </p>
            </form>
          )}
        </div>
      </section>
    </main>
  );
};

export default LeagueScore;
