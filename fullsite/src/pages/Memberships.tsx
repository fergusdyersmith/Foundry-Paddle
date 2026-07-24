import { motion } from "framer-motion";
import { Check, Star } from "lucide-react";
import BookCTA from "@/components/BookCTA";
import StayInTouchForm from "@/components/StayInTouchForm";
import Seo from "@/components/Seo";

const sharedBenefits = [
  "All-Hours Access to Sky Level lounge and observation deck",
  "Special Members Only events",
  "10% Discount on In-Store Merchandise",
  "Free Stuff — when we get free stuff, you get free stuff!",
  "Membership benefits at clubs opening in the Pacific Northwest",
];

const tiers = [
  {
    name: "STUDENT / LONGEVITY",
    label: "Retired",
    price: "$99",
    period: "/mo",
    value: "$285+",
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
    value: "$265+",
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
    value: "$365+",
    desc: "All-in. Unlimited play, maximum perks.",
    features: [
      "Unlimited free court time during non-peak hours (incl. organized games)",
      "3 hours/week free court time during peak hours (incl. organized games)",
      "50% discount filling in last-minute open matches within 5 hours (incl. peak)",
      "2 Free 'New Guest' passes/month or 1 off-peak 90-min full court session",
      "25% discount on pro lessons",
      "50% discount on padel rentals",
      "Free Foundry Padel T-shirt",
      "14-day booking window",
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
