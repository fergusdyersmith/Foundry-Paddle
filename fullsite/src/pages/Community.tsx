import { motion } from "framer-motion";
import { Head } from "vite-react-ssg";
import { Link } from "react-router-dom";
import BookCTA from "@/components/BookCTA";
import WhatsAppJoinLink from "@/components/WhatsAppJoinLink";
import { BOOK_PAGE_PATH } from "@/constants/booking";

/** WhatsApp community landing page.
 *
 *  Deliberately hidden: not in the header or footer nav, not in
 *  scripts/generate-sitemap.mjs, and noindex below. It exists so the website
 *  chatbot, Instagram and the front desk have one clean place to send people,
 *  without the invite URL itself living in any of those channels.
 *
 *  The join control is WhatsAppJoinLink, which renders a <button> and decodes
 *  the invite only on click, so the link never reaches the markup. Putting a
 *  plain <a href> here would undo the point of the page. */

const highlights = [
  {
    title: "CHATS BY LEVEL",
    desc: "Group chats are split by how you play, from people who have never held a racket to the competitive crowd. Join the one that fits and you will actually get games at your level.",
  },
  {
    title: "FILL A SPOT FAST",
    desc: "Two players and need two more? Post it. Somebody is nearly always looking for a game, and open matches fill quickest here.",
  },
  {
    title: "SEE WHAT IS ON",
    desc: "Members share tournaments, clinics, last-minute cancellations and the games that are not on the schedule yet.",
  },
];

const Community = () => {
  return (
    <main className="bg-background min-h-screen pt-24">
      <Head>
        <title>The Foundry Padel Community</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      {/* Hero */}
      <section className="py-20 px-6">
        <div className="mx-auto max-w-4xl text-center">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
            <h1 className="font-display text-6xl sm:text-8xl text-foreground mb-4">THE COMMUNITY</h1>
            <div className="flex items-center justify-center gap-4 mb-6">
              <div className="h-px w-16 bg-primary" />
              <span className="font-body text-sm tracking-[0.2em] uppercase text-primary">Never Play Alone</span>
              <div className="h-px w-16 bg-primary" />
            </div>
            <p className="font-body text-base text-secondary-foreground max-w-xl mx-auto">
              Our WhatsApp community is where Foundry players find games. Post a match,
              claim an empty spot, or just see what is happening this week.
            </p>
          </motion.div>
        </div>
      </section>

      {/* What it is */}
      <section className="py-12 px-6">
        <div className="mx-auto max-w-5xl grid md:grid-cols-3 gap-6">
          {highlights.map((h, i) => (
            <motion.div
              key={h.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="border border-border p-8"
            >
              <h2 className="font-display text-2xl text-foreground mb-3">{h.title}</h2>
              <p className="font-body text-sm leading-relaxed text-secondary-foreground">{h.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Join */}
      <section className="py-16 px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-3xl border border-primary/40 p-8 sm:p-12 text-center"
        >
          <h2 className="font-display text-3xl sm:text-4xl text-foreground mb-4">JOIN THE GROUP</h2>
          <p className="font-body text-base text-secondary-foreground max-w-lg mx-auto mb-8">
            Free to join, and open to anyone who plays at Foundry. Tap below and WhatsApp
            will do the rest.
          </p>
          <WhatsAppJoinLink
            iconSize={22}
            className="inline-flex items-center gap-3 bg-primary px-10 py-4 font-display text-lg tracking-widest text-primary-foreground transition-all hover:brightness-110"
          >
            JOIN ON WHATSAPP
          </WhatsAppJoinLink>
          {/* This used to read "Looking for club updates by text instead?", which is not
              what /join does. /join signs you up with Kumi, which then messages you open
              matches picked for your level and the times you actually play. Describing it
              as a newsletter undersold the one thing most visitors on this page want. */}
          <p className="font-body text-xs text-muted-foreground mt-8">
            Prefer matches sent straight to you? Sign up at{" "}
            <Link to="/join" className="text-primary underline underline-offset-2">
              foundrypadel.com/join
            </Link>{" "}
            and Kumi will message you open matches at your level, at the times you play.
          </p>
        </motion.div>
      </section>

      {/* Open matches live in Playtomic, so say so rather than let people assume
          the group is the only way to find a game. */}
      <section className="pb-8 px-6">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-3xl text-center"
        >
          <p className="font-body text-sm text-muted-foreground">
            Open matches and casual tournaments are also posted on Playtomic, where you can
            book a place directly.{" "}
            <Link to={BOOK_PAGE_PATH} className="text-primary underline underline-offset-2">
              Find a match
            </Link>
            .
          </p>
        </motion.div>
      </section>

      <BookCTA />
    </main>
  );
};

export default Community;
