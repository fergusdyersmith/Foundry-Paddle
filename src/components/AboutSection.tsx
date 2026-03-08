import { motion } from "framer-motion";

const features = [
  { label: "4", desc: "Indoor Courts" },
  { label: "1", desc: "Social Café" },
  { label: "∞", desc: "Good Times" },
];

const AboutSection = () => {
  return (
    <section className="relative py-28 px-6">
      <div className="mx-auto max-w-4xl">
        <div className="section-divider mb-20" />

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
          className="max-w-2xl mx-auto text-center mb-20"
        >
          <h2 className="font-display text-4xl sm:text-5xl text-foreground mb-6">
            NOT PICKLEBALL.
          </h2>
          <p className="font-body text-base leading-relaxed text-secondary-foreground">
            Padel is the fastest-growing racquet sport on the planet. Enclosed glass courts, 
            strategic wall play, and an energy that's part tennis, part squash, and entirely addictive. 
            Foundry Padel is bringing the sport to Portland — 
            four indoor courts, a curated social space, café, and retail, all next to Cathedral Park.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="grid md:grid-cols-3 gap-12"
        >
          {features.map((f) => (
            <div key={f.desc} className="text-center">
              <span className="font-display text-6xl text-primary">{f.label}</span>
              <p className="mt-2 font-body text-sm tracking-[0.15em] uppercase text-muted-foreground">
                {f.desc}
              </p>
            </div>
          ))}
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
  );
};

export default AboutSection;
