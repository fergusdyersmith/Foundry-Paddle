import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { AlertTriangle, ArrowRight, Clock, Users } from "lucide-react";
import Seo from "@/components/Seo";
import { PLAYTOMIC_TENANT_URL } from "@/constants/booking";
import {
  DAY_NAMES,
  type MatchSlot,
  type MatchSlotFeed,
  hourLabel,
  hourRange,
  hourTick,
  intensity,
  percent,
  rankSlots,
  slotLabel,
  slotMap,
  verdict,
} from "@/lib/matchSlots";

/** "Find players" — the on-ramp to Kumi's free matchmaking, plus the two things a player
 *  needs before they will actually post a match: WHEN it is worth posting, and HOW to
 *  post one that other people can see.
 *
 *  The timing half is real measurement, not a guess. Kumi reconstructs every open match
 *  Foundry has had over the last 120 days from the Playtomic poller's own state log and
 *  works out how often each weekday-and-hour slot filled. Roughly two thirds do; the
 *  spread across slots is wide enough to be worth knowing about, and nothing anywhere
 *  else told anyone.
 */

/** /join is NOT a React route.
 *
 *  server.js reverse-proxies it to Kumi's own sign-up page (the WhatsApp QR), so it only
 *  exists server-side. A react-router <Link> would navigate client-side, match nothing,
 *  and render NotFound — the CTA 404s on click while a pasted URL works, which is exactly
 *  how it shipped past a direct-load check on 2026-09-13.
 *
 *  Every link here must be a plain <a>, so the browser does a real navigation. */
const JOIN_PATH = "/join";


function useMatchSlots() {
  return useQuery<MatchSlotFeed>({
    queryKey: ["match-slots"],
    queryFn: async () => {
      const res = await fetch("/api/coaching/match-slots");
      if (!res.ok) throw new Error("Failed to load match timing");
      return res.json();
    },
    // Recomputed once a night upstream, so re-fetching on every focus is pure noise.
    staleTime: 60 * 60_000,
    refetchOnWindowFocus: false,
  });
}

function SlotRow({ slot, baseline, all }: { slot: MatchSlot; baseline: number | null; all: MatchSlot[] }) {
  const pct = percent(slot.fill_rate);
  return (
    <div className="flex items-center gap-4 border-b border-border/60 py-3 last:border-b-0">
      <div className="w-28 shrink-0 font-display text-base tracking-wide text-foreground">
        {slotLabel(slot)}
      </div>
      <div className="h-2 flex-1 bg-muted">
        <div
          className="h-full bg-primary"
          style={{ width: `${Math.max(4, 10 + intensity(slot.fill_rate, all) * 90)}%` }}
        />
      </div>
      <div className="w-10 shrink-0 text-right font-display text-base text-foreground">{pct}%</div>
      {/* The sample size is not a footnote. A rate without its n is how "27%" off a
          dozen matches turns into a fact somebody repeats at the desk. */}
      <div className="hidden w-40 shrink-0 text-right font-body text-[11px] text-muted-foreground sm:block">
        {slot.matches} matches · {verdict(slot.fill_rate, baseline).toLowerCase()}
      </div>
    </div>
  );
}

