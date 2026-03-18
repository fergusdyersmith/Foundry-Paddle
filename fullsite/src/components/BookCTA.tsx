import { Link } from "react-router-dom";
import { motion } from "framer-motion";

const BookCTA = () => (
  <section className="py-20 px-6">
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8 }}
      className="mx-auto max-w-2xl text-center"
    >
      <div className="section-divider mb-12" />
      <h2 className="font-display text-5xl sm:text-6xl text-foreground mb-4">
        READY TO PLAY?
      </h2>
      <p className="font-body text-sm tracking-[0.15em] uppercase text-muted-foreground mb-10">
        Reserve your court and experience Portland's first padel club
      </p>
      <Link
        to="/fullsite/book"
        className="inline-block border border-primary px-12 py-4 font-display text-xl tracking-widest text-primary transition-all hover:bg-primary hover:text-primary-foreground"
      >
        BOOK A COURT
      </Link>
      <div className="section-divider mt-12" />
    </motion.div>
  </section>
);

export default BookCTA;
