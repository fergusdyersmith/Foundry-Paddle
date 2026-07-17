import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, Footprints, CalendarCheck, Handshake, Timer } from "lucide-react";
import heroImage from "@/assets/hero-padel.jpg";
import { BOOK_PAGE_PATH } from "@/constants/booking";
import Seo from "@/components/Seo";

/** Conversion landing page for the two paid-acquisition segments: total
 *  beginners and pickleball players. This is the destination for flyers, QR
 *  codes, and ads, so the copy here must match the printed offer: first play
 *  $15, racket rentals $5 ($10 demo), no partner or experience needed. */

const pickleballPoints = [
  {
    title: "SAME SOCIAL DOUBLES",
    desc: "Padel is always played 2v2, just like your pickleball games. Come with friends or join an open match and we'll fill the court.",
  },
  {
    title: "EASY TO PICK UP",
    desc: "Underhand serve, a short stringless racket, and a court built for rallies. If you can dink, you can rally here in minutes.",
  },
  {
    title: "WALLS CHANGE EVERYTHING",
    desc: "Glass walls keep the ball in play, so points last longer and strategy runs deeper. It's the part pickleball players get hooked on first.",
  },
];

const firstVisitSteps = [
  {
    icon: CalendarCheck,
    title: "BOOK ONLINE",
    desc: "$15 per player for a 90-minute session, or grab a spot in an open match or beginner clinic.",
  },
  {
    icon: Footprints,
    title: "WEAR COURT SHOES",
    desc: "Comfortable athletic wear and non-marking shoes. That's the whole dress code.",
  },
  {
    icon: Handshake,
    title: "GRAB A RACKET",
    desc: "Rent one at the front desk for $5, or try a high-end demo racket for $10. Balls are for sale too.",
  },
  {
    icon: Timer,
    title: "PLAY 90 MINUTES",
    desc: "Coming solo? Join open play and we'll match you with players at your level.",
  },
];

const quickFacts = [
  { stat: "$15", label: "First play, per player" },
  { stat: "$5", label: "Racket rental" },
  { stat: "8AM–10PM", label: "Open daily" },
  { stat: "0", label: "Experience needed" },
];

const NewToPadel = () => {
  return (
    <main className="bg-background min-h-screen">
      <Seo
        title="New to Padel? Pickleball Players Welcome, First Play $15 | Foundry Padel"
        description="Never played padel? Coming from pickleball or tennis? Book your first play for $15 at Foundry Padel in Portland. Racket rentals $5, no partner or experience needed."
        path="/new-to-padel"
      />

      {/* Hero */}
      <section className="relative flex min-h-[85vh] w-full items-center overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={heroImage}
            alt="Indoor padel court at Foundry Padel in Portland"
            className="h-full w-full object-cover"
          />
          <div className="hero-gradient absolute inset-0" />
        </div>
        <div className="relative z-10 mx-auto max-w-3xl px-6 pt-24 text-center">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
            <span className="font-body text-sm tracking-[0.2em] uppercase text-primary">
              First play $15 · No experience needed
            </span>
            <h1 className="mt-4 font-display text-6xl sm:text-8xl leading-none text-foreground">
              NEW TO PADEL?
            </h1>
            <p className="mx-auto mt-6 max-w-xl font-body text-base text-secondary-foreground">
              If you play pickleball or tennis, you already have the hard part down.
              Padel is Portland's newest court sport: social doubles, glass walls, and
              rallies that start on day one. Book your first play at our indoor club in St. Johns.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                to={BOOK_PAGE_PATH}
                className="bg-primary px-10 py-4 font-display text-lg tracking-widest text-primary-foreground shadow-[0_0_40px_-8px_hsl(var(--primary)/0.7)] transition-all hover:brightness-110"
              >
                BOOK YOUR FIRST PLAY: $15
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Pickleball crossover */}
      <section className="px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
            className="mb-14 text-center"
          >
            <h2 className="font-display text-4xl sm:text-5xl text-foreground mb-4">
              PLAY PICKLEBALL? YOU'LL LOVE PADEL.
            </h2>
            <p className="mx-auto max-w-2xl font-body text-sm text-muted-foreground">
              Padel is the fastest-growing racquet sport in the world, and pickleball
              players pick it up faster than anyone.
            </p>
          </motion.div>
          <div className="grid gap-8 sm:grid-cols-3">
            {pickleballPoints.map((p, i) => (
              <motion.div
                key={p.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="border border-border p-8"
              >
                <h3 className="font-display text-xl text-foreground mb-3">{p.title}</h3>
                <p className="font-body text-sm leading-relaxed text-muted-foreground">{p.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* First visit steps */}
      <section className="px-6 py-12">
        <div className="mx-auto max-w-5xl">
          <div className="section-divider mb-20" />
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
            className="mb-14 text-center"
          >
            <h2 className="font-display text-4xl sm:text-5xl text-foreground mb-4">YOUR FIRST VISIT</h2>
            <p className="font-body text-sm text-muted-foreground">
              No gear, no partner, no experience. Here's how easy it is.
            </p>
          </motion.div>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {firstVisitSteps.map((step, i) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="text-center"
              >
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center border border-primary">
                  <step.icon size={22} className="text-primary" />
                </div>
                <span className="font-body text-xs tracking-[0.2em] text-muted-foreground">STEP {i + 1}</span>
                <h3 className="mt-1 font-display text-xl text-foreground mb-2">{step.title}</h3>
                <p className="font-body text-sm leading-relaxed text-muted-foreground">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Quick facts */}
      <section className="px-6 py-24">
        <div className="mx-auto max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
            className="grid grid-cols-2 gap-10 border border-border p-10 text-center sm:grid-cols-4"
          >
            {quickFacts.map((f) => (
              <div key={f.label}>
                <span className="font-display text-4xl text-primary">{f.stat}</span>
                <p className="mt-2 font-body text-xs tracking-[0.15em] uppercase text-muted-foreground">
                  {f.label}
                </p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-6 pb-28">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="mx-auto max-w-2xl text-center"
        >
          <div className="section-divider mb-12" />
          <h2 className="font-display text-5xl sm:text-6xl text-foreground mb-4">READY TO RALLY?</h2>
          <p className="mb-10 font-body text-sm tracking-[0.15em] uppercase text-muted-foreground">
            Indoor courts in St. Johns, next to Cathedral Park
          </p>
          <Link
            to={BOOK_PAGE_PATH}
            className="inline-block bg-primary px-12 py-4 font-display text-xl tracking-widest text-primary-foreground transition-all hover:brightness-110"
          >
            BOOK YOUR FIRST PLAY
          </Link>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
            <Link
              to={BOOK_PAGE_PATH}
              className="inline-flex items-center gap-2 font-display text-xs tracking-[0.2em] text-muted-foreground transition-colors hover:text-primary"
            >
              SEE BEGINNER CLINICS <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link
              to="/the-sport"
              className="inline-flex items-center gap-2 font-display text-xs tracking-[0.2em] text-muted-foreground transition-colors hover:text-primary"
            >
              WHAT IS PADEL? <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="section-divider mt-12" />
        </motion.div>
      </section>
    </main>
  );
};

export default NewToPadel;
