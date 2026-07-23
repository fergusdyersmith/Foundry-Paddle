import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import heroImage from "@/assets/hero-padel-blue.jpg";
import BookCTA from "@/components/BookCTA";
import StayInTouchForm from "@/components/StayInTouchForm";
import { PartnerLogoBand } from "@/components/PartnerLogoBand";
import Seo from "@/components/Seo";
import { BOOK_PAGE_PATH } from "@/constants/booking";
import { GOOGLE_MAPS_URL } from "@/constants/location";

const features = [
  { label: "4", desc: "Indoor Courts" },
  { label: "1", desc: "Social Café" },
  { label: "∞", desc: "Good Times" },
];

const Index = () => {
  return (
    <main className="bg-background min-h-screen">
      <Seo
        title="Foundry Padel — Portland's First Indoor Padel Club | St. Johns"
        description="Play padel in Portland at Foundry — 4 indoor glass courts in St. Johns, next to Cathedral Park. $15 per player, $60 per 90-min court. Racket rentals from $5, no partner needed. Open daily 8am–10pm."
        path="/"
      />
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
            {/* New-brand stacked lockup; sr-only h1 keeps the page's keyword heading. */}
            <h1 className="sr-only">Foundry Padel</h1>
            <img
              src="/rebrand/FP_lockup_stack_light.svg"
              alt="Foundry Padel"
              className="mx-auto w-56 sm:w-72 md:w-80"
            />
          </motion.div>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1, delay: 0.5 }} className="mt-6 max-w-xl font-body text-sm tracking-[0.15em] uppercase text-muted-foreground">
            Never held a padel racket? Most of Portland hasn't. Racket rentals on site, no partner needed. Just book and play.
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.8 }} className="mt-10 flex flex-col items-center gap-4 sm:flex-row">
            <Link
              to={BOOK_PAGE_PATH}
              className="bg-primary px-7 py-3 font-display text-sm tracking-widest text-primary-foreground shadow-[0_0_30px_-10px_hsl(var(--primary)/0.6)] transition-all hover:brightness-110"
            >
              BOOK YOUR FIRST PLAY — $15
            </Link>
            <Link to="/the-sport" className="border border-border px-7 py-3 font-display text-sm tracking-widest text-muted-foreground transition-all hover:border-foreground hover:text-foreground">
              NEW TO PADEL? START HERE
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
              This is a home for players who want more than a casual hit —
              coaching, tournaments, pro workshops, and a space designed to
              elevate the game and the culture around it.
            </p>
          </motion.div>
          <div className="section-divider mt-20" />
        </div>
      </section>

      {/* Plan your first visit — plain, crawlable answers for a first-time local */}
      <section className="px-6 pb-8">
        <div className="mx-auto max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
            className="border border-border p-8 sm:p-12"
          >
            <h2 className="font-display text-3xl sm:text-4xl text-foreground mb-2 text-center">
              CAN I JUST SHOW UP AND TRY IT?
            </h2>
            <p className="font-body text-sm text-muted-foreground mb-10 text-center">
              Yes. Here's everything a first-timer needs to know.
            </p>
            <div className="grid gap-8 sm:grid-cols-2">
              <div>
                <h3 className="font-body text-xs tracking-[0.2em] uppercase text-primary mb-2">Pricing</h3>
                <p className="font-body text-base text-secondary-foreground">
                  $15 per player — $60 per court for a 90-minute booking. No membership required to play.
                </p>
              </div>
              <div>
                <h3 className="font-body text-xs tracking-[0.2em] uppercase text-primary mb-2">Hours</h3>
                <p className="font-body text-base text-secondary-foreground">
                  Open daily, 8:00 AM to 10:00 PM. All four indoor courts, morning to night.
                </p>
              </div>
              <div>
                <h3 className="font-body text-xs tracking-[0.2em] uppercase text-primary mb-2">Gear &amp; partners</h3>
                <p className="font-body text-base text-secondary-foreground">
                  Rent a racket for $5, or a high-end demo racket for $10. Balls and rackets are for sale in our pro shop. No partner needed: join open play and we'll match you by skill.
                </p>
              </div>
              <div>
                <h3 className="font-body text-xs tracking-[0.2em] uppercase text-primary mb-2">Where we are</h3>
                <p className="font-body text-base text-secondary-foreground">
                  <a
                    href={GOOGLE_MAPS_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="transition-colors hover:text-primary"
                  >
                    8613 N Crawford St, Portland, OR 97203
                  </a>{" "}
                  — in St. Johns, next to Cathedral Park.
                </p>
              </div>
            </div>
            <div className="mt-10 text-center">
              <Link
                to={BOOK_PAGE_PATH}
                className="inline-block bg-primary px-10 py-4 font-display text-lg tracking-widest text-primary-foreground transition-all hover:brightness-110"
              >
                BOOK YOUR FIRST PLAY — $15
              </Link>
            </div>
          </motion.div>
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

      <section className="relative py-28 px-6">
        <StayInTouchForm source="home" />
      </section>
    </main>
  );
};

export default Index;
