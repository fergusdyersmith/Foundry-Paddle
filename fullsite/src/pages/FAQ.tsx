import { motion } from "framer-motion";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import BookCTA from "@/components/BookCTA";

const faqs = [
  {
    q: "I've never played padel. Can I still come?",
    a: "Absolutely. Padel is one of the easiest racquet sports to pick up. We offer beginner sessions, coaching clinics, and open play nights specifically designed for newcomers. You'll be rallying within minutes.",
  },
  {
    q: "What equipment do I need?",
    a: "Just yourself and athletic shoes (non-marking court shoes preferred). We provide racquets and balls for all sessions. As you get more into it, you can grab your own gear from our pro shop.",
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
    a: "Yes. We'll have certified padel coaches offering private lessons, group clinics, and structured programmes for all levels — from first-timers to competitive players.",
  },
  {
    q: "What should I wear?",
    a: "Comfortable athletic wear and non-marking court shoes. No special padel clothing required, though our pro shop will carry performance apparel.",
  },
  {
    q: "Will there be leagues and tournaments?",
    a: "Yes. We're planning regular social leagues, competitive tournaments, and inter-club events. Members will get priority registration and discounted entry.",
  },
  {
    q: "Where exactly is Foundry Padel?",
    a: "We're in St. John's, Portland — right next to Cathedral Park at 8613 N Crawford St, Portland, OR 97203. Directions and map links are on our Contact page.",
  },
  {
    q: "When are you opening?",
    a: "We're targeting a 2026 opening. Sign up for our mailing list to be the first to know the exact date and get early access to memberships.",
  },
];

const FAQ = () => {
  return (
    <main className="bg-background min-h-screen pt-24">
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
