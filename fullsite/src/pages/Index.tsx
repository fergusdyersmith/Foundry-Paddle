import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import heroImage from "@/assets/hero-padel-blue.jpg";
import BookCTA from "@/components/BookCTA";
import { PartnerLogoBand } from "@/components/PartnerLogoBand";
import { BOOK_PAGE_PATH } from "@/constants/booking";

const features = [
  { label: "4", desc: "Indoor Courts" },
  { label: "1", desc: "Social Café" },
  { label: "∞", desc: "Good Times" },
];

const Index = () => {
  return (
    <main className="bg-background min-h-screen">
      {/* Hero */}
      <section className="relative h-screen w-full overflow-hidden">
        <div className="absolute inset-0">
          <img src={heroImage} alt="Indoor padel court with dramatic lighting" className="h-full w-full object-cover" />
          <div className="hero-gradient absolute inset-0" />
        </div>
        <div className="absolute inset-0 flex justify-between px-[20%] pointer-events-none">
          <div className="court-line h-full" />
          <div className="court-line h-full" />
        </div>
        <div className="relative z-10 flex h-full flex-col items-center justify-end pb-24 px-6">
          <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, ease: [0.25, 0.46, 0.45, 0.94] }} className="text-center">
            <h1 className="font-display text-7xl sm:text-8xl md:text-9xl tracking-wider text-foreground leading-none">FOUNDRY</h1>
            <div className="flex items-center justify-center gap-4 mt-1">
              <div className="h-px w-12 bg-primary" />
              <span className="font-display text-2xl sm:text-3xl tracking-[0.3em] text-primary">PADEL</span>
              <div className="h-px w-12 bg-primary" />
            </div>
          </motion.div>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1, delay: 0.5 }} className="mt-6 font-body text-sm tracking-[0.2em] uppercase text-muted-foreground">
            Portland's First Padel Club — Where The Game Begins
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.8 }} className="mt-10 flex gap-4">
            <Link
              to={BOOK_PAGE_PATH}
              className="border border-primary px-10 py-3 font-display text-lg tracking-widest text-primary transition-all hover:bg-primary hover:text-primary-foreground"
            >
              BOOK NOW
            </Link>
            <Link to="/the-sport" className="border border-border px-10 py-3 font-display text-lg tracking-widest text-muted-foreground transition-all hover:border-foreground hover:text-foreground">
              LEARN MORE
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-28 px-6">
        <div className="mx-auto max-w-4xl">
          <div className="section-divider mb-20" />
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-100px" }} transition={{ duration: 0.8 }} className="grid md:grid-cols-3 gap-12 mb-20">
            {features.map((f) => (
              <div key={f.desc} className="text-center">
                <span className="font-display text-6xl text-primary">{f.label}</span>
                <p className="mt-2 font-body text-sm tracking-[0.15em] uppercase text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-100px" }} transition={{ duration: 0.8, delay: 0.2 }} className="max-w-2xl mx-auto text-center">
            <h2 className="font-display text-4xl sm:text-5xl text-foreground mb-6">NOT PICKLEBALL.</h2>
            <p className="font-body text-base leading-relaxed text-secondary-foreground">
              Padel is the fastest-growing racquet sport on the planet. Enclosed glass courts,
              strategic wall play, and an energy that's part tennis, part squash, and entirely addictive.
              Foundry Padel is bringing this to Portland —
              four indoor courts, a curated social space, café, and retail, all next to Cathedral Park.
            </p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="mt-16 max-w-2xl mx-auto text-center"
          >
            <p className="font-body text-sm leading-relaxed text-muted-foreground">
              Serious but approachable. Competitive but community-driven.
              We're building something for players who want more than a casual hit —
              expect coaching, tournaments, pro workshops, and a space designed to
              elevate the game and the culture around it.
            </p>
          </motion.div>
          <div className="section-divider mt-20" />
        </div>
      </section>

      {/* Quick links */}
      <section className="py-20 px-6">
        <div className="mx-auto max-w-5xl grid md:grid-cols-3 gap-6">
          {[
            { title: "THE SPORT", desc: "New to padel? Learn the basics and why it's taking the world by storm.", link: "/the-sport" },
            { title: "THE CLUB", desc: "Four courts, a social café, and a space designed for the culture.", link: "/the-club" },
            { title: "MEMBERSHIPS", desc: "From drop-in to unlimited — find the tier that fits your game.", link: "/memberships" },
          ].map((item) => (
            <motion.div key={item.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
              <Link to={item.link} className="block border border-border p-8 transition-all hover:border-primary group">
                <h3 className="font-display text-2xl text-foreground group-hover:text-primary transition-colors mb-3">{item.title}</h3>
                <p className="font-body text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                <span className="inline-block mt-4 font-body text-xs tracking-[0.2em] uppercase text-primary">Explore →</span>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Partners */}
      <section id="partners" className="py-20 px-6">
        <div className="mx-auto max-w-4xl">
          <div className="section-divider mb-16" />
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }} className="text-center mb-12">
            <h2 className="font-display text-4xl sm:text-5xl text-foreground mb-8">PARTNERS</h2>
            <div className="max-w-2xl mx-auto space-y-6">
              <p className="font-body text-base leading-relaxed text-secondary-foreground">
                We're proud to work with partners who champion padel at every level — from the professional circuit to clubs like ours opening new courts.
              </p>
              <p className="font-body text-base leading-relaxed text-secondary-foreground">
                Beyond the court, we're partnering exclusively with Portland-based small businesses and makers. From our café's local roasters to the artisans crafting our spaces, Foundry is built by and for the Portland community.
              </p>
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="-mx-6 md:-mx-10"
          >
            <PartnerLogoBand />
          </motion.div>
          <div className="section-divider mt-16" />
        </div>
      </section>

      <BookCTA />
    </main>
  );
};

export default Index;
