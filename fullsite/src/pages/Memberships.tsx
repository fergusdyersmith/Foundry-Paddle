import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Check, Star } from "lucide-react";
import BookCTA from "@/components/BookCTA";
import FoundingMemberBar from "@/components/FoundingMemberBar";
import { PLAYTOMIC_MEMBERSHIP_URLS } from "@/constants/booking";
import { OFF_PEAK_LABELS, PEAK_LABELS } from "@/constants/memberPricing";
import { formatUsd, ratesOn, RATE_CHANGE_DATE } from "@shared/rates";
import StayInTouchForm from "@/components/StayInTouchForm";
import Seo from "@/components/Seo";

// The t-shirt lives here rather than in each tier's list: it was the same line repeated
// three times, which is what this section is for.
const sharedBenefits = [
  "24 hour Elevation Lounge and gym access",
  "Members Only events",
  "Special Founding Member Foundry Padel t-shirt",
  "10% Discount on In-Store Merchandise",
  "Free Stuff: when we get free stuff, you get free stuff!",
];

// Peak / off-peak. Every tier above is priced against these windows, so they are stated
// on the page rather than left to the booking system — and they now come from
// constants/memberPricing.ts, which the schedule reads too when it works out what a
// member pays for a session. One definition, so the page and the arithmetic agree.
const peakWindows = { offPeak: OFF_PEAK_LABELS, peak: PEAK_LABELS };

// Published pay-as-you-go rates. Members are measured against these, and a
// member's monthly credit is spent at exactly these prices, so the page has to
// carry them rather than send people to /book to work it out.
// A 90-minute court is $90 for up to four, which is exactly the $22.50 per-player rate
// times four. That has to keep holding: a visitor divides one by the other, and when it
// did not (a $60 court against a $22.50 spot) the page said a spot cost half as much as
// a spot.
//
// The 60 and 120 minute prices are EXTRAPOLATED from $90/90min, i.e. a flat $60/hour.
// Only the 90-minute price was given. Leaving the old $40 and $80 would have made two
// hours ($80) cheaper than ninety minutes ($90), so they could not stay as they were.
const rateCard = [
  { item: "Court, 60 minutes", price: "$60", note: "Up to 4 players" },
  { item: "Court, 90 minutes", price: "$90", note: "Up to 4 players" },
  { item: "Court, 120 minutes", price: "$120", note: "Up to 4 players" },
  // From shared/rates.js, asked for the day this table is labelled with rather than for
  // today: the card states the NEW rates, and the schedule prices open matches off the
  // same figure, so the two cannot drift.
  {
    item: "Per player, 90 minutes",
    price: formatUsd(ratesOn(RATE_CHANGE_DATE).perPlayer90),
    note: "Join an open match, no partner needed",
  },
  { item: "Racket rental", price: "$5", note: "Standard club racket" },
  { item: "Premium demo racket", price: "$10", note: "Current-season demo stock" },
  { item: "Guest of a member", price: "$22.50", note: "Member guest passes cover this" },
];

