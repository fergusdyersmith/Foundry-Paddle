import { motion } from "framer-motion";
import BookCTA from "@/components/BookCTA";

const comparisons = [
  { sport: "Tennis", padel: "Enclosed glass walls — balls stay in play", other: "Open court — balls go out" },
  { sport: "Squash", padel: "Outdoor feel, doubles format, social game", other: "Indoor, typically singles, intense" },
  { sport: "Pickleball", padel: "Full racquet sport with wall strategy", other: "Paddle sport, no walls, smaller court" },
];

const rules = [
  { title: "DOUBLES ONLY", desc: "Padel is played in doubles on a 10m x 20m enclosed court with glass walls and metallic mesh." },
  { title: "UNDERARM SERVE", desc: "The serve must be underarm, hit at or below waist height. Easier to learn, still tactical." },
  { title: "WALLS IN PLAY", desc: "Like squash, the ball can bounce off the glass walls. This creates unique angles and rallies." },
  { title: "SCORING", desc: "Same scoring as tennis — 15, 30, 40, deuce, advantage. Best of 3 sets wins the match." },
];

const TheSport = () => {
  return (
    <main className="bg-background min-h-screen pt-24">
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
            <div className="aspect-video bg-secondary border border-border flex items-center justify-center">
              <div className="text-center">
                <span className="font-display text-3xl text-muted-foreground">▶</span>
                <p className="font-body text-xs tracking-[0.15em] uppercase text-muted-foreground mt-2">Gameplay Video Coming Soon</p>
              </div>
            </div>
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
                  className="border border-border p-6"
                >
                  <span className="font-display text-5xl text-primary/30">{String(i + 1).padStart(2, "0")}</span>
                  <h3 className="font-display text-xl text-foreground mt-2 mb-2">{rule.title}</h3>
                  <p className="font-body text-sm text-muted-foreground leading-relaxed">{rule.desc}</p>
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
