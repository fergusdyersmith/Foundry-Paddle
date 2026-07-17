import { motion } from "framer-motion";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import BookCTA from "@/components/BookCTA";
import Seo from "@/components/Seo";
import WhatsAppJoinLink from "@/components/WhatsAppJoinLink";

interface Faq {
  q: string;
  a: string;
  /** Optional CTA rendered under the answer. */
  cta?: "whatsapp";
}

const faqs: Faq[] = [
  {
    q: "I've never played padel. Can I still come?",
    a: "Absolutely. Padel is one of the easiest racquet sports to pick up. We offer beginner sessions, coaching clinics, and open play nights specifically designed for newcomers. You'll be rallying within minutes.",
  },
  {
    q: "What equipment do I need?",
    a: "Just yourself and athletic shoes (non-marking court shoes preferred). Racket rentals are $5, or $10 for a high-end demo racket, and balls are available for purchase. As you get more into it, you can grab your own gear from our pro shop.",
  },
  {
    q: "How is padel different from tennis?",
    a: "Padel is played on a smaller enclosed court with glass walls. The ball can be played off the walls (like squash), it's always doubles, and the serve is underarm. It's more social, more accessible, and the rallies last longer.",
  },
  {
    q: "How is padel different from pickleball?",
    a: "Padel uses a solid racquet (not a paddle), a depressurised tennis ball, and an enclosed court with walls in play. It's a full racquet sport with more physical movement, strategy, and rally length.",
  },
  {
    q: "How many people do I need to play?",
    a: "Padel is always played in doubles — so you need 4 players. Don't have a full group? Join our open play sessions or use our player matching feature to find partners.",
  },
  {
    q: "How long is a typical session?",
    a: "Court bookings are 90 minutes. A casual match typically takes 60–75 minutes, leaving time to warm up and cool down.",
  },
  {
    q: "Do you offer coaching?",
    a: "Yes. Our certified padel coaches offer private lessons, group clinics, and structured programmes for all levels — from first-timers to competitive players. See what's on via the Schedule page.",
  },
  {
    q: "What should I wear?",
    a: "Comfortable athletic wear and non-marking court shoes. No special padel clothing required, and our pro shop stocks balls, racquets, and performance apparel if you need anything.",
  },
  {
    q: "Do you run leagues and tournaments?",
    a: "Yes. We run regular tournaments and open play, with social leagues and inter-club events too. Members get priority registration and discounted entry.",
  },
  {
    q: "Is there a community I can join?",
    a: "Yes — we run an active WhatsApp community where members and players organise games, find partners, and hear about open play, clinics, and events first. Everyone's welcome, whatever your level.",
    cta: "whatsapp",
  },
  {
    q: "Where exactly is Foundry Padel?",
    a: "We're in St. John's, Portland — right next to Cathedral Park at 8613 N Crawford St, Portland, OR 97203. Directions and map links are on our Contact page.",
  },
  {
    q: "What are your hours?",
    a: "We're open! All four courts are available every day from 8:00 AM to 10:00 PM. Book a court online or through the Playtomic app, and check the Schedule page for clinics, open play, lessons, and tournaments.",
  },
];

const FAQ = () => {
  return (
    <main className="bg-background min-h-screen pt-24">
      <Seo
        title="Padel FAQ — Beginners, Gear, Hours & Location | Foundry Padel"
        description="Never played padel? A first-timer's guide: no partner needed, racket rentals from $5, hours (8am–10pm daily), pricing, and how to find us in St. Johns, Portland."
        path="/faq"
      />
      <section className="py-20 px-6">
        <div className="mx-auto max-w-4xl text-center">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
            <h1 className="font-display text-6xl sm:text-8xl text-foreground mb-4">FAQ</h1>
            <div className="flex items-center justify-center gap-4 mb-6">
              <div className="h-px w-16 bg-primary" />
              <span className="font-body text-sm tracking-[0.2em] uppercase text-primary">First-Timer Friendly</span>
              <div className="h-px w-16 bg-primary" />
            </div>
          </motion.div>
        </div>
      </section>

      <section className="pb-20 px-6">
        <div className="mx-auto max-w-3xl">
          <div className="section-divider mb-12" />
          <Accordion type="single" collapsible className="space-y-2">
            {faqs.map((faq, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
              >
                <AccordionItem value={`item-${i}`} className="border border-border px-6">
                  <AccordionTrigger className="font-display text-lg text-foreground hover:text-primary hover:no-underline">
                    {faq.q}
                  </AccordionTrigger>
                  <AccordionContent className="font-body text-sm text-secondary-foreground leading-relaxed">
                    {faq.a}
                    {faq.cta === "whatsapp" && (
                      <WhatsAppJoinLink
                        iconSize={16}
                        className="mt-4 inline-flex items-center gap-2 border border-primary px-4 py-2 font-display text-xs tracking-widest text-primary transition-all hover:bg-primary hover:text-primary-foreground"
                      >
                        JOIN THE WHATSAPP GROUP
                      </WhatsAppJoinLink>
                    )}
                  </AccordionContent>
                </AccordionItem>
              </motion.div>
            ))}
          </Accordion>
          <div className="section-divider mt-12" />
        </div>
      </section>

      <BookCTA />
    </main>
  );
};

export default FAQ;
