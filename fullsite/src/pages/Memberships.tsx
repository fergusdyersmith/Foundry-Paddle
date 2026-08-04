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
  "Free Stuff — when we get free stuff, you get free stuff!",
];

// Peak / off-peak. Every tier above is priced against these windows, so they
// are stated on the page rather than left to the booking system.
const peakWindows = {
  offPeak: ["Monday to Thursday, 7am–4pm", "Friday, 7am–12pm"],
  peak: ["Monday to Thursday, 4pm–10pm", "Friday, 12pm–10pm", "Saturday & Sunday, all day"],
};

// Published pay-as-you-go rates, repeated here so the member value figures
// above can be checked against them without leaving the page.
const rateCard = [
  { item: "Court, 90 minutes", price: "$60", note: "Up to 4 players" },
  { item: "Per player, 90 minutes", price: "$15", note: "Join an open match, no partner needed" },
  { item: "Racket rental", price: "$5", note: "Standard club racket" },
  { item: "Premium demo racket", price: "$10", note: "Current-season demo stock" },
  { item: "Guest of a member", price: "$15", note: "Member guest passes cover this" },
];

// The club opens 100 memberships in total. Only that total is published: the
// working internal split is ~50 student / 30 regular / 20 padelhead, but it is
// a planning assumption, not a commitment, and per-tier caps would box us in if
// demand lands differently. Corporate/partner seats sit outside the 100.
const tiers = [
  {
    name: "STUDENT / LONGEVITY",
    label: "Retired",
    price: "$99",
    period: "/mo",
    value: "$245+",
    desc: "Discounted access for students and retirees.",
    features: [
      "Up to 5 hours/week of free off-peak play (your spot on a court)",
      "2 Free 'New Guest' passes/month (expire at month end)",
      "25% discount on group clinics",
      "50% discount on padel rentals",
      "Free Foundry Padel T-shirt",
      "7-day booking window",
    ],
    highlight: false,
  },
  {
    name: "REGULAR",
    label: null,
    price: "$149",
    period: "/mo",
    value: "$345+",
    desc: "For regulars who want priority and perks.",
    features: [
      "5 hours/week of free off-peak play (your spot on a court)",
      "4.5 hours/week of half-price peak play (your spot on a court)",
      "2 Free 'New Guest' passes/month (expire at month end)",
      "25% discount on group clinics",
      "50% discount on padel rentals",
      "Free Foundry Padel T-shirt",
      "7-day booking window",
    ],
    highlight: false,
  },
  {
    name: "PADELHEAD",
    label: null,
    price: "$199",
    period: "/mo",
    value: "$505+",
    desc: "All-in. Unlimited play, maximum perks.",
    features: [
      "Unlimited free off-peak play (your spot on a court)",
      "3 hours/week of free peak play (your spot on a court)",
      "2 Free 'New Guest' passes/month (expire at month end)",
      "25% discount on group clinics",
      "50% discount on padel rentals",
      "Free Foundry Padel T-shirt",
      "7-day booking window",
    ],
    highlight: true,
  },
];

const Memberships = () => {
  return (
    <main className="bg-background min-h-screen pt-24">
      <Seo
        title="Padel Memberships in Portland — From $99/mo | Foundry Padel"
        description="Foundry Padel memberships from $99/mo, limited to 100 founding members: free off-peak play, discounts on clinics and rentals, and members-only events."
        path="/memberships"
      />
      {/* Hero */}
      <section className="py-20 px-6">
        <div className="mx-auto max-w-4xl text-center">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
            <h1 className="font-display text-6xl sm:text-8xl text-foreground mb-4">MEMBERSHIPS</h1>
            <div className="flex items-center justify-center gap-4 mb-6">
              <div className="h-px w-16 bg-primary" />
              <span className="font-body text-sm tracking-[0.2em] uppercase text-primary">Find Your Level</span>
              <div className="h-px w-16 bg-primary" />
            </div>
            <p className="font-body text-base text-secondary-foreground max-w-xl mx-auto">
              From casual play to unlimited access — find the membership that fits your game.
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
            a court</span>, not the whole court. Free and discounted hours are one player's place
            in an open match, and we match you by skill so you never need
            a partner. To take a full court for yourself and three others, book it at the rates
            below. Your monthly guest passes cover a guest's spot when you bring someone new.
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
              <div className="font-body text-xs tracking-[0.1em] uppercase text-primary/80 mb-6">
                Value: {tier.value}
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

        {/* Basis for the "Value" figures above, and the transferability rule.
            Both are here so a tier can be checked against the rate card below. */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-3xl mt-10 space-y-3 text-center"
        >
          <p className="font-body text-xs leading-relaxed text-muted-foreground">
            Value is what the same play would cost at our published $15 per-player
            drop-in rate for 90-minute sessions, assuming typical member usage.
            Unlimited tiers are figured at 8 hours per week. Your actual value
            depends on how often you play.
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
            . Court time is charged in addition to the coach's rate. The member clinic discount
            applies to group clinics only, not to one-to-one coaching.
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
            our first year. We ask for a 12-month commitment, and due at signing is the first and
            twelfth month.
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
