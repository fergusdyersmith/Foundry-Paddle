import { motion } from "framer-motion";
import BookCTA from "@/components/BookCTA";
import Photo from "@/components/Photo";
import Seo from "@/components/Seo";

const spaces = [
  {
    title: "THE COURTS",
    desc: "Four panoramic glass courts built to World Padel Tour specifications. LED-lit, heated through the winter, and designed for serious play. Whether you're rallying with friends or competing in a league, the courts are the heart of Foundry.",
    detail: "WPT-spec · LED lighting · Heated in winter",
    image: "club-courts",
    imageAlt: "Foundry Padel's glass courts seen from above, with play underway on both",
  },
  {
    title: "THE BAR",
    desc: "Post-match beer or a glass of wine. The bar is the club's gathering point — a place to debrief, strategize, or just hang.",
    detail: "Local beer · Wine · Air conditioned",
    image: "club-bar",
    imageAlt: "Padel shoes tucked under a lounge table between matches at Foundry Padel",
  },
  {
    title: "SOCIAL SPACES",
    desc: "Spectator viewing, lounge seating, and a community table designed for connection. Watch matches from the mezzanine, meet your next doubles partner, or co-work between sessions.",
    detail: "Mezzanine viewing · Lounge · Co-working",
    image: "club-social",
    imageAlt: "Four players high-five over the net at the end of a match at Foundry Padel",
  },
  {
    title: "PRO SHOP",
    desc: "Curated gear from the brands shaping padel. Racquets, grips, shoes, and apparel — tested by our coaching team and stocked for every level.",
    detail: "Racquets · Apparel · Accessories",
    image: "club-proshop",
    imageAlt: "Padel racquets laid out on the pro shop counter at Foundry Padel",
  },
];

const TheClub = () => {
  return (
    <main className="bg-background min-h-screen pt-24">
      <Seo
        title="The Club — 4 Indoor Courts, Bar & Pro Shop | Foundry Padel"
        description="Four WPT-spec panoramic glass courts, a bar, social spaces and a pro shop in St. Johns, Portland — steps from Cathedral Park. Tour Foundry Padel."
        path="/the-club"
      />
      {/* Hero */}
      <section className="py-20 px-6">
        <div className="mx-auto max-w-4xl text-center">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
            <h1 className="font-display text-6xl sm:text-8xl text-foreground mb-4">THE CLUB</h1>
            <div className="flex items-center justify-center gap-4 mb-6">
              <div className="h-px w-16 bg-primary" />
              <span className="font-body text-sm tracking-[0.2em] uppercase text-primary">Portland</span>
              <div className="h-px w-16 bg-primary" />
            </div>
            <p className="font-body text-base text-secondary-foreground max-w-xl mx-auto">
              More than a venue — a home for the sport. Four courts, a bar, social spaces, and a pro shop, all steps from Cathedral Park in Portland.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Spaces */}
      <section className="py-16 px-6">
        <div className="mx-auto max-w-5xl">
          <div className="section-divider mb-16" />
          {spaces.map((space, i) => (
            <motion.div
              key={space.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className={`grid md:grid-cols-2 gap-12 items-center mb-20 ${i % 2 === 1 ? "md:direction-rtl" : ""}`}
            >
              <div className={i % 2 === 1 ? "md:order-2" : ""}>
                <span className="font-display text-6xl text-primary/20">{String(i + 1).padStart(2, "0")}</span>
                <h2 className="font-display text-4xl text-foreground mb-4">{space.title}</h2>
                <p className="font-body text-base leading-relaxed text-secondary-foreground mb-4">{space.desc}</p>
                <p className="font-body text-xs tracking-[0.15em] uppercase text-primary">{space.detail}</p>
              </div>
              <div
                className={`aspect-[4/3] overflow-hidden bg-secondary border border-border ${i % 2 === 1 ? "md:order-1" : ""}`}
              >
                <Photo name={space.image} alt={space.imageAlt} className="h-full w-full object-cover" />
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* The Vibe */}
      <section className="py-20 px-6">
        <div className="mx-auto max-w-3xl text-center">
          <div className="section-divider mb-16" />
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }}>
            <h2 className="font-display text-5xl text-foreground mb-8">THE VIBE</h2>
            <p className="font-body text-base leading-relaxed text-secondary-foreground mb-6">
              Industrial warmth meets athletic precision. Exposed concrete, steel framing, and amber light — 
              Foundry's design is rooted in Portland's maker culture. It's a space that feels alive before 
              the first ball is struck.
            </p>
            <p className="font-body text-sm text-muted-foreground leading-relaxed">
              Evening leagues under low light. Weekend tournaments with spectators on the mezzanine. 
              Tuesday morning coaching, post-match beers at the bar. This is padel culture, built from the ground up.
            </p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.15 }}
            className="mt-12 aspect-[3/2] overflow-hidden border border-border bg-secondary"
          >
            <Photo
              name="club-vibe"
              alt="Amber light, exposed steel and concrete over the blue courts at Foundry Padel in St. Johns, Portland"
              className="h-full w-full object-cover"
            />
          </motion.div>
          <div className="section-divider mt-16" />
        </div>
      </section>

      <BookCTA />
    </main>
  );
};

export default TheClub;
