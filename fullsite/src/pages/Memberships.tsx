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
  "Membership benefits at clubs opening in the Pacific Northwest",
];

// Published pay-as-you-go rates, repeated here so the member value figures
// above can be checked against them without leaving the page.
const rateCard = [
  { item: "Court, 90 minutes", price: "$60", note: "Up to 4 players" },
  { item: "Per player, 90 minutes", price: "$15", note: "Join an open match, no partner needed" },
  { item: "Racket rental", price: "$5", note: "Standard club racket" },
  { item: "Premium demo racket", price: "$10", note: "Current-season demo stock" },
  { item: "Guest of a member", price: "$15", note: "Member guest passes cover this" },
];

const tiers = [
  {
    name: "STUDENT / LONGEVITY",
    label: "Retired",
    price: "$99",
    period: "/mo",
    value: "$245+",
    desc: "Discounted access for students and retirees.",
    features: [
      "Up to 5 hours/week free court time during non-peak hours (incl. organized games)",
      "50% discount filling in last-minute open matches within 3 hours (incl. peak)",
      "2 Free 'New Guest' passes/month or 1 off-peak 90-min full court",
      "50% discount on padel rentals",
      "25% discount on pro lessons",
      "Free Foundry Padel T-shirt",
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
      "5 hours/week free court time during non-peak hours (incl. organized games)",
      "4.5 hours/week half-price court time during peak hours (incl. organized games)",
      "2 Free 'New Guest' passes/month or 1 off-peak 90-min full court",
      "25% discount on pro lessons",
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
      "Unlimited free court time during non-peak hours (incl. organized games)",
      "3 hours/week free court time during peak hours (incl. organized games)",
      "50% discount filling in last-minute open matches within 5 hours (incl. peak)",
      "2 Free 'New Guest' passes/month or 1 off-peak 90-min full court session",
      "25% discount on pro lessons",
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
        description="Foundry Padel memberships from $99/mo: free non-peak court time, discounts on lessons and rentals, priority booking, and members-only events. Or drop in for $15 per player."
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

      {/* Tiers */}
      <section className="py-12 px-6">
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
            Value is what the same play would cost at our published drop-in rates
            ($15 per player, 90-minute sessions), assuming typical member usage.
            Unlimited tiers are figured at 8 hours per week. Your actual value
            depends on how often you play.
          </p>
          <p className="font-body text-xs leading-relaxed text-muted-foreground">
            Memberships are personal and non-transferable. Companies and partners
            looking for transferable or multi-seat access, see below.
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
            Private coaching is booked separately — see{" "}
            <Link to="/coaching" className="text-primary underline underline-offset-2">
              Coaching
            </Link>
            . Court time is charged in addition to the coach's rate.
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
          <h2 className="font-display text-3xl sm:text-4xl text-foreground mb-4">NO INITIATION FEE</h2>
          <p className="font-body text-base text-secondary-foreground max-w-lg mx-auto">
            We ask for a 12-month commitment but are not charging an initiation fee during our first year.
            Due at signing is first and 12th month fees.
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
