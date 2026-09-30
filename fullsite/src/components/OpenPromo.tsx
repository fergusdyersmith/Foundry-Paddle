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

/**
 * The homepage's push to /open while registration is open. Reads the same constants
 * as the page, so the price and the dates cannot drift, and works out in the browser
 * which tier applies today: a prerendered "early bird ends in N days" would freeze the
 * day the deploy ran. Renders nothing once registration has closed.
 */
function todayInPortland(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles" }).format(new Date());
}

const OpenPromo = () => {
  const [today, setToday] = useState<string | null>(null);
  useEffect(() => setToday(todayInPortland()), []);

  const closed = today != null && today >= OPEN_CLOSES;
  if (closed) return null;

  const early = today == null || today < OPEN_TIERS[1].from;
  const price = early ? OPEN_TIERS[0].price : OPEN_TIERS[1].price;
  const daysLeft = today
    ? Math.max(0, Math.round((Date.parse(OPEN_TIERS[1].from) - Date.parse(today)) / 86400000))
    : null;

  return (
    <section aria-label={OPEN_NAME} className="border-y border-primary/40 bg-primary/10 px-6 py-8">
      <div className="mx-auto flex max-w-5xl flex-col items-start justify-between gap-6 md:flex-row md:items-center">
        <div>
          <p className="font-body text-xs tracking-[0.2em] uppercase text-primary">
            {OPEN_DATES_LABEL} · two-day tournament · all levels
          </p>
          <h2 className="mt-2 font-display text-3xl text-foreground sm:text-4xl">{OPEN_NAME.toUpperCase()}</h2>
          <p className="mt-2 max-w-xl font-body text-sm leading-relaxed text-secondary-foreground">
            Beginner, intermediate and advanced draws, {OPEN_PRIZE_POOL} in prizes, a shirt, a brat and a drink each day.
            {early ? (
              <>
                {" "}
                <span className="text-foreground">
                  Early bird ${OPEN_TIERS[0].price} ends {OPEN_TIERS[0].until}
                  {daysLeft != null ? ` (${daysLeft} ${daysLeft === 1 ? "day" : "days"} left)` : ""}, then ${OPEN_TIERS[1].price}.
                </span>
              </>
            ) : (
              <> Registration closes {OPEN_TIERS[1].until}.</>
            )}
          </p>
        </div>
        <Link
          to="/open"
          className="inline-flex shrink-0 items-center gap-2 bg-primary px-8 py-4 font-display text-base tracking-widest text-primary-foreground shadow-[0_0_30px_-10px_hsl(var(--primary)/0.6)] transition-all hover:brightness-110"
        >
          {early ? `LOCK IN $${price}` : `REGISTER · $${price}`} <ArrowRight size={18} />
        </Link>
      </div>
    </section>
  );
};

export default OpenPromo;
