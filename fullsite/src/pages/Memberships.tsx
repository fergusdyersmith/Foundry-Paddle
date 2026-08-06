import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Check, Star } from "lucide-react";
import BookCTA from "@/components/BookCTA";
import StayInTouchForm from "@/components/StayInTouchForm";
import Seo from "@/components/Seo";

const sharedBenefits = [
  "All-hours access to the upstairs lounge and observation deck",
  "Special Members Only events",
  "10% Discount on In-Store Merchandise",
  "Free Stuff: when we get free stuff, you get free stuff!",
];

// Peak / off-peak. Every tier above is priced against these windows, so they
// are stated on the page rather than left to the booking system.
const peakWindows = {
  offPeak: ["Monday to Friday, 7am–4pm", "Saturday & Sunday, 4pm–10pm"],
  peak: ["Monday to Friday, 4pm–10pm", "Saturday & Sunday, 7am–4pm"],
};

// Published pay-as-you-go rates. Members are measured against these, and a
// member's monthly credit is spent at exactly these prices, so the page has to
// carry them rather than send people to /book to work it out.
const rateCard = [
  { item: "Court, 60 minutes", price: "$40", note: "Up to 4 players" },
  { item: "Court, 90 minutes", price: "$60", note: "Up to 4 players" },
  { item: "Court, 120 minutes", price: "$80", note: "Up to 4 players" },
  { item: "Per player, 90 minutes", price: "$15", note: "Join an open match, no partner needed" },
  { item: "Racket rental", price: "$5", note: "Standard club racket" },
  { item: "Premium demo racket", price: "$10", note: "Current-season demo stock" },
  { item: "Guest of a member", price: "$15", note: "Member guest passes cover this" },
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
// Courts take a percentage discount and activities cannot, which is why peak
// play is a % and clinics/tournaments are a wallet. They are two mechanisms
// because Playtomic offers two, not because the split means anything to a member.
//
// `breakEven` is (price minus the monthly credit) / $15 per-player off-peak,
// rounded up. The credit counts because a member receives it whether or not they
// play; the peak discount does NOT, because it is worth nothing until they book a
// peak court, and the previous set of value figures went stale and inverted
// precisely because they baked in assumptions about how someone plays.
const tiers = [
  {
    name: "STUDENT / LONGEVITY",
    label: "Retired",
    price: "$100",
    period: "/mo",
    desc: "Play as much as you like, weekday daytime and weekend evenings.",
    breakEven: 7,
    features: [
      "Unlimited free off-peak play (your spot on a court)",
      "Peak court bookings at standard rates",
      "5-day booking window",
      "1 free 'New Guest' pass/month (expires at month end)",
      "50% discount on padel rentals",
      "Free Foundry Padel T-shirt",
    ],
    highlight: false,
  },
  {
    name: "REGULAR",
    label: null,
    price: "$150",
    period: "/mo",
    desc: "Unlimited off-peak, and a quarter off every peak booking.",
    breakEven: 9,
    features: [
      "Unlimited free off-peak play (your spot on a court)",
      "25% off every peak court booking",
      "$25/month credit for clinics, tournaments and events",
      "7-day booking window",
      "1 free 'New Guest' pass/month (expires at month end)",
      "50% discount on padel rentals",
      "Free Foundry Padel T-shirt",
    ],
    highlight: false,
  },
  {
    name: "PADELHEAD",
    label: null,
    price: "$200",
    period: "/mo",
    desc: "For players who live at peak times.",
    breakEven: 10,
    features: [
      "Unlimited free off-peak play (your spot on a court)",
      "50% off every peak court booking",
      "$50/month credit for clinics, tournaments and events",
      "10-day booking window",
      "1 free 'New Guest' pass/month (expires at month end)",
      "50% discount on padel rentals",
      "Free Foundry Padel T-shirt",
    ],
    highlight: true,
  },
];

const Memberships = () => {
  return (
    <main className="bg-background min-h-screen pt-24">
      <Seo
        title="Padel Memberships in Portland, From $100/mo | Foundry Padel"
        description="Foundry Padel memberships from $100/mo, limited to 100 founding members: unlimited off-peak play, up to 50% off peak courts, monthly credit for clinics and tournaments, and priority booking."
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
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4 max-w-3xl mx-auto">
            {sharedBenefits.map((benefit) => (
              <div key={benefit} className="flex items-center gap-2 justify-center">
                <Star size={12} className="text-primary shrink-0 fill-primary" />
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
            session and are what your monthly credit is for.
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
              {tier.highlight && (
                <span className="font-body text-xs tracking-[0.2em] uppercase text-primary mb-4">Best Value</span>
              )}
              <h3 className="font-display text-3xl text-foreground mb-1">{tier.name}</h3>
              {tier.label && (
                <span className="font-body text-xs tracking-[0.15em] uppercase text-muted-foreground mb-2">{tier.label}</span>
              )}
              <div className="mb-3">
                <span className="font-display text-4xl text-primary">{tier.price}</span>
                <span className="font-body text-sm text-muted-foreground">{tier.period}</span>
              </div>
              <p className="font-body text-sm text-muted-foreground mb-4">{tier.desc}</p>
              {/* Break-even rather than a "value: $X" total. With unlimited
                  off-peak a total is unbounded and depends entirely on usage,
                  and the last set of value figures went stale and inverted. */}
              <div className="font-body text-xs tracking-[0.1em] uppercase text-primary/80 mb-6">
                Pays for itself at {tier.breakEven} off-peak sessions a month
              </div>
              <ul className="space-y-3 flex-1">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check size={14} className="text-primary mt-0.5 shrink-0" />
                    <span className="font-body text-sm text-secondary-foreground">{f}</span>
                  </li>
                ))}
              </ul>
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
            Break-even counts off-peak play at our $15 per-player rate and treats your
            monthly credit as money back. Your peak discount is on top of that, so if you
            play evenings and weekend mornings you are ahead of the number shown.
          </p>
          <p className="font-body text-xs leading-relaxed text-muted-foreground">
            Unlimited off-peak play is a founding-member benefit through{" "}
            <span className="text-foreground font-semibold">1 September 2027</span>. We will
            confirm what follows it before then, and give at least 60 days notice of any change.
          </p>
          <p className="font-body text-xs leading-relaxed text-muted-foreground">
            Your credit resets every month on your renewal date, the same day of the month
            you joined, not the first of the calendar month. Unused credit does not carry
            over. It covers clinics, tournaments and events, and pays in full for any one
            of them priced at or under your balance. Peak court time is covered by your
            tier's discount rather than by your credit.
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
            The club is open 7am to 10pm every day. Drop-in and guest pricing is the same at any
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
          <p className="font-body text-sm text-secondary-foreground text-center mb-8 max-w-xl mx-auto">
            You never need a membership to play at Foundry. These are the rates
            everyone pays, and what every membership above is measured against.
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