// The club opens 100 memberships in total. Only that total is published: the
// working internal split is ~50 student / 30 regular / 20 padelhead, but it is
// a planning assumption, not a commitment, and per-tier caps would box us in if
// demand lands differently. Corporate/partner seats sit outside the 100.
// Every tier gets unlimited off-peak play, because those courts sit empty and
// metering them costs more in complexity than it saves. The ladder is peak
// access instead: a percentage off peak courts, a monthly credit, and a longer
// booking window. That maps 1:1 onto what Playtomic configures once per
// membership and then never needs touching, which is the whole reason the
// structure looks like this.
//
// Clinics, tournaments and events split by TIME, not by product. The off-peak side is
// now the SAME on every tier (Jake, 2026-08-17): the ladder is the peak side only.
//                    peak                          off-peak
//   Student          standard price                tournaments 50% off,
//   Regular          $25 credit                    clinics and lessons 25% off,
//   Padelhead        $50 credit                    on all three tiers
//
// Playtomic can discount an activity, but only by hand-pricing each session, so every
// off-peak clinic on the schedule is a recurring manual job for staff.
//
// Worth knowing before that work is committed to: on the last 90 days of the class
// schedule, about 93% of clinic time is at PEAK. The off-peak discount therefore fires
// on roughly one session in fourteen (Tuesday and Thursday mornings) and the credit
// carries almost everything else. Moving clinics into the empty weekday mornings would
// change that, and is the thing that makes the manual work worth doing.
//
// Bullets are ordered peak first, then off-peak, then the benefits that apply at any
// hour, so the two halves of that table read as two blocks on the card.
//
// VALUE, not break-even. Break-even asked "how long until this is worth it", which
// reads as a warning; the same arithmetic run forwards is what a member actually gets
// back in a month. Every figure below is COMPUTED from the constants, never typed in,
// because the last set of hand-written value figures went stale and inverted.
//
// Counted, at the $22.50 per-player rate:
//   off-peak play   the whole rate, since it is free
//   peak play       only the DISCOUNT, since they still pay the rest
//   monthly credit  in full, received whether or not they play
//   guest pass      one session at the guest rate
//   t-shirt         one-off, counted in the first month
//
// Padelhead assumes MORE peak play than Regular, which is the tier's whole premise:
// at 2+2 it lands at $390, and it is sold to people who live at peak.
const SESSION_RATE = 22.5;         // per player, 90 minutes
const WEEKS_PER_MONTH = 52 / 12;   // 4.33, not 4 — the difference is a whole session
const GUEST_PASS_VALUE = 22.5;
const TSHIRT_VALUE = 25;

function monthlyValue(t: {
  offPeakPerWeek: number; peakPerWeek: number; peakDiscount: number; creditMonthly: number;
}): number {
  const offPeak = t.offPeakPerWeek * WEEKS_PER_MONTH * SESSION_RATE;
  const peak = t.peakPerWeek * WEEKS_PER_MONTH * SESSION_RATE * t.peakDiscount;
  return Math.round(offPeak + peak + t.creditMonthly + GUEST_PASS_VALUE + TSHIRT_VALUE);
}

const tiers = [
  {
    name: "STUDENT / LONGEVITY",
    buyUrl: PLAYTOMIC_MEMBERSHIP_URLS.student,
    price: "$100",
    period: "/mo",
    desc: "Play as much as you like, weekday daytime and weekend evenings.",
    offPeakPerWeek: 2, peakPerWeek: 0, peakDiscount: 0, creditMonthly: 0,
    playLine: "Playing twice a week, off-peak",
    features: [
      "For students, retirees, veterans and first responders",
      // Peak first, then off-peak, then the benefits that apply at any hour.
      "Peak courts, clinics and events at standard rates",
      "Unlimited free off-peak play (your spot on a court)",
      "Off-peak tournaments at 50% off",
      "Off-peak clinics and lessons at 25% off",
      "7-day booking window",
      "1 free guest pass/month (expires at month end)",
      "50% discount on padel rentals",
    ],
    highlight: false,
  },
  {
    name: "REGULAR",
    buyUrl: PLAYTOMIC_MEMBERSHIP_URLS.regular,
    price: "$150",
    period: "/mo",
    desc: "Unlimited off-peak, and a quarter off your share of every peak booking.",
    offPeakPerWeek: 2, peakPerWeek: 2, peakDiscount: 0.25, creditMonthly: 25,
    playLine: "Playing 2 off-peak + 2 peak a week",
    features: [
      "25% off your share of every peak court booking",
      "$25/month credit for peak clinics, tournaments and events",
      "Unlimited free off-peak play (your spot on a court)",
      "Off-peak tournaments at 50% off",
      "Off-peak clinics and lessons at 25% off",
      "10-day booking window",
      "1 free guest pass/month (expires at month end)",
      "50% discount on padel rentals",
    ],
    highlight: false,
  },
  {
    name: "PADELHEAD",
    buyUrl: PLAYTOMIC_MEMBERSHIP_URLS.padelhead,
    price: "$200",
    period: "/mo",
    desc: "For players playing 2 or more times per week.",
    offPeakPerWeek: 2, peakPerWeek: 3, peakDiscount: 0.5, creditMonthly: 50,
    playLine: "Playing 2 off-peak + 3 peak a week",
    features: [
      "50% off your share of every peak court booking",
      "$50/month credit for peak clinics, tournaments and events",
      "Unlimited free off-peak play (your spot on a court)",
      "Off-peak tournaments at 50% off",
      "Off-peak clinics and lessons at 25% off",
      "12-day booking window",
      "1 free guest pass/month (expires at month end)",
      "50% discount on padel rentals",
    ],
    highlight: true,
  },
];

