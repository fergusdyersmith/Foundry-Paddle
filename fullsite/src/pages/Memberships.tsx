import { motion } from "framer-motion";
import { Check } from "lucide-react";
import BookCTA from "@/components/BookCTA";
import StayInTouchForm from "@/components/StayInTouchForm";

const tiers = [
  {
    name: "DROP-IN",
    price: "Coming Soon",
    desc: "Pay as you play. No commitment.",
    features: ["Court booking access", "Equipment rental available", "Café discounts", "Open play sessions"],
    highlight: false,
  },
  {
    name: "MEMBER",
    price: "Coming Soon",
    desc: "For regulars who want priority and perks.",
    features: ["Priority court booking", "Discounted court rates", "Free equipment rental", "Member social events", "Guest passes (2/month)", "Coaching discounts"],
    highlight: true,
  },
  {
    name: "UNLIMITED",
    price: "Coming Soon",
    desc: "All-in. Unlimited play, unlimited access.",
    features: ["Unlimited court time", "All Member benefits", "Free coaching clinics", "Tournament entry included", "Unlimited guest passes", "Pro shop discounts", "Locker included"],
    highlight: false,
  },
];

const Memberships = () => {
  return (
    <main className="bg-background min-h-screen pt-24">
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
              From casual drop-ins to committed players — there's a tier for every game.
              Pricing announced at launch.
            </p>
          </motion.div>
        </div>
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
                <span className="font-body text-xs tracking-[0.2em] uppercase text-primary mb-4">Most Popular</span>
              )}
              <h3 className="font-display text-3xl text-foreground mb-1">{tier.name}</h3>
              <span className="font-display text-xl text-primary mb-3">{tier.price}</span>
              <p className="font-body text-sm text-muted-foreground mb-6">{tier.desc}</p>
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

      <BookCTA />

      <section className="relative py-28 px-6">
        <div className="section-divider mb-12" />
        <StayInTouchForm source="memberships" />
      </section>
    </main>
  );
};

export default Memberships;
