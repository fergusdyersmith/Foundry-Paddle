import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import {
  OPEN_CLOSES,
  OPEN_DATES_LABEL,
  OPEN_NAME,
  OPEN_PRIZE_POOL,
  OPEN_TIERS,
} from "@/constants/openTournament";
import {
  PREVIEW_DATE,
  PREVIEW_DATE_LABEL,
  PREVIEW_PRICE,
  PREVIEW_SESSION_CAPACITY,
} from "@/constants/previewEvening";
import { JUNIOR_COACH, JUNIOR_DAYS, JUNIOR_FREE_LINE, JUNIOR_SESSION_TIMES } from "@/constants/juniorClinic";

/**
 * The homepage's "coming up": the dated things the club is selling right now, soonest
 * first, each card gone the day after its own deadline. Reads the same constants as
 * /preview and /open, so prices and dates cannot drift, and works out in the browser
 * which day it is: a prerendered "N days left" would freeze the day the deploy ran.
 */
function todayInPortland(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles" }).format(new Date());
}

type Card = {
  key: string;
  to: string;
  eyebrow: string;
  title: string;
  body: React.ReactNode;
  cta: string;
};

const OpenPromo = () => {
  const [today, setToday] = useState<string | null>(null);
  useEffect(() => setToday(todayInPortland()), []);

  const cards: Card[] = [];

  // The junior clinic: the next scheduled day, until it has happened. Soonest of the
  // three, so it leads.
  const nextJunior = JUNIOR_DAYS.find((d) => today == null || d.date >= today);
  if (nextJunior) {
    cards.push({
      key: "juniors",
      to: "/juniors",
      eyebrow: `${nextJunior.label} · no school · junior padel clinic`,
      title: "Kids, come hit with Diego",
      body: (
        <>
          {JUNIOR_SESSION_TIMES.map((t) => `${t.ages} ${t.label}`).join(", ")}. Coached by Timbers legend {JUNIOR_COACH}, racket and balls included.{" "}
          <span className="text-foreground">{JUNIOR_FREE_LINE}</span>
        </>
      ),
      cta: "SIGN UP FREE",
    });
  }

  // The preview evening, until the day after it happens.
  if (today == null || today <= PREVIEW_DATE) {
    cards.push({
      key: "preview",
      to: "/preview",
      eyebrow: `${PREVIEW_DATE_LABEL} · 5 to 9 PM · neighborhood preview evening`,
      title: "Try it before everyone else does",
      body: (
        <>
          Two-hour sessions with our coaches, no experience needed. {PREVIEW_PRICE} covers a racket and balls, an Urban German brat and a drink.{" "}
          <span className="text-foreground">{PREVIEW_SESSION_CAPACITY} spots a session.</span>
        </>
      ),
      cta: `SAVE YOUR SPOT · ${PREVIEW_PRICE}`,
    });
  }

  // The Open, until registration closes.
  if (today == null || today < OPEN_CLOSES) {
    const early = today == null || today < OPEN_TIERS[1].from;
    const price = early ? OPEN_TIERS[0].price : OPEN_TIERS[1].price;
    const daysLeft = today
      ? Math.max(0, Math.round((Date.parse(OPEN_TIERS[1].from) - Date.parse(today)) / 86400000))
      : null;
    cards.push({
      key: "open",
      to: "/open",
      eyebrow: `${OPEN_DATES_LABEL} · two-day tournament · all levels`,
      title: OPEN_NAME,
      body: (
        <>
          Beginner, intermediate and advanced draws, {OPEN_PRIZE_POOL} in prizes, a shirt, a brat and a drink each day.{" "}
          <span className="text-foreground">
            {early
              ? `Early bird $${OPEN_TIERS[0].price} ends ${OPEN_TIERS[0].until}${daysLeft != null ? ` (${daysLeft} ${daysLeft === 1 ? "day" : "days"} left)` : ""}, then $${OPEN_TIERS[1].price}.`
              : `Registration closes ${OPEN_TIERS[1].until}.`}
          </span>
        </>
      ),
      cta: early ? `LOCK IN $${price}` : `REGISTER · $${price}`,
    });
  }

  if (cards.length === 0) return null;

  return (
    <section aria-label="Coming up at Foundry Padel" className="border-y border-primary/40 bg-primary/10 px-6 py-10">
      <div className="mx-auto max-w-5xl">
        <p className="mb-6 font-body text-xs tracking-[0.2em] uppercase text-muted-foreground">Coming up</p>
        <div className={`grid gap-6 ${cards.length === 2 ? "md:grid-cols-2" : cards.length >= 3 ? "md:grid-cols-3" : ""}`}>
          {cards.map((c) => (
            <div key={c.key} className="flex flex-col border border-primary/40 bg-background/40 p-6">
              <p className="font-body text-xs tracking-[0.2em] uppercase text-primary">{c.eyebrow}</p>
              <h2 className="mt-2 font-display text-2xl text-foreground sm:text-3xl">{c.title.toUpperCase()}</h2>
              <p className="mt-2 font-body text-sm leading-relaxed text-secondary-foreground">{c.body}</p>
              <div className="mt-6 flex flex-1 items-end">
                <Link
                  to={c.to}
                  className="inline-flex items-center gap-2 whitespace-nowrap bg-primary px-6 py-4 font-display text-sm tracking-widest text-primary-foreground shadow-[0_0_30px_-10px_hsl(var(--primary)/0.6)] transition-all hover:brightness-110 sm:px-8 sm:text-base"
                >
                  {c.cta} <ArrowRight size={18} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default OpenPromo;
