import { motion } from "framer-motion";
import { Head } from "vite-react-ssg";
import { Link } from "react-router-dom";
import { ArrowRight, Mail, Phone } from "lucide-react";
import Photo from "@/components/Photo";
import Seo from "@/components/Seo";
import { GALLERY_IMAGE_DIR } from "@/data/gallery";
import { GOOGLE_MAPS_URL } from "@/constants/location";
import { HOURS_SENTENCE } from "@/constants/hours";

/**
 * Venue and capacity page for group bookings, corporate offsites and buyouts.
 *
 * Built for the Travel Portland venue listing, which asks for a public page
 * carrying the space inventory and capacity figures — so the numbers below are
 * the ones we submit there, and this page is the source they cite. Keep the two
 * in sync: if a capacity changes, it changes here first.
 *
 * Note that "events" elsewhere in this codebase (/api/events, EventsModal,
 * lib/events.ts) means a Playtomic session — a clinic, an open match, a
 * tournament. This page is unrelated to those; it is about hiring the building.
 */

const EVENTS_EMAIL = "portland@foundrypadel.com";
const EVENTS_PHONE_DISPLAY = "(971) 378-7499";
const EVENTS_PHONE_TEL = "+19713787499";
const MAILTO = `mailto:${EVENTS_EMAIL}?subject=${encodeURIComponent("Event inquiry — Foundry Padel")}`;

const headlineStats = [
  { stat: "18,600", label: "Square feet" },
  { stat: "250", label: "Reception capacity" },
  { stat: "43 ft", label: "Clear ceilings" },
  { stat: "4", label: "Glass courts" },
];

const spaces = [
  {
    space: "Court floor",
    desc: "Four glass courts, open bay under exposed steel structure",
    sqft: "13,800",
  },
  {
    space: "Ground floor lounge",
    desc: "Lounge, pro shop, locker rooms and showers",
    sqft: "2,400",
  },
  {
    space: "Mezzanine",
    desc: "Second floor viewing area overlooking the courts",
    sqft: "2,400",
  },
];

const TOTAL_SQFT = "18,600";

const capacities = [
  { config: "Full facility buyout", reception: "250", seated: "100", playing: "16 at once" },
  { config: "Court floor only", reception: "150", seated: "Not suited", playing: "16 at once" },
  { config: "Ground floor lounge", reception: "50", seated: "50", playing: "—" },
  { config: "Mezzanine", reception: "50", seated: "50", playing: "—" },
  { config: "Single court block", reception: "—", seated: "—", playing: "4 at once" },
];

const formats = [
  "Corporate offsites and team building",
  "Client entertaining and hosted receptions",
  "Beginner clinics with our coaching staff",
  "Round robin and tournament brackets",
  "Conference attendee activities",
  "Product launches and brand activations",
  "Filming and photo production",
  "Private parties and celebrations",
  "League and recurring group bookings",
];

const specs: { group: string; rows: [string, string][] }[] = [
  {
    group: "The building",
    rows: [
      ["Courts", "4, tournament spec glass"],
      ["Ceiling height", "43 ft clear"],
      ["Flooring", "Court turf / polished concrete"],
      ["Lighting", "LED throughout"],
      ["Climate", "Indoor, heated — playable year round"],
    ],
  },
  {
    group: "On site",
    rows: [
      ["Parking", "6 spots on site, free street parking nearby"],
      ["Locker rooms", "Yes, with showers"],
      ["Equipment", "Rackets and balls provided"],
      ["Coaching", "On staff"],
      ["Beverage", "Beer and wine served on site"],
    ],
  },
];

const sectionHeading = "font-display text-4xl sm:text-5xl text-foreground";
const cellClass = "border-b border-border/60 px-4 py-3 font-body text-sm text-secondary-foreground";
const headCellClass =
  "border-b border-border px-4 py-3 text-left font-body text-[0.7rem] tracking-[0.15em] uppercase text-muted-foreground";

