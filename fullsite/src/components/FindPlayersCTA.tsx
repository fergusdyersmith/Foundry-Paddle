import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, MessageCircle } from "lucide-react";

/** Homepage: the answer to the question BOOK A COURT leaves hanging.
 *
 *  Sits directly under "READY TO PLAY?" on purpose. Someone who has just been told to
 *  book a court is one step from the thing that actually stops people playing, which is
 *  not having three others — and matchmaking is free, so there is nothing to sell here,
 *  only something to tell them exists.
 *
 *  Deliberately NO live data. The fill rates need a fetch, and the homepage is the worst
 *  page to hang a third-party dependency off: a slow upstream would push the section
 *  around on the most-visited page we have. The numbers live one click away on
 *  /find-players, where a failure costs nothing.
 */
const FindPlayersCTA = () => (
  <section className="px-6 pb-20">
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
      className="mx-auto max-w-4xl border border-border bg-card p-8 sm:p-12"
    >
      <div className="flex flex-col items-center gap-8 text-center md:flex-row md:items-center md:gap-12 md:text-left">
        <div className="flex-1">
          <span className="font-body text-xs uppercase tracking-[0.2em] text-primary">
            Free · No membership needed
          </span>
          <h2 className="mt-3 font-display text-3xl leading-tight text-foreground sm:text-4xl">
            NOBODY TO PLAY WITH?
          </h2>
          <p className="mt-4 font-body text-base leading-relaxed text-secondary-foreground">
            You do not need to bring three friends. Tell us your level and the times you
            play, and we will message you open matches that fit. Or see which times fill
            fastest before you post one of your own.
          </p>
        </div>

        <div className="flex w-full shrink-0 flex-col items-center gap-4 md:w-auto md:items-start">
          <Link
            to="/join"
            className="inline-flex w-full items-center justify-center gap-3 bg-primary px-8 py-4 font-display text-lg tracking-widest text-primary-foreground transition-all hover:brightness-110 md:w-auto"
          >
            <MessageCircle size={20} />
            GET MATCHES SENT TO ME
          </Link>
          <Link
            to="/find-players"
            className="inline-flex items-center gap-2 font-body text-xs uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-primary"
          >
            See the best times to post <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </motion.div>
  </section>
);

export default FindPlayersCTA;