function Heatmap({ slots, baseline }: { slots: MatchSlot[]; baseline: number | null }) {
  const hours = hourRange(slots);
  const lookup = slotMap(slots);

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-separate border-spacing-[2px] text-center">
        <thead>
          <tr>
            <th className="w-10" />
            {hours.map((h) => (
              <th
                key={h}
                className="pb-1 font-body text-[10px] font-normal tracking-wider text-muted-foreground"
              >
                {hourTick(h)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {DAY_NAMES.map((day, wd) => (
            <tr key={day}>
              <th className="pr-2 text-right font-body text-[10px] font-normal tracking-wider text-muted-foreground">
                {day}
              </th>
              {hours.map((h) => {
                const slot = lookup.get(`${wd}-${h}`);
                if (!slot) {
                  // Kumi withheld this one: too few matches to say anything. An empty
                  // cell, never a 0% — the club is not bad at Sunday 6am, it has simply
                  // never tried it.
                  return (
                    <td
                      key={h}
                      title={`${DAY_NAMES[wd]} ${hourLabel(h)}: not enough matches yet`}
                      className="h-7 border border-border/30 bg-transparent"
                    />
                  );
                }
                const pct = percent(slot.fill_rate);
                return (
                  <td
                    key={h}
                    title={`${slotLabel(slot)}: ${pct}% of open matches fill, from ${slot.matches} matches`}
                    className="h-7 font-body text-[10px] text-primary-foreground"
                    style={{
                      backgroundColor: `hsl(var(--primary) / ${0.14 + intensity(slot.fill_rate, slots) * 0.86})`,
                    }}
                  >
                    {pct}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-3 font-body text-[11px] text-muted-foreground">
        Each cell is the share of open matches at that time that filled. Empty cells are
        times we do not have enough matches to judge. Hover for the sample size.
        {baseline !== null && <> Club average: {percent(baseline)}%.</>}
      </p>
    </div>
  );
}

const FindPlayers = () => {
  const { data, isLoading, isError } = useMatchSlots();

  const slots = data?.slots ?? [];
  const ranked = rankSlots(slots);
  const baseline = data?.club_fill_rate ?? null;
  // Only hide the tool when we genuinely have nothing. A slow upstream shows the
  // loading state; a failed one shows the rest of the page, which still does its job.
  const showTool = !isError && (isLoading || slots.length > 0);

  return (
    <main className="min-h-screen bg-background pt-24">
      <Seo
        title="Find Padel Players in Portland | Foundry Padel"
        description="Free matchmaking at Foundry Padel: get open matches at your level texted to you, and see which times actually fill before you post one."
        path="/find-players"
      />

      {/* Hero */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-4xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="mb-4 font-display text-6xl text-foreground sm:text-8xl">FIND PLAYERS</h1>
            <div className="mb-6 flex items-center justify-center gap-4">
              <div className="h-px w-16 bg-primary" />
              <span className="font-body text-sm uppercase tracking-[0.2em] text-primary">
                Free · Never Play Alone
              </span>
              <div className="h-px w-16 bg-primary" />
            </div>
            <p className="mx-auto max-w-xl font-body text-base text-secondary-foreground">
              Tell us your level and when you play. We will message you open matches that
              fit, so you stop refreshing the app hoping something turns up.
            </p>
            <a
              href={JOIN_PATH}
              className="mt-10 inline-flex items-center gap-3 bg-primary px-10 py-4 font-display text-lg tracking-widest text-primary-foreground transition-all hover:brightness-110"
            >
              GET MATCHES SENT TO ME
              <ArrowRight size={20} />
            </a>
            <p className="mt-4 font-body text-xs text-muted-foreground">
              Takes about a minute. Free, and you can stop them any time.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Best times */}
      {showTool && (
        <section className="px-6 py-8">
          <div className="mx-auto max-w-4xl">
            <div className="section-divider mb-12" />
            <h2 className="mb-3 font-display text-4xl text-foreground sm:text-5xl">
              BEST TIMES TO POST A MATCH
            </h2>
            <p className="mb-10 max-w-2xl font-body text-base text-secondary-foreground">
              Booked a court and need players? Some times fill far more reliably than
              others. This is measured from every open match at Foundry over the last{" "}
              {data?.window_days ?? 120} days, not guessed.
            </p>

            {isLoading && (
              <p className="font-body text-sm text-muted-foreground">Loading match history…</p>
            )}

            {!isLoading && ranked.length > 0 && (
              <>
                <div className="mb-12 border border-border bg-card p-6 sm:p-8">
                  <h3 className="mb-1 flex items-center gap-2 font-display text-2xl tracking-wide text-foreground">
                    <Clock size={20} className="text-primary" />
                    MOST LIKELY TO FILL
                  </h3>
                  <p className="mb-5 font-body text-xs text-muted-foreground">
                    Ranked by how often an open match at that time reached four players.
                  </p>
                  {ranked.slice(0, 8).map((slot) => (
                    <SlotRow
                      key={`${slot.weekday}-${slot.hour}`}
                      slot={slot}
                      baseline={baseline}
                      all={slots}
                    />
                  ))}
                </div>

                {ranked.length > 8 && (
                  <div className="mb-12 border border-border bg-card p-6 sm:p-8">
                    <h3 className="mb-1 flex items-center gap-2 font-display text-2xl tracking-wide text-foreground">
                      <AlertTriangle size={20} className="text-muted-foreground" />
                      HARDEST TO FILL
                    </h3>
                    <p className="mb-5 font-body text-xs text-muted-foreground">
                      Still worth posting, and most of these fill too. Just give them
                      longer, and tell the{" "}
                      {/* Linked, because "tell the WhatsApp group" is useless advice to
                          somebody who is not in it and has no idea it exists. */}
                      <Link
                        to="/community"
                        className="text-primary underline underline-offset-2"
                      >
                        WhatsApp group
                      </Link>
                      {"."}
                    </p>
                    {ranked
                      .slice(-4)
                      .reverse()
                      .map((slot) => (
                        <SlotRow
                          key={`${slot.weekday}-${slot.hour}`}
                          slot={slot}
                          baseline={baseline}
                          all={slots}
                        />
                      ))}
                  </div>
                )}

                {/* The grid is context, the ranking above is the product. Phones get
                    the ranking only — a 7-by-16 table at 400px is unreadable. */}
                <div className="hidden border border-border bg-card p-6 sm:block sm:p-8">
                  <h3 className="mb-5 font-display text-2xl tracking-wide text-foreground">
                    THE WHOLE WEEK
                  </h3>
                  <Heatmap slots={slots} baseline={baseline} />
                </div>

                <p className="mt-6 font-body text-[11px] leading-relaxed text-muted-foreground">
                  Based on {data?.sample_matches ?? 0} open matches at Foundry over the
                  last {data?.window_days ?? 120} days
                  {baseline !== null && <>, of which {percent(baseline)}% filled</>}. Times
                  with fewer than {data?.min_sample ?? 4} matches are left out rather than
                  guessed at, and the rest are adjusted toward the club average in
                  proportion to how few matches they are based on, so a time with six
                  matches behind it is not presented as confidently as one with twenty-six.
                  Updated nightly.
                </p>
              </>
            )}
          </div>
        </section>
      )}

      {/* How to post one */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-3xl">
          <div className="section-divider mb-12" />
          <h2 className="mb-3 font-display text-4xl text-foreground sm:text-5xl">
            HOW TO POST AN OPEN MATCH
          </h2>
          <p className="mb-10 font-body text-base text-secondary-foreground">
            An open match is a booking other players can see and join. It is the fastest
            way to fill a court, and it is what we send out to everyone signed up for
            matches.
          </p>

          {/* THESE STEPS ARE THE CLUB'S OWN VERIFIED KNOWLEDGE, not Playtomic's generic
              help pages. Foundry's route in is the Open Matches tab, and the control is
              buried below the time slots — which is exactly why a how-to is needed. The
              source row is club_knowledge #15 (verified). If the app changes, fix that
              row first: it feeds the chatbot and the phone agent too, and this page
              should follow it rather than drift into a third version. */}
          <ol className="space-y-6">
            {[
              {
                t: "Set your Playtomic level first",
                d: "Playtomic will not let you reserve a spot without one, and it is a quick self-assessment in the app. If you skip it your level shows as a question mark and you cannot be matched into level-appropriate matches.",
              },
              {
                t: "Open the club in Playtomic and go to the Open Matches tab",
                d: "Not the court booking tab. Open Matches is where hosting starts, and it is the step most people miss.",
              },
              {
                t: "Pick a time with no match yet, then scroll down",
                d: "Past the time slots there is a \u201cReserve a place in a match\u201d section. It is below the fold, which is the single most common reason people give up here.",
              },
              {
                t: "Tap \u201c+ Reserve the first spot\u201d and check out",
                d: "You are now the host, and whoever reserves first sets the match type and the level range for everyone else. Those two choices decide whether it fills, so the next step is worth thirty seconds.",
              },
              {
                // HARDCODED, unlike the chart above, which is recomputed nightly. Measured
                // 2026-09-13 over the same 120-day window: level range wider than 1.0 vs
                // 1.0 or narrower, 592 matches,
                // p=0.00001, and it holds within busy slots and quiet ones separately, so
                // it is not just a proxy for wide ranges happening at good times.
                //
                // NOT claimed: that casual outperforms competitive. We only know the
                // match type for 195 matches, and those fill at 96% against a 65%
                // population, so that subsample is far too biased to publish from. What
                // is said about casual below is Playtomic's documented behaviour (the
                // level range does not gate a friendly match), offered as the reason the
                // measured range effect applies, not as a second measurement.
                t: "Choose the match type deliberately",
                d: "This is the biggest lever you have after the time itself. Open matches with a level range wider than one point fill 76% of the time; narrower ones fill 59%, and that gap holds at busy and quiet times alike. Casual drops the level restriction altogether, so anyone can join whatever their level, and nobody's level changes from the result. Competitive holds people to your range and moves everyone's level on the result. If filling the court matters more than the ranking points, pick casual or widen your range. You cannot switch between the two afterwards.",
              },
              {
                t: "Then leave it alone",
                d: "It is now visible to every Playtomic player, and we push open matches into the club WhatsApp group as well. Most fill within a day; quieter slots can take two or three, so post early rather than often.",
              },
            ].map((step, i) => (
              <li key={step.t} className="flex gap-5">
                <span className="shrink-0 font-display text-3xl leading-none text-primary">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <h3 className="mb-1 font-display text-xl tracking-wide text-foreground">
                    {step.t.toUpperCase()}
                  </h3>
                  <p className="font-body text-sm leading-relaxed text-secondary-foreground">
                    {step.d}
                  </p>
                </div>
              </li>
            ))}
          </ol>

          <div className="mt-10 border border-border bg-card p-6">
            <h3 className="mb-2 font-display text-lg tracking-wide text-foreground">
              ALREADY BOOKED A PRIVATE COURT?
            </h3>
            <p className="font-body text-sm leading-relaxed text-secondary-foreground">
              You do not have to rebook. Open the match in Playtomic and make it public
              (the button reads <span className="text-foreground">Make Public</span>, or{" "}
              <span className="text-foreground">Convert to Public Match</span> depending on
              your app version). It is free, and once it is public it gets posted
              automatically into the club WhatsApp group as well.
            </p>
            <p className="mt-3 font-body text-xs text-muted-foreground">
              It will not offer the option if the match is already full, or if anyone on
              the booking paid at the club or in cash.
            </p>
          </div>

          <div className="mt-10 flex flex-wrap gap-4">
            <a
              href={PLAYTOMIC_TENANT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block border border-primary px-8 py-3 font-display text-base tracking-widest text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
            >
              OPEN PLAYTOMIC
            </a>
            <Link
              to="/community"
              className="inline-block border border-border px-8 py-3 font-display text-base tracking-widest text-foreground transition-colors hover:border-primary"
            >
              THE WHATSAPP GROUP
            </Link>
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="px-6 pb-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-3xl border border-primary/40 p-8 text-center sm:p-12"
        >
          <Users size={28} className="mx-auto mb-4 text-primary" />
          <h2 className="mb-4 font-display text-3xl text-foreground sm:text-4xl">
            OR LET THE MATCHES COME TO YOU
          </h2>
          <p className="mx-auto mb-8 max-w-lg font-body text-base text-secondary-foreground">
            You do not have to post anything at all. Tell us your level and the times you
            play, and we will message you when an open match needs someone like you.
          </p>
          <a
            href={JOIN_PATH}
            className="inline-block bg-primary px-10 py-4 font-display text-lg tracking-widest text-primary-foreground transition-all hover:brightness-110"
          >
            SIGN ME UP
          </a>
        </motion.div>
      </section>
    </main>
  );
};

export default FindPlayers;
