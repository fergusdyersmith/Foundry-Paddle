import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Head } from "vite-react-ssg";
import Seo from "@/components/Seo";
import CheckDraw from "@/components/motion/CheckDraw";
import { LEAGUE_CONFIRM_DAYS, LEAGUE_NAME } from "@/constants/league";

/**
 * Where the confirm-or-dispute link in the "confirm the score" email lands. The link
 * carries a ref and a signed token (server/league.js); this page shows the score that
 * token is for, and one button records the answer. Nothing happens on arrival alone,
 * so a mail scanner that opens the link changes nothing. Noindex, not in the sitemap.
 */

const LEAGUE_EMAIL = "portland@foundrypadel.com";
type Row = { week: string; team: string; opponent: string; sets: string; won: string; lost: string; status: string; ref: string };

const LeagueConfirm = () => {
  const [query, setQuery] = useState<{ ref: string; t: string; a: "confirm" | "dispute" } | null>(null);
  const [row, setRow] = useState<Row | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ action: string; already: boolean } | null>(null);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const a = q.get("a") === "dispute" ? "dispute" : "confirm";
    const ref = (q.get("ref") || "").toUpperCase(), t = q.get("t") || "";
    if (!ref || !t) { setError("That link is missing its key. Use the one from the email."); return; }
    setQuery({ ref, t, a });
    fetch(`/api/league/confirm?ref=${encodeURIComponent(ref)}&t=${encodeURIComponent(t)}&a=${a}`)
      .then(async (r) => ({ ok: r.ok, json: await r.json().catch(() => ({})) }))
      .then(({ ok, json }) => { if (!ok) setError(json.error || "That link is not valid."); else setRow(json.row); })
      .catch(() => setError("We could not reach the club. Please try again."));
  }, []);

  async function answer() {
    if (!query) return;
    setBusy(true); setError(null);
    try {
      const res = await fetch("/api/league/confirm", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(query) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) { setError(json.error || "Something went wrong. Please try again."); return; }
      setDone({ action: json.action, already: Boolean(json.already) });
    } catch {
      setError("We could not reach the club. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const settled = row && /^(confirmed|DISPUTED)/.test(row.status);
  const dispute = query?.a === "dispute";

  return (
    <main className="bg-background min-h-screen">
      <Seo title={`Confirm a score | ${LEAGUE_NAME} | Foundry Padel`} description={`Confirm or dispute a ${LEAGUE_NAME} match result.`} path="/league/confirm" />
      <Head><meta name="robots" content="noindex, nofollow" /></Head>
      <section className="px-6 pb-20 pt-32">
        <div className="mx-auto max-w-2xl">
          <p className="font-body text-xs tracking-[0.2em] uppercase text-primary">{LEAGUE_NAME}</p>
          <h1 className="mt-3 font-display text-5xl text-foreground sm:text-6xl">{dispute ? "NOT RIGHT?" : "CONFIRM THE SCORE"}</h1>

          {done ? (
            <div className="mt-12 border border-primary bg-secondary p-10 text-center">
              <CheckDraw className="mx-auto mb-6 h-14 w-14 text-foreground" />
              <p className="font-display text-3xl text-foreground">{done.action === "confirm" ? "CONFIRMED" : "NOTED"}</p>
              <p className="mt-4 font-body text-base text-secondary-foreground">
                {done.already
                  ? "This score had already been answered, so nothing changed."
                  : done.action === "confirm"
                    ? "Thanks. It goes into the table at the next update."
                    : `Thanks. Foundry will check with both teams and fix the row. Email ${LEAGUE_EMAIL} with what you have, the scores you remember or a photo of the Playtomic match.`}
              </p>
              <Link to="/league#table" className="mt-8 inline-block border border-border px-8 py-3 font-display tracking-widest text-foreground transition-colors hover:border-primary">THE TABLE</Link>
            </div>
          ) : error ? (
            <p role="alert" className="mt-8 font-body text-base text-primary">{error}</p>
          ) : !row ? (
            <p className="mt-8 font-body text-base text-secondary-foreground">One moment.</p>
          ) : (
            <div className="mt-10 border border-border bg-secondary p-8">
              <p className="font-body text-xs tracking-[0.15em] uppercase text-primary">Week {row.week}, as reported by {row.team}</p>
              <p className="mt-3 font-display text-3xl text-foreground">{row.team} {row.won}, {row.opponent} {row.lost}</p>
              <p className="mt-2 font-body text-base text-secondary-foreground">Sets {row.sets}, games to {row.team} first.</p>
              {settled ? (
                <p className="mt-6 font-body text-sm text-muted-foreground">This score is already marked "{row.status}". Nothing more to do.</p>
              ) : (
                <>
                  <p className="mt-6 font-body text-sm leading-relaxed text-secondary-foreground">
                    {dispute
                      ? "Press the button and Foundry will sort it out with both teams. Nothing goes into the table until then."
                      : `One press and it goes into the table. If neither of you answers within ${LEAGUE_CONFIRM_DAYS} days the score stands as reported.`}
                  </p>
                  <button type="button" onClick={answer} disabled={busy} className="mt-6 w-full bg-primary px-8 py-4 font-display text-lg tracking-widest text-primary-foreground transition-all hover:brightness-110 disabled:opacity-60">
                    {busy ? "SAVING" : dispute ? "THIS SCORE IS NOT RIGHT" : "YES, THAT IS THE SCORE"}
                  </button>
                  <p className="mt-4 text-center font-body text-xs text-muted-foreground">
                    {dispute ? "Actually fine? Use the confirm link in the email instead." : "Not right? Use the other link in the email, or write to "}
                    {!dispute && <a href={`mailto:${LEAGUE_EMAIL}`} className="whitespace-nowrap text-primary hover:underline">{LEAGUE_EMAIL}</a>}
                  </p>
                </>
              )}
            </div>
          )}
        </div>
      </section>
    </main>
  );
};

export default LeagueConfirm;
