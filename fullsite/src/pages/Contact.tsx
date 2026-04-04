import { motion } from "framer-motion";
import { Instagram, Facebook, Mail, MapPin, Clock } from "lucide-react";
import { GOOGLE_MAPS_EMBED_SRC, GOOGLE_MAPS_URL } from "@/constants/location";
import StayInTouchForm from "@/components/StayInTouchForm";

const TikTokIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
  </svg>
);

const Contact = () => {
  return (
    <main className="bg-background min-h-screen pt-24">
      <section className="py-20 px-6">
        <div className="mx-auto max-w-4xl text-center">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
            <h1 className="font-display text-6xl sm:text-8xl text-foreground mb-4">CONTACT</h1>
            <div className="flex items-center justify-center gap-4 mb-6">
              <div className="h-px w-16 bg-primary" />
              <span className="font-body text-sm tracking-[0.2em] uppercase text-primary">Get In Touch</span>
              <div className="h-px w-16 bg-primary" />
            </div>
          </motion.div>
        </div>
      </section>

      <section className="pb-20 px-6">
        <div className="mx-auto max-w-5xl">
          <div className="section-divider mb-16" />
          <div className="grid md:grid-cols-2 gap-16">
            {/* Info */}
            <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }}>
              <h2 className="font-display text-3xl text-foreground mb-8">FIND US</h2>
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <MapPin size={18} className="text-primary mt-1 shrink-0" />
                  <div>
                    <a href={GOOGLE_MAPS_URL} target="_blank" rel="noopener noreferrer" className="font-body text-sm text-foreground hover:text-primary transition-colors">
                      8613 N Crawford St, Portland, OR 97203
                    </a>
                    <p className="font-body text-xs text-muted-foreground">Portland — near Cathedral Park</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <Clock size={18} className="text-primary mt-1 shrink-0" />
                  <div>
                    <p className="font-body text-sm text-foreground">Opening 2026</p>
                    <p className="font-body text-xs text-muted-foreground">Hours announced closer to opening</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <Mail size={18} className="text-primary mt-1 shrink-0" />
                  <div>
                    <a href="mailto:portland@foundrypadel.com" className="font-body text-sm text-foreground hover:text-primary transition-colors">
                      portland@foundrypadel.com
                    </a>
                  </div>
                </div>
              </div>

              <div className="mt-10">
                <span className="font-body text-xs uppercase tracking-[0.2em] text-muted-foreground">Follow Us</span>
                <div className="flex items-center gap-5 mt-3">
                  <a href="https://instagram.com/foundrypadelpdx" target="_blank" rel="noopener noreferrer" className="text-muted-foreground transition-colors hover:text-primary"><Instagram size={20} /></a>
                  <a href="https://www.facebook.com/share/1Cerw2CTec/?mibextid=wwXIfr" target="_blank" rel="noopener noreferrer" className="text-muted-foreground transition-colors hover:text-primary"><Facebook size={20} /></a>
                  <a href="https://tiktok.com/@foundry.padel" target="_blank" rel="noopener noreferrer" className="text-muted-foreground transition-colors hover:text-primary"><TikTokIcon size={20} /></a>
                </div>
              </div>

              {/* Map */}
              <div className="mt-10">
                <a
                  href={GOOGLE_MAPS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block aspect-[4/3] border border-border overflow-hidden"
                  aria-label="View on Google Maps"
                >
                  <iframe
                    title="Foundry Padel location"
                    src={GOOGLE_MAPS_EMBED_SRC}
                    className="w-full h-full pointer-events-none"
                    style={{ filter: "grayscale(1) invert(1) contrast(1.2) brightness(0.6)" }}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </a>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8, delay: 0.1 }}>
              <StayInTouchForm
                source="contact"
                headingClassName="font-display text-3xl text-foreground mb-3"
                subtitleClassName="font-body text-sm tracking-[0.15em] uppercase text-muted-foreground mb-8"
              />
            </motion.div>
          </div>
        </div>
      </section>
    </main>
  );
};

export default Contact;