const Memberships = () => {
  return (
    <main className="bg-background min-h-screen pt-24">
      <Seo
        title="Padel Memberships in Portland, From $100/mo | Foundry Padel"
        description="Foundry Padel memberships from $100/mo, limited to 100 founding members: unlimited off-peak play, up to 50% off your share of peak courts, monthly credit for clinics and tournaments, and a longer booking window."
        path="/memberships"
      />
      {/* Hero */}
      <section className="py-20 px-6">
        <div className="mx-auto max-w-4xl text-center">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
            {/* MEMBERSHIPS is the longest single-word heading on the site and has no
                space to wrap at, so a fixed text-6xl overflows narrow phones. Every
                other hero either wraps (BOOK A COURT, SKILL SURVEY) or is short
                enough (FAQ, CONTACT), which is why this one page differs. */}
            <h1 className="font-display text-[clamp(2.25rem,11vw,3.75rem)] leading-none sm:text-8xl text-foreground mb-4">MEMBERSHIPS</h1>
            <div className="flex items-center justify-center gap-4 mb-6">
              <div className="h-px w-16 bg-primary" />
              <span className="font-body text-sm tracking-[0.2em] uppercase text-primary">Find Your Level</span>
              <div className="h-px w-16 bg-primary" />
            </div>
            <p className="font-body text-base text-secondary-foreground max-w-xl mx-auto">
              From casual play to unlimited access, find the membership that fits your game.
            </p>
            <p className="font-body text-sm tracking-[0.15em] uppercase text-primary mt-6">
              Limited to 100 founding memberships
            </p>
            {/* The line above has always been a claim with nothing behind it. The bar is
                the live count from the club's own roster, so the scarcity is checkable
                and goes stale on its own if sales stop. */}
            <FoundingMemberBar />
          </motion.div>
        </div>
      </section>

      {/* All Members Receive */}
      <section className="py-12 px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-5xl text-center"
        >
          <div className="flex items-center justify-center gap-4 mb-8">
            <div className="h-px w-12 bg-primary" />
            <h2 className="font-display text-2xl sm:text-3xl text-foreground">ALL MEMBERS RECEIVE</h2>
            <div className="h-px w-12 bg-primary" />
          </div>
          {/* Two columns, not three: at this count three columns leave an orphan on its
              own row. Left-aligned inside the cells (the section itself is centred)
              because centred items of different lengths have no common edge to read
              down. */}
          <div className="grid sm:grid-cols-2 gap-x-10 gap-y-4 max-w-2xl mx-auto text-left">
            {sharedBenefits.map((benefit) => (
              <div key={benefit} className="flex items-start gap-2">
                <Star size={12} className="text-primary shrink-0 fill-primary mt-1.5" />
                <span className="font-body text-sm text-secondary-foreground">{benefit}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* How membership play works. Stated before the tiers because "free court
          time" is the single most likely thing to be misread on this page. */}
      <section className="pt-4 pb-8 px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-3xl border border-primary/40 p-6 sm:p-8 text-center"
        >
          <h3 className="font-body text-xs tracking-[0.2em] uppercase text-primary mb-3">
            How membership play works
          </h3>
          <p className="font-body text-sm leading-relaxed text-secondary-foreground">
            Your membership covers <span className="text-foreground font-semibold">your spot on
            a court</span>, not the whole court. Free off-peak play is one player's place in an
            open match, and we match you by skill so you never need a partner. To take a full
            court for yourself and three others, everyone pays their own share at the rates
            below. Your monthly guest pass covers a guest's share when you bring someone new.
            Unlimited off-peak covers <span className="text-foreground font-semibold">court
            bookings and open matches</span>. Clinics, tournaments and events are priced per
            session, and every membership pays{" "}
            <span className="text-foreground font-semibold">less for them off-peak</span>. At
            peak, Regular and Padelhead members pay with their monthly credit, and Student
            members pay the standard price. Each card below shows the discount for that tier.
          </p>
        </motion.div>
      </section>

      {/* Tiers */}
      <section className="pt-4 pb-12 px-6">
        <div className="mx-auto max-w-5xl grid md:grid-cols-3 gap-6">
          {tiers.map((tier, i) => (
            <motion.div
              key={tier.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className={`border p-8 flex flex-col ${
                tier.highlight ? "border-primary bg-secondary" : "border-border"
              }`}
            >
              {/* Every row above the feature list is reserved to a fixed height so the
                  three cards line up on a laptop. Without this each row drifts: only
                  PADELHEAD has a badge, only STUDENT / LONGEVITY wraps its title to two
                  lines, and the descriptions are different lengths, so the prices,
                  break-even lines and first bullets all sat at different heights.
                  The badge slot is always rendered, empty on the other two. */}
              <div className="h-5 mb-4">
                {tier.highlight && (
                  <span className="font-body text-xs tracking-[0.2em] uppercase text-primary">Best Value</span>
                )}
              </div>
              <h3 className="font-display text-3xl text-foreground mb-1 min-h-[4.5rem]">{tier.name}</h3>
              <div className="mb-3">
                <span className="font-display text-4xl text-primary">{tier.price}</span>
                <span className="font-body text-sm text-muted-foreground">{tier.period}</span>
              </div>
              <p className="font-body text-sm text-muted-foreground mb-4 min-h-[2.5rem]">{tier.desc}</p>
              {/* Break-even rather than a "value: $X" total. With unlimited off-peak a
                  total is unbounded and depends entirely on usage, and the last set of
                  value figures went stale and inverted. Stated in the currency each tier
                  is SOLD on: off-peak sessions for the two that lead on off-peak, peak
                  sessions for Padelhead, which is pitched at people who play at peak and
                  for whom an off-peak number answers a question they never asked. */}
              <div className="mb-6 min-h-[3.25rem]">
                <div className="font-body text-sm text-primary">
                  <span className="font-display text-2xl">${monthlyValue(tier)}</span>
                  <span className="text-xs tracking-[0.1em] uppercase"> value a month</span>
                </div>
                <div className="font-body text-xs text-muted-foreground mt-0.5">{tier.playLine}</div>
              </div>
              <ul className="space-y-3 flex-1">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check size={14} className="text-primary mt-0.5 shrink-0" />
                    <span className="font-body text-sm text-secondary-foreground">{f}</span>
                  </li>
                ))}
              </ul>
              {/* Sits after the flex-1 list, so it is pinned to the bottom of the card
                  and the three buttons line up however unevenly the bullets fall.
                  aria-label names the tier: three buttons all reading "JOIN" are the
                  same button to anyone using a screen reader.
                  Opens Playtomic in a new tab rather than navigating away, because a
                  half-finished sign-up should still have the page behind it. */}
              <a
                href={tier.buyUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Join the ${tier.name} membership on Playtomic`}
                className="mt-8 block w-full bg-primary px-6 py-3 text-center font-display text-lg tracking-widest text-primary-foreground transition-all hover:brightness-110"
              >
                JOIN
              </a>
            </motion.div>
          ))}
        </div>

        {/* Notes that qualify every tier above. The year-1 line is here rather
            than buried in the terms because it is the one benefit with an end
            date on it, and nobody should discover that at renewal. */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-3xl mt-10 space-y-3 text-center"
        >
          <p className="font-body text-xs leading-relaxed text-muted-foreground">
            Value is what you get back in a month at the $22.50 per-player rate taking
            effect on <span className="text-foreground font-semibold">1 September 2026</span>,
            on the play shown under each figure. Off-peak sessions count in full because
            they are free; peak sessions count only the discount, since you still pay the
            rest. Your monthly credit, guest pass and t-shirt are included. Play more than
            that and the number goes up.
          </p>
          <p className="font-body text-xs leading-relaxed text-muted-foreground">
            Memberships run for a{" "}
            <span className="text-foreground font-semibold">12-month term</span> from the day
            you join, and continue monthly after that. Cancelling stops the renewal, and the
            remaining months of your term are still payable.
          </p>
          {/* These two are DIFFERENT dates and were being read as one. The 12-month term is
              per member and rolls from their own signup; 1 Sep 2027 is a club-wide guarantee
              on one benefit. Written together they read as "your membership ends in
              September 2027", which is not what either means. */}
          <p className="font-body text-xs leading-relaxed text-muted-foreground">
            Separately, unlimited off-peak play is a founding-member benefit guaranteed
            through <span className="text-foreground font-semibold">1 September 2027</span>.
            Your membership continues past that date. We will confirm what follows the
            benefit before then, and give at least 60 days notice of any change.
          </p>
          <p className="font-body text-xs leading-relaxed text-muted-foreground">
            Monthly benefits do not carry over. Your guest pass expires at the end of the
            calendar month. Your club credit is different: it recharges on your own renewal
            date, set by the day you joined and not by the calendar, so if you join on the
            20th your credit arrives on the 20th. Credit is for clinics, tournaments and events at
            PEAK times. Off-peak ones are discounted directly instead, the same on every
            tier: 50% off tournaments and 25% off clinics and lessons. Peak court time is
            covered by your tier's court discount, which applies to your own share of the
            court rather than the whole court. Part
            payment is not possible, so if something costs more than your balance, top your
            wallet up before you book.
          </p>
          <p className="font-body text-xs leading-relaxed text-muted-foreground">
            Your guest pass code is emailed to you within 24 hours of joining, and again at
            the start of each calendar month.
          </p>
          <p className="font-body text-xs leading-relaxed text-muted-foreground">
            Memberships are personal and non-transferable. Companies and partners
            looking for transferable or multi-seat access, see below.
          </p>
        </motion.div>
      </section>

      {/* Peak / off-peak windows. Every tier is priced against these, so they
          belong on the page rather than only inside the booking system. */}
      <section className="py-12 px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-3xl"
        >
          <div className="flex items-center justify-center gap-4 mb-8">
            <div className="h-px w-12 bg-primary" />
            <h2 className="font-display text-2xl sm:text-3xl text-foreground text-center">
              PEAK &amp; OFF-PEAK
            </h2>
            <div className="h-px w-12 bg-primary" />
          </div>
          <div className="grid sm:grid-cols-2 gap-px bg-border border border-border">
            <div className="bg-background p-6 sm:p-8">
              <h3 className="font-body text-xs tracking-[0.2em] uppercase text-primary mb-4">
                Off-Peak
              </h3>
              <ul className="space-y-2">
                {peakWindows.offPeak.map((w) => (
                  <li key={w} className="font-body text-sm text-secondary-foreground">{w}</li>
                ))}
              </ul>
            </div>
            <div className="bg-background p-6 sm:p-8">
              <h3 className="font-body text-xs tracking-[0.2em] uppercase text-primary mb-4">
                Peak
              </h3>
              <ul className="space-y-2">
                {peakWindows.peak.map((w) => (
                  <li key={w} className="font-body text-sm text-secondary-foreground">{w}</li>
                ))}
              </ul>
            </div>
          </div>
          <p className="font-body text-xs text-muted-foreground text-center mt-4">
            The club is open 6am to midnight every day. Drop-in and guest pricing is the same at any
            hour; peak and off-peak apply to member play only.
          </p>
        </motion.div>
      </section>

      {/* Pay-as-you-go rate card — the reference every "Value" figure above is
          derived from, and what guests and non-members pay. */}
      <section className="py-12 px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-3xl"
        >
          <div className="flex items-center justify-center gap-4 mb-8">
            <div className="h-px w-12 bg-primary" />
            <h2 className="font-display text-2xl sm:text-3xl text-foreground text-center">
              WITHOUT A MEMBERSHIP
            </h2>
            <div className="h-px w-12 bg-primary" />
          </div>
          <p className="font-body text-sm text-secondary-foreground text-center mb-2 max-w-xl mx-auto">
            You never need a membership to play at Foundry. These are the rates
            everyone pays, and what every membership above is measured against.
          </p>
          {/* These are the NEW rates, live 1 Sep 2026. Until then /book, /new-to-padel and
              the home page all still quote the current $15 per player and $60 court, which
              is correct today. All of them have to change on the same day or the site
              contradicts itself. */}
          <p className="font-body text-xs tracking-[0.1em] uppercase text-primary text-center mb-8">
            Rates from 1 September 2026
          </p>
          <div className="border border-border divide-y divide-border">
            {rateCard.map((row) => (
              <div
                key={row.item}
                className="flex items-baseline justify-between gap-4 px-5 py-4 sm:px-6"
              >
                <div className="min-w-0">
                  <div className="font-body text-sm text-foreground">{row.item}</div>
                  <div className="font-body text-xs text-muted-foreground mt-0.5">{row.note}</div>
                </div>
                <div className="font-display text-2xl text-primary shrink-0">{row.price}</div>
              </div>
            ))}
          </div>
          <p className="font-body text-xs text-muted-foreground text-center mt-4">
            Private coaching is booked separately, see{" "}
            <Link to="/coaching" className="text-primary underline underline-offset-2">
              Coaching
            </Link>
            . Court time is charged in addition to the coach's rate. Members can put their
            monthly credit towards clinics, tournaments and leagues, but not towards one-to-one
            coaching.
          </p>
        </motion.div>
      </section>

      {/* Corporate & partner memberships. Deliberately unpriced: these are
          arranged directly. Exists so the category is visibly standing policy. */}
      <section className="py-12 px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-3xl border border-border bg-secondary p-8 sm:p-10"
        >
          <span className="font-body text-xs tracking-[0.2em] uppercase text-primary">
            By Arrangement
          </span>
          <h2 className="font-display text-3xl sm:text-4xl text-foreground mt-3 mb-4">
            CORPORATE &amp; PARTNER MEMBERSHIPS
          </h2>
          <p className="font-body text-sm text-secondary-foreground leading-relaxed mb-4">
            All-access and multi-seat memberships for companies, teams and
            partners are arranged directly with us. Unlike the memberships above,
            these are transferable between named holders, carry an extended
            booking window and guest allowance, and include use of the upstairs
            lounge for private meetings and events.
          </p>
          <p className="font-body text-sm text-secondary-foreground leading-relaxed mb-4">
            Packages can also include coaching for a whole group, up to four of
            our certified coaches with one on each court, and food and beverage
            service from our bar and kitchen.
          </p>
          <p className="font-body text-sm text-secondary-foreground leading-relaxed mb-8">
            Court access, event nights and facility buyouts can be built into the
            same arrangement. Tell us what your team needs and we will put
            together terms.
          </p>
          <Link
            to="/contact"
            className="inline-block bg-primary px-10 py-4 font-display text-lg tracking-widest text-primary-foreground transition-all hover:brightness-110"
          >
            GET IN TOUCH
          </Link>
        </motion.div>
      </section>

      {/* Initiation Fee Note */}
      <section className="py-16 px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-3xl text-center"
        >
          <h2 className="font-display text-3xl sm:text-4xl text-foreground mb-4">FOUNDING MEMBERSHIPS</h2>
          <p className="font-body text-base text-secondary-foreground max-w-lg mx-auto mb-4">
            We are opening <span className="text-foreground font-semibold">100 memberships</span>{" "}
            in total across the three tiers. We cap them on purpose: a club where members cannot
            get on court is not a club worth joining. Once the hundred are taken, new members join
            a waitlist and come in as places open up.
          </p>
          <p className="font-body text-base text-secondary-foreground max-w-lg mx-auto">
            There is <span className="text-foreground font-semibold">no initiation fee</span> in
            our first year. Memberships run on a 12-month commitment, billed monthly.
          </p>
          <p className="font-body text-xs text-muted-foreground max-w-lg mx-auto mt-4">
            If you cancel before the twelve months are up, your benefits end at the close of that
            billing period and the remaining monthly payments still apply.
          </p>
          <p className="font-body text-xs text-muted-foreground max-w-lg mx-auto mt-6">
            Corporate and partner memberships are arranged separately and sit outside the 100.
          </p>
        </motion.div>
      </section>

      <BookCTA />

      <section className="relative py-28 px-6">
        <div className="section-divider mb-12" />
        <StayInTouchForm source="memberships" />
      </section>
    </main>
  );
};

export default Memberships;
