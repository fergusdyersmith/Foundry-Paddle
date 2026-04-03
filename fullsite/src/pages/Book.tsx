import { motion } from "framer-motion";
import { Calendar, Clock, Users } from "lucide-react";
import {
  PLAYTOMIC_APP_STORE_URL,
  PLAYTOMIC_BOOKING_URL,
  PLAYTOMIC_PLAY_STORE_URL,
} from "@/constants/booking";
// import InterestEmailForm from "@/components/InterestEmailForm";

const Book = () => {
  return (
    <main className="bg-background min-h-screen pt-24">
      <section className="py-20 px-6">
        <div className="mx-auto max-w-4xl text-center">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
            <h1 className="font-display text-6xl sm:text-8xl text-foreground mb-4">BOOK A COURT</h1>
            <div className="flex items-center justify-center gap-4 mb-6">
              <div className="h-px w-16 bg-primary" />
              <span className="font-body text-sm tracking-[0.2em] uppercase text-primary">Reserve Your Spot</span>
              <div className="h-px w-16 bg-primary" />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Booking info */}
      <section className="py-12 px-6">
        <div className="mx-auto max-w-4xl">
          <div className="section-divider mb-16" />
          <div className="grid sm:grid-cols-3 gap-8 mb-16">
            {[
              { icon: Calendar, title: "7 DAYS A WEEK", desc: "Morning, afternoon, and evening slots available" },
              { icon: Clock, title: "90 MIN SESSIONS", desc: "Plenty of time to warm up, play, and cool down" },
              { icon: Users, title: "4 COURTS", desc: "WPT-spec panoramic glass courts" },
            ].map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="border border-border p-8 text-center"
              >
                <item.icon size={28} className="text-primary mx-auto mb-4" />
                <h3 className="font-display text-xl text-foreground mb-2">{item.title}</h3>
                <p className="font-body text-sm text-muted-foreground">{item.desc}</p>
              </motion.div>
            ))}
          </div>

          {/* Playtomic booking embed (replaces coming-soon email form) */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="mx-auto w-full max-w-5xl"
          >
            <h2 className="font-display text-3xl sm:text-4xl text-foreground mb-2 text-center">BOOK ONLINE</h2>
            <p className="font-body text-sm text-muted-foreground mb-6 text-center">
              Choose a time and court below. Opens our booking partner in this page.
            </p>
            <div className="overflow-hidden rounded-sm border border-border bg-muted/30">
              <iframe
                src={PLAYTOMIC_BOOKING_URL}
                title="Book a court — Playtomic"
                className="block h-[min(45vh,450px)] w-full min-h-[320px]"
                loading="lazy"
                allow="payment *; fullscreen"
              />
            </div>
            <div className="mt-8 text-center font-body text-sm text-muted-foreground">
              <div className="mb-6 flex items-center justify-center gap-4">
                <div className="h-px w-12 bg-border sm:w-16" />
                <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Or</span>
                <div className="h-px w-12 bg-border sm:w-16" />
              </div>
              <p className="mb-4 font-body text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Get the app
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4">
                <a
                  href={PLAYTOMIC_APP_STORE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-11 items-center transition-opacity hover:opacity-90"
                  aria-label="Download Playtomic on the App Store"
                >
                  <img
                    src={`${import.meta.env.BASE_URL}store-badge-apple-store.svg`}
                    alt=""
                    className="h-11 w-auto max-h-11 object-contain"
                    width={120}
                    height={40}
                  />
                </a>
                <a
                  href={PLAYTOMIC_PLAY_STORE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-11 items-center transition-opacity hover:opacity-90"
                  aria-label="Get Playtomic on Google Play"
                >
                  <img
                    src={`${import.meta.env.BASE_URL}store-badge-google-play.png`}
                    alt=""
                    className="h-11 w-auto max-h-11 object-contain"
                    width={155}
                    height={40}
                  />
                </a>
              </div>
            </div>
          </motion.div>

          {/* Coming soon + email (replaced by Playtomic embed)
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="max-w-lg mx-auto text-center"
          >
            <h2 className="font-display text-5xl text-foreground mb-3">COMING SOON</h2>
            <p className="font-body text-sm text-muted-foreground mb-8">
              Online booking launches with our opening. Drop your email and we'll let you know the moment courts go live.
            </p>

            <InterestEmailForm source="book" />
          </motion.div>
          */}
          <div className="section-divider mt-16" />
        </div>
      </section>
    </main>
  );
};

export default Book;
