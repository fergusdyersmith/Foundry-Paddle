import { Instagram, Facebook, Mail, MapPin, Clock, Car } from "lucide-react";
import { GOOGLE_MAPS_URL } from "@/constants/location";
import StayInTouchForm from "@/components/StayInTouchForm";
import WhatsAppJoinLink from "@/components/WhatsAppJoinLink";
import WhatsAppIcon from "@/components/WhatsAppIcon";
import Photo from "@/components/Photo";
import { HOURS_LINE, HOURS_META } from "@/constants/hours";
import MapEmbed from "@/components/MapEmbed";
import Seo from "@/components/Seo";
import PageHeader from "@/components/PageHeader";
import Reveal from "@/components/motion/Reveal";

const TikTokIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
  </svg>
);

const Contact = () => {
  return (
    <main className="bg-background min-h-screen pt-24">
      <Seo
        title="Contact & Location: 8613 N Crawford St | Foundry Padel Portland"
        description={`Find Foundry Padel at 8613 N Crawford St, Portland, OR 97203, in St. Johns near Cathedral Park. Open daily ${HOURS_META}. Parking on site, plus map, directions and how to find the entrance.`}
        path="/contact"
      />
      <section className="py-20 px-6">
        <div className="mx-auto max-w-4xl text-center">
          <PageHeader title="CONTACT" kicker="Get In Touch" />
        </div>
      </section>

      <section className="pb-20 px-6">
        <div className="mx-auto max-w-5xl">
          <div className="section-divider mb-16" />
          <div className="grid md:grid-cols-2 gap-16">
            {/* Info */}
            <Reveal>
              <h2 className="font-display text-3xl text-foreground mb-6">FIND US</h2>
              <div className="mb-8 aspect-[3/2] overflow-hidden border border-border bg-secondary">
                <Photo
                  name="contact-interior"
                  alt="Daylight through the open rollup door at Foundry Padel's St. Johns entrance"
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <MapPin size={18} className="text-primary mt-1 shrink-0" />
                  <div>
                    <a href={GOOGLE_MAPS_URL} target="_blank" rel="noopener noreferrer" className="font-body text-sm text-foreground hover:text-primary transition-colors">
                      8613 N Crawford St, Portland, OR 97203
                    </a>
                    <p className="font-body text-xs text-muted-foreground">Portland, near Cathedral Park</p>
                    {/* First-timers stand outside the rollup doors and cannot find
                        the way in. It is the most common question on the phone
                        after the address itself. */}
                    <p className="font-body text-xs text-muted-foreground mt-2">
                      If the two rollup doors are closed, the entrance is the door to
                      the left of them, in the brick building.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <Car size={18} className="text-primary mt-1 shrink-0" />
                  <div>
                    <p className="font-body text-sm text-foreground">6 parking spots on site</p>
                    <p className="font-body text-xs text-muted-foreground">Plenty of street parking nearby</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <Clock size={18} className="text-primary mt-1 shrink-0" />
                  <div>
                    <p className="font-body text-sm text-foreground">{HOURS_LINE}</p>
                    <p className="font-body text-xs text-muted-foreground">All 4 courts · 7 days a week</p>
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
                <div className="flex items-start gap-4">
                  <span className="text-primary mt-1 shrink-0"><WhatsAppIcon size={18} /></span>
                  <div>
                    <WhatsAppJoinLink hideIcon className="font-body text-sm text-foreground hover:text-primary transition-colors">
                      Join our WhatsApp community
                    </WhatsAppJoinLink>
                    <p className="font-body text-xs text-muted-foreground">Match-ups, events &amp; club chat</p>
                  </div>
                </div>
              </div>

              <div className="mt-10">
                <span className="font-body text-xs uppercase tracking-[0.2em] text-muted-foreground">Follow Us</span>
                <div className="flex items-center gap-5 mt-3">
                  <a href="https://instagram.com/foundrypadelpdx" target="_blank" rel="noopener noreferrer" aria-label="Foundry Padel on Instagram" className="text-muted-foreground transition-colors hover:text-primary"><Instagram size={20} aria-hidden="true" /></a>
                  <a href="https://www.facebook.com/share/1Cerw2CTec/?mibextid=wwXIfr" target="_blank" rel="noopener noreferrer" aria-label="Foundry Padel on Facebook" className="text-muted-foreground transition-colors hover:text-primary"><Facebook size={20} aria-hidden="true" /></a>
                  <a href="https://tiktok.com/@foundry.padel" target="_blank" rel="noopener noreferrer" aria-label="Foundry Padel on TikTok" className="text-muted-foreground transition-colors hover:text-primary"><TikTokIcon size={20} /></a>
                  <WhatsAppJoinLink ariaLabel="Join our WhatsApp community" iconSize={20} className="text-muted-foreground transition-colors hover:text-primary" />
                </div>
              </div>

              <MapEmbed className="mt-10 aspect-[4/3]" />
            </Reveal>

            {/* Not wrapped in a Reveal: StayInTouchForm reveals its own heading and keeps
                its inputs still, so a Reveal here would nest and move the form. */}
            <div>
              <StayInTouchForm
                source="contact"
                headingClassName="font-display text-3xl text-foreground mb-3"
                subtitleClassName="font-body text-sm tracking-[0.15em] uppercase text-muted-foreground mb-8"
              />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};

export default Contact;