const Events = () => {
  return (
    <main className="bg-background min-h-screen">
      <Seo
        title="Private Events & Venue Buyouts — 18,600 sq ft, 250 Guests | Foundry Padel"
        description="Host your event at Portland's first indoor padel club. 18,600 sq ft in St. Johns with 43 ft ceilings, four glass courts, a lounge and a mezzanine — up to 250 for a reception, 100 seated."
        path="/events"
      />
      {/* Venue structured data. The club's LocalBusiness record lives in
          index.html; this adds the capacity figures an event venue is searched
          on, keyed to the same @id so the two describe one place. */}
      <Head>
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "EventVenue",
            "@id": "https://www.foundrypadel.com/#club",
            name: "Foundry Padel",
            url: "https://www.foundrypadel.com/events",
            description:
              "An 18,600 square foot indoor padel club in St. Johns, Portland, available for corporate offsites, receptions, tournaments and full facility buyouts.",
            maximumAttendeeCapacity: 250,
            email: EVENTS_EMAIL,
            telephone: EVENTS_PHONE_TEL,
            address: {
              "@type": "PostalAddress",
              streetAddress: "8613 N Crawford St",
              addressLocality: "Portland",
              addressRegion: "OR",
              postalCode: "97203",
              addressCountry: "US",
            },
          })}
        </script>
      </Head>

      {/* Hero */}
      <section className="relative flex min-h-[80vh] w-full items-center overflow-hidden">
        <div className="absolute inset-0">
          <Photo
            name="night-courts-panorama"
            dir={GALLERY_IMAGE_DIR}
            alt="Amber light over the blue courts at Foundry Padel after dark"
            className="h-full w-full object-cover"
            priority
          />
          {/* The gallery frames are bright enough to swallow the eyebrow and the
              headline on their own, so the hero carries a flat scrim under the
              usual bottom gradient. */}
          <div className="absolute inset-0 bg-background/55" />
          <div className="hero-gradient absolute inset-0" />
        </div>
        <div className="relative z-10 mx-auto max-w-3xl px-6 pt-24 text-center">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
            <span className="font-body text-sm tracking-[0.2em] uppercase text-primary">
              Group bookings · Offsites · Buyouts
            </span>
            <h1 className="mt-4 font-display text-6xl sm:text-8xl leading-none text-foreground">EVENTS</h1>
            <p className="mx-auto mt-6 max-w-xl font-body text-base text-secondary-foreground">
              18,600 square feet of converted warehouse in St. Johns, with four glass
              courts under 43 foot ceilings. A rare offsite where every guest can play,
              whatever they have played before.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <a
                href={MAILTO}
                className="bg-primary px-10 py-4 font-display text-lg tracking-widest text-primary-foreground shadow-[0_0_40px_-8px_hsl(var(--primary)/0.7)] transition-all hover:brightness-110"
              >
                INQUIRE ABOUT AN EVENT
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Headline numbers */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
            className="grid grid-cols-2 gap-10 border border-border p-10 text-center sm:grid-cols-4"
          >
            {headlineStats.map((f) => (
              <div key={f.label}>
                <span className="font-display text-4xl text-primary">{f.stat}</span>
                <p className="mt-2 font-body text-xs tracking-[0.15em] uppercase text-muted-foreground">{f.label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* The venue */}
      <section className="px-6 pb-8">
        <div className="mx-auto max-w-5xl">
          <div className="section-divider mb-16" />
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
            className="grid gap-12 md:grid-cols-2 md:items-center"
          >
            <div>
              <h2 className={sectionHeading}>THE VENUE</h2>
              <p className="mt-6 font-body text-base leading-relaxed text-secondary-foreground">
                Four tournament spec glass padel courts inside a converted warehouse, plus a
                ground floor lounge and a second floor viewing mezzanine. Padel is played in
                doubles on an enclosed glass court and is learnable in about ten minutes,
                which makes it one of the few offsite activities where every guest can take
                part regardless of athletic background.
              </p>
              <p className="mt-4 font-body text-sm leading-relaxed text-muted-foreground">
                Indoor and climate controlled, so it plays the same in February as it does in
                July. We are open {HOURS_SENTENCE}, and the building is{" "}
                <a
                  href={GOOGLE_MAPS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-secondary-foreground underline decoration-primary/50 underline-offset-4 transition-colors hover:text-primary"
                >
                  8613 N Crawford St
                </a>
                , in St. Johns beside Cathedral Park.
              </p>
            </div>
            <div className="aspect-[3/2] overflow-hidden border border-border bg-secondary">
              <Photo
                name="club-social"
                alt="Four players high-five over the net at the end of a match at Foundry Padel"
                className="h-full w-full object-cover"
              />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Space inventory */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
          >
            <h2 className={sectionHeading}>SPACE INVENTORY</h2>
            <div className="mt-8 overflow-x-auto border border-border">
              <table className="w-full min-w-[34rem] border-collapse">
                <thead>
                  <tr>
                    <th className={headCellClass}>Space</th>
                    <th className={headCellClass}>Description</th>
                    <th className={`${headCellClass} text-right`}>Sq. ft.</th>
                  </tr>
                </thead>
                <tbody>
                  {spaces.map((s) => (
                    <tr key={s.space}>
                      <td className={`${cellClass} whitespace-nowrap text-foreground`}>{s.space}</td>
                      <td className={cellClass}>{s.desc}</td>
                      <td className={`${cellClass} whitespace-nowrap text-right`}>{s.sqft}</td>
                    </tr>
                  ))}
                  <tr className="bg-secondary/60">
                    <td className="px-4 py-3 font-body text-sm text-foreground">Total</td>
                    <td className="px-4 py-3 font-body text-sm text-secondary-foreground">
                      Full facility buyout
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-body text-sm text-primary">
                      {TOTAL_SQFT}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Capacity */}
      <section className="px-6 pb-16">
        <div className="mx-auto max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
          >
            <h2 className={sectionHeading}>CAPACITY BY CONFIGURATION</h2>
            <div className="mt-8 overflow-x-auto border border-border">
              <table className="w-full min-w-[34rem] border-collapse">
                <thead>
                  <tr>
                    <th className={headCellClass}>Configuration</th>
                    <th className={`${headCellClass} text-right`}>Reception</th>
                    <th className={`${headCellClass} text-right`}>Seated</th>
                    <th className={`${headCellClass} text-right`}>Playing</th>
                  </tr>
                </thead>
                <tbody>
                  {capacities.map((c) => (
                    <tr key={c.config}>
                      <td className={`${cellClass} text-foreground`}>{c.config}</td>
                      <td className={`${cellClass} whitespace-nowrap text-right`}>{c.reception}</td>
                      <td className={`${cellClass} whitespace-nowrap text-right`}>{c.seated}</td>
                      <td className={`${cellClass} whitespace-nowrap text-right`}>{c.playing}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-4 font-body text-xs leading-relaxed text-muted-foreground">
              Maximum legal occupancy 300. Reception figures are guest counts and exclude
              staff, coaching and catering crew. A full buyout reception distributes guests
              across the court floor, the lounge and the mezzanine.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Two things most venues cannot offer */}
      <section className="px-6 pb-16">
        <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-2">
          {[
            {
              title: "43 FOOT CLEAR CEILINGS",
              body: "The court floor carries an unobstructed 43 feet of height, well beyond what the sport requires. That leaves room for rigging, large format projection, tall staging, uplighting and branded structures that most offsite venues cannot accommodate.",
            },
            {
              title: "ROLLING EVENT FORMAT",
              body: "Courts rotate on 10 to 15 minute blocks. Over a four hour event that is roughly 220 player slots across the four courts — enough for 100 guests to play about 30 minutes each, or for every guest at a 200 person event to get court time. Non-playing guests gather in the lounge and on the mezzanine, so the group stays together and nobody waits.",
            },
          ].map((c, i) => (
            <motion.div
              key={c.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.1 }}
              className="border-l-2 border-primary bg-secondary/40 p-8"
            >
              <h3 className="font-display text-xl text-foreground">{c.title}</h3>
              <p className="mt-3 font-body text-sm leading-relaxed text-muted-foreground">{c.body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Formats */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-5xl">
          <div className="section-divider mb-16" />
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
          >
            <h2 className={sectionHeading}>WHAT WE HOST</h2>
            <ul className="mt-8 grid gap-x-10 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
              {formats.map((f) => (
                <li key={f} className="flex items-start gap-3">
                  <span aria-hidden className="mt-[0.55rem] h-px w-4 shrink-0 bg-primary" />
                  <span className="font-body text-sm leading-relaxed text-secondary-foreground">{f}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      </section>

      {/* Specifications */}
      <section className="px-6 pb-16">
        <div className="mx-auto max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
          >
            <h2 className={sectionHeading}>FACILITY SPECIFICATIONS</h2>
            <div className="mt-8 grid gap-10 md:grid-cols-2">
              {specs.map((s) => (
                <div key={s.group}>
                  <span className="font-body text-xs tracking-[0.2em] uppercase text-primary">{s.group}</span>
                  <dl className="mt-4 border-t border-border">
                    {s.rows.map(([term, value]) => (
                      <div
                        key={term}
                        className="flex items-baseline justify-between gap-6 border-b border-border/60 py-3"
                      >
                        <dt className="font-body text-sm text-muted-foreground">{term}</dt>
                        <dd className="text-right font-body text-sm text-foreground">{value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Food & beverage */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-5xl">
          <div className="section-divider mb-16" />
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8 }}
            className="grid gap-12 md:grid-cols-2 md:items-center"
          >
            <div className="aspect-[3/2] overflow-hidden border border-border bg-secondary md:order-2">
              <Photo
                name="club-bar"
                alt="Padel shoes tucked under a lounge table between matches at Foundry Padel"
                className="h-full w-full object-cover"
              />
            </div>
            <div className="md:order-1">
              <h2 className={sectionHeading}>FOOD &amp; BEVERAGE</h2>
              <p className="mt-6 font-body text-base leading-relaxed text-secondary-foreground">
                Beer and wine are served on site. Food is flexible: groups can order in from
                the St. Johns restaurants a few blocks away, or bring a caterer of their
                choosing. A prep kitchen on the mezzanine level is available to caterers,
                which most unique venues in Portland cannot offer.
              </p>
              <p className="mt-4 font-body text-sm leading-relaxed text-muted-foreground">
                No exclusive vendor list, and no mandatory in-house catering.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Inquire */}
      <section className="px-6 pb-28 pt-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="mx-auto max-w-2xl text-center"
        >
          <div className="section-divider mb-12" />
          <h2 className="font-display text-5xl sm:text-6xl text-foreground mb-4">PLAN YOUR EVENT</h2>
          <p className="mb-10 font-body text-sm leading-relaxed text-muted-foreground">
            Individual courts, court blocks and full facility buyouts are all available.
            Tell us your group size, your date and roughly how long you have, and we will
            come back with a format and a price.
          </p>
          <a
            href={MAILTO}
            className="inline-block bg-primary px-12 py-4 font-display text-xl tracking-widest text-primary-foreground transition-all hover:brightness-110"
          >
            EMAIL US
          </a>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
            <a
              href={MAILTO}
              className="inline-flex items-center gap-2 font-body text-sm text-secondary-foreground transition-colors hover:text-primary"
            >
              <Mail size={16} className="text-primary" />
              {EVENTS_EMAIL}
            </a>
            <a
              href={`tel:${EVENTS_PHONE_TEL}`}
              className="inline-flex items-center gap-2 font-body text-sm text-secondary-foreground transition-colors hover:text-primary"
            >
              <Phone size={16} className="text-primary" />
              {EVENTS_PHONE_DISPLAY}
            </a>
          </div>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
            <Link
              to="/gallery"
              className="inline-flex items-center gap-2 font-display text-xs tracking-[0.2em] text-muted-foreground transition-colors hover:text-primary"
            >
              SEE THE SPACE <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link
              to="/the-sport"
              className="inline-flex items-center gap-2 font-display text-xs tracking-[0.2em] text-muted-foreground transition-colors hover:text-primary"
            >
              WHAT IS PADEL? <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="section-divider mt-12" />
        </motion.div>
      </section>
    </main>
  );
};

export default Events;
