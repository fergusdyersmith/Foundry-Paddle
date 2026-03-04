import { motion } from "framer-motion";
import heroImage from "@/assets/hero-padel.jpg";

const HeroSection = () => {
  const scrollToRegister = () => {
    document.getElementById("register")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className="relative h-screen w-full overflow-hidden">
      {/* Background image */}
      <div className="absolute inset-0">
        <img
          src={heroImage}
          alt="Indoor padel court with dramatic lighting"
          className="h-full w-full object-cover"
        />
        <div className="hero-gradient absolute inset-0" />
      </div>

      {/* Decorative court lines */}
      <div className="absolute inset-0 flex justify-between px-[20%] pointer-events-none">
        <div className="court-line h-full" />
        <div className="court-line h-full" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex h-full flex-col items-center justify-end pb-24 px-6">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="text-center"
        >
          <h1 className="font-display text-7xl sm:text-8xl md:text-9xl tracking-wider text-foreground leading-none">
            FOUNDRY
          </h1>
          <div className="flex items-center justify-center gap-4 mt-1">
            <div className="h-px w-12 bg-primary" />
            <span className="font-display text-2xl sm:text-3xl tracking-[0.3em] text-primary">
              PADEL
            </span>
            <div className="h-px w-12 bg-primary" />
          </div>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.5 }}
          className="mt-6 font-body text-sm tracking-[0.2em] uppercase text-muted-foreground"
        >
          Portland's First Padel Club — Coming Soon
        </motion.p>

        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          onClick={scrollToRegister}
          className="mt-10 border border-primary px-10 py-3 font-display text-lg tracking-widest text-primary transition-all hover:bg-primary hover:text-primary-foreground"
        >
          REGISTER INTEREST
        </motion.button>
      </div>
    </section>
  );
};

export default HeroSection;
