import { useEffect, useState } from "react";
import { updatedLabel } from "@/lib/updatedLabel";

/**
 * Who is in: the Open's paid entries by level, and the league's teams by league and level
 * (Kelly, 20 Oct). Chris Seibel wanted to see who had signed up, and the list of who is
 * still looking for a partner is the part people can act on, so it is the group that
 * stands out.
 *
 * Kumi builds both lists and the site's server checks them again (server/entries.js):
 * first names and last initials only, levels as bands, never a rating. Nothing renders
 * until the list arrives, and nothing at all when Kumi has no list: an empty section
 * would read as "nobody has entered".
 */

const sectionHeading = "font-display text-4xl sm:text-5xl text-foreground";
const CLUB_EMAIL = "portland@foundrypadel.com";

type OpenLevel = { key: string; label: string; count: number; pairs: string[][]; partner_pending: string[]; looking: string[] };
type OpenEntries = { available: boolean; updated_at: string | null; total: number; levels: OpenLevel[] };
type LeagueTeam = { name: string | null; players: string[] };
type LeagueLevel = { key: string; label: string; teams: LeagueTeam[]; looking: string[] };
type LeagueGroup = { key: string; label: string; levels: LeagueLevel[] };
type LeagueEntries = { available: boolean; updated_at: string | null; total_teams: number; leagues: LeagueGroup[] };

function useEntries<T extends { available: boolean }>(url: string): T | null {
  const [data, setData] = useState<T | null>(null);
  useEffect(() => {
    let live = true;
    fetch(url)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { if (live && j && j.available) setData(j as T); })
      .catch(() => {});
    return () => { live = false; };
  }, [url]);
  return data;
}

const both = (names: string[]) => names.join(" and ");

function Names({ title, names, highlight = false }: { title: string; names: string[]; highlight?: boolean }) {
  if (!names.length) return null;
  return (
    <div className={highlight ? "mt-5 border border-primary p-4" : "mt-5"}>
      <h4 className={`font-body text-xs tracking-[0.2em] uppercase ${highlight ? "text-primary" : "text-muted-foreground"}`}>{title}</h4>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-body text-sm text-foreground">
        {names.map((n, i) => <li key={`${n}-${i}`}>{n}</li>)}
      </ul>
    </div>
  );
}

function SmallPrint({ updated }: { updated: string | null }) {
  return (
    <div className="mt-8 space-y-1 font-body text-xs text-muted-foreground">
      <p>
        First names and last initials only. Want to be left off? Email{" "}
        <a href={`mailto:${CLUB_EMAIL}`} className="text-primary hover:underline">{CLUB_EMAIL}</a>.
      </p>
      {updated && <p>{updated}</p>}
    </div>
  );
}

/** The Open: paid entries by level, above the draws. */
export function OpenWhosIn({ url = "/api/open/entries" }: { url?: string }) {
  const data = useEntries<OpenEntries>(url);
  if (!data || !(data.total > 0) || !data.levels.length) return null;
  return (
    <section id="whos-in" className="scroll-mt-24 px-6 pb-20" aria-labelledby="whos-in-heading">
      <div className="mx-auto max-w-5xl">
        <div className="section-divider mb-16" />
        <h2 id="whos-in-heading" className={sectionHeading}>WHO'S IN SO FAR</h2>
        <p className="mt-4 max-w-xl font-body text-base leading-relaxed text-secondary-foreground">
          Paid entries by level, updated every 15 minutes. Know someone looking for a partner? Ask them to team up, or enter alone and we pair you by level.
        </p>
        <p className="mt-2 font-body text-sm text-foreground">{data.total} {data.total === 1 ? "player" : "players"} in</p>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {data.levels.map((l) => (
            <div key={l.key} className="border border-border bg-secondary p-6">
              <div className="flex items-baseline justify-between gap-4">
                <h3 className="font-display text-3xl text-foreground">{l.label.toUpperCase()}</h3>
                <span className="font-body text-xs tracking-[0.2em] uppercase text-primary">{l.count} in</span>
              </div>
              {l.pairs.length > 0 && (
                <div className="mt-5">
                  <h4 className="font-body text-xs tracking-[0.2em] uppercase text-muted-foreground">Pairs</h4>
                  <ul className="mt-2 space-y-1 font-body text-sm text-foreground">
                    {l.pairs.map((p, i) => <li key={i}>{both(p)}</li>)}
                  </ul>
                </div>
              )}
              <Names title="Partner to be confirmed" names={l.partner_pending} />
              <Names title="Looking for a partner" names={l.looking} highlight />
            </div>
          ))}
        </div>
        <SmallPrint updated={updatedLabel(data.updated_at)} />
      </div>
    </section>
  );
}

/** The league: every team signed up, by league and level. */
export function LeagueTeams({ closesLabel, closed, url = "/api/league/entries" }: { closesLabel: string; closed: boolean; url?: string }) {
  const data = useEntries<LeagueEntries>(url);
  if (!data || !(data.total_teams > 0) || !data.leagues.length) return null;
  return (
    <section id="teams" className="scroll-mt-24 px-6 pb-20" aria-labelledby="teams-heading">
      <div className="mx-auto max-w-5xl">
        <div className="section-divider mb-16" />
        <h2 id="teams-heading" className={sectionHeading}>TEAMS SO FAR</h2>
        <p className="mt-4 max-w-xl font-body text-base leading-relaxed text-secondary-foreground">
          {closed
            ? "Every team in this season, by league and level."
            : `Every team signed up so far, by league and level. Signups close ${closesLabel}. Know someone looking for a partner? Sign up together, or sign up alone and we pair you by level.`}
        </p>
        <p className="mt-2 font-body text-sm text-foreground">{data.total_teams} {data.total_teams === 1 ? "team" : "teams"}</p>
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {data.leagues.map((g) => (
            <div key={g.key} className="border border-border bg-secondary p-6">
              <h3 className="font-display text-3xl text-foreground">{g.label.toUpperCase()}</h3>
              {g.levels.map((l) => (
                <div key={l.key} className="mt-6 border-t border-border pt-4">
                  <div className="flex items-baseline justify-between gap-4">
                    <h4 className="font-body text-xs tracking-[0.2em] uppercase text-primary">{l.label}</h4>
                    <span className="font-body text-xs text-muted-foreground">{l.teams.length} {l.teams.length === 1 ? "team" : "teams"}</span>
                  </div>
                  {l.teams.length > 0 && (
                    <ul className="mt-2 space-y-1 font-body text-sm text-foreground">
                      {l.teams.map((t, i) => (
                        <li key={i}>{t.name ? <><span className="font-semibold">{t.name}</span>: {both(t.players)}</> : both(t.players)}</li>
                      ))}
                    </ul>
                  )}
                  <Names title="Looking for a partner" names={l.looking} highlight />
                </div>
              ))}
            </div>
          ))}
        </div>
        <SmallPrint updated={updatedLabel(data.updated_at)} />
      </div>
    </section>
  );
}
