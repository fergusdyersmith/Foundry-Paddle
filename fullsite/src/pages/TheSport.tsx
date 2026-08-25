import { motion } from "framer-motion";
import BookCTA from "@/components/BookCTA";
import WistiaVideo from "@/components/WistiaVideo";
import Photo from "@/components/Photo";
import PhotoCycle, { type CycleFrame } from "@/components/PhotoCycle";
import Seo from "@/components/Seo";

const comparisons = [
  { sport: "Tennis", padel: "Enclosed glass walls — balls stay in play", other: "Open court — balls go out" },
  { sport: "Squash", padel: "Outdoor feel, doubles format, social game", other: "Indoor, typically singles, intense" },
  { sport: "Pickleball", padel: "Full racquet sport with wall strategy", other: "Paddle sport, no walls, smaller court" },
];

// Frames for the band under the page heading: the sport in motion, the room it
// happens in, and the light. None are reused by the rule cards further down.
const heroFrames: CycleFrame[] = [
  {
    name: "sport-what-is-padel",
    alt: "A player reaches for a high ball against the glass back wall on a Foundry Padel court",
  },
  {
    name: "card-the-sport",
    alt: "A player stretches wide for a forehand on court at Foundry Padel",
  },
  {
    name: "og-image-photo",
    alt: "A player serves under the steel trusses of Foundry Padel's warehouse courts",
  },
  {
    name: "club-courts",
    alt: "Foundry Padel's glass courts seen from above, with play underway on both",
  },
  {
    name: "club-vibe",
    alt: "Amber light, exposed steel and concrete over the blue courts at Foundry Padel",
  },
];

const rules = [
  {
    title: "DOUBLES ONLY",
    desc: "Padel is played in doubles on a 10m x 20m enclosed court with glass walls and metallic mesh.",
    photo: "sport-rule-doubles",
    alt: "Two pairs rally across the net on a glass-walled doubles court at Foundry Padel",
  },
  {
    title: "UNDERARM SERVE",
    desc: "The serve must be underarm, hit at or below waist height. Easier to learn, still tactical.",
    photo: "sport-rule-serve",
    alt: "A player drops low for an underarm serve at Foundry Padel",
    // The only portrait frame in the set; the fixed-ratio box crops it.
    portrait: true,
  },
  {
    title: "WALLS IN PLAY",
    desc: "Like squash, the ball can bounce off the glass walls. This creates unique angles and rallies.",
    photo: "sport-rule-walls",
    alt: "Players deep in the court by the glass back wall at Foundry Padel",
  },
  {
    title: "SCORING",
    desc: "Same scoring as tennis — 15, 30, 40, deuce, advantage. Best of 3 sets wins the match.",
    photo: "sport-rule-scoring",
    alt: "A padel ball resting against the net on Foundry Padel's blue court",
  },
];

const TheSport = () => {
  return (
    <main className="bg-background min-h-screen pt-24">
      <Seo
        title="What Is Padel? The Sport Explained | Foundry Padel Portland"
        description="New to padel? Learn the rules, how it differs from tennis, squash and pickleball, and why it's the world's fastest-growing racquet sport — then play in Portland at Foundry."
        path="/the-sport"
      />
      {/* Hero */}
      <section className="py-20 px-6">
        <div className="mx-auto max-w-4xl text-center">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
            <h1 className="font-display text-6xl sm:text-8xl text-foreground mb-4">THE SPORT</h1>
            <div className="flex items-center justify-center gap-4 mb-8">
              <div className="h-px w-16 bg-primary" />
              <span className="font-body text-sm tracking-[0.2em] uppercase text-primary">World's Fastest Growing Racquet Sport</span>
              <div className="h-px w-16 bg-primary" />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Real courts, before any of the explaining starts. The frames rotate so
          the page does not open on the same single player every visit. */}
      <section className="px-6">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="mx-auto max-w-5xl"
        >
          <PhotoCycle
            frames={heroFrames}
            className="aspect-[16/9] overflow-hidden border border-border bg-secondary"
          />
        </motion.div>
      </section>

      {/* What is Padel */}
      <section className="py-16 px-6">
        <div className="mx-auto max-w-4xl">
          <div className="section-divider mb-16" />
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }} className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="font-display text-4xl text-foreground mb-6">WHAT IS PADEL?</h2>
              <p className="font-body text-base leading-relaxed text-secondary-foreground mb-4">
                Padel is a racquet sport that combines elements of tennis and squash. Played on an enclosed court about one-third the size of a tennis court, it's always played in doubles and uses solid, stringless racquets.
              </p>
              <p className="font-body text-base leading-relaxed text-secondary-foreground mb-4">
                Born in Mexico in 1969, padel has exploded across Spain, Argentina, and everywhere in the world but the US. Over 25 million people play worldwide — and it's finally arriving in Portland. For now, we're bringing the sport to the Pacific Northwest.
              </p>
              <p className="font-body text-sm text-muted-foreground">
                The glass walls keep the ball in play, creating longer rallies, more strategy, and way more fun than you'd expect.
              </p>
            </div>
            <WistiaVideo />
          </motion.div>
        </div>
      </section>

      {/* How to Play */}
      <section className="py-16 px-6">
        <div className="mx-auto max-w-4xl">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }}>
            <h2 className="font-display text-4xl text-foreground mb-12 text-center">HOW TO PLAY</h2>
            <div className="grid sm:grid-cols-2 gap-6">
              {rules.map((rule, i) => (
                <motion.div
                  key={rule.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  className="border border-border"
                >
                  <div className="aspect-[3/2] overflow-hidden bg-secondary">
                    <Photo
                      name={rule.photo}
                      alt={rule.alt}
                      width={rule.portrait ? 1067 : 1600}
                      height={rule.portrait ? 1600 : 1067}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="p-6">
                    <span className="font-display text-5xl text-primary/30">{String(i + 1).padStart(2, "0")}</span>
                    <h3 className="font-display text-xl text-foreground mt-2 mb-2">{rule.title}</h3>
                    <p className="font-body text-sm text-muted-foreground leading-relaxed">{rule.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Padel vs Other Sports */}
      <section className="py-16 px-6">
        <div className="mx-auto max-w-4xl">
          <div className="section-divider mb-16" />
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }}>
            <h2 className="font-display text-4xl text-foreground mb-12 text-center">PADEL VS. THE REST</h2>
            <div className="border border-border overflow-hidden">
              <div className="grid grid-cols-3 bg-secondary">
                <div className="p-4 font-display text-sm tracking-widest text-muted-foreground">VS.</div>
                <div className="p-4 font-display text-sm tracking-widest text-primary">PADEL</div>
                <div className="p-4 font-display text-sm tracking-widest text-muted-foreground">OTHER</div>
              </div>
              {comparisons.map((c) => (
                <div key={c.sport} className="grid grid-cols-3 border-t border-border">
                  <div className="p-4 font-display text-lg text-foreground">{c.sport}</div>
                  <div className="p-4 font-body text-sm text-secondary-foreground">{c.padel}</div>
                  <div className="p-4 font-body text-sm text-muted-foreground">{c.other}</div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      <BookCTA />
    </main>
  );
};

export default TheSport;
