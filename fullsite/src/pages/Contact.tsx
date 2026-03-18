import { useState } from "react";
import { motion } from "framer-motion";
import { Instagram, Facebook, Mail, MapPin, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const TikTokIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" />
  </svg>
);

const Contact = () => {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      toast({ title: "Please fill in all fields", variant: "destructive" });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      toast({ title: "Please enter a valid email", variant: "destructive" });
      return;
    }
    setSubmitted(true);
    toast({ title: "Message sent!", description: "We'll get back to you soon." });
  };

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
                    <a href="https://maps.app.goo.gl/C9nVVN2M1TUWvZLU9" target="_blank" rel="noopener noreferrer" className="font-body text-sm text-foreground hover:text-primary transition-colors">
                      8613 N Crawford St, Portland, OR 97203
                    </a>
                    <p className="font-body text-xs text-muted-foreground">St. John's, near Cathedral Park</p>
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

              {/* Map placeholder */}
              <div className="mt-10 aspect-[4/3] bg-secondary border border-border flex items-center justify-center">
                <div className="text-center">
                  <MapPin size={32} className="text-muted-foreground mx-auto mb-2" />
                  <p className="font-body text-xs tracking-[0.15em] uppercase text-muted-foreground">Map Coming Soon</p>
                </div>
              </div>
            </motion.div>

            {/* Form */}
            <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8, delay: 0.1 }}>
              <h2 className="font-display text-3xl text-foreground mb-8">SEND A MESSAGE</h2>
              {submitted ? (
                <div className="border border-primary p-10 text-center">
                  <span className="font-display text-3xl text-primary">SENT</span>
                  <p className="mt-3 font-body text-sm text-muted-foreground">We'll get back to you at <span className="text-foreground">{form.email}</span></p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <input
                    type="text"
                    placeholder="YOUR NAME"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    maxLength={100}
                    className="w-full border border-border bg-secondary px-5 py-4 font-body text-sm tracking-widest text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none transition-colors"
                  />
                  <input
                    type="email"
                    placeholder="YOUR EMAIL"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    maxLength={255}
                    className="w-full border border-border bg-secondary px-5 py-4 font-body text-sm tracking-widest text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none transition-colors"
                  />
                  <textarea
                    placeholder="YOUR MESSAGE"
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    maxLength={1000}
                    rows={6}
                    className="w-full border border-border bg-secondary px-5 py-4 font-body text-sm tracking-widest text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none transition-colors resize-none"
                  />
                  <button type="submit" className="w-full bg-primary py-4 font-display text-lg tracking-widest text-primary-foreground transition-all hover:opacity-90">
                    SEND MESSAGE
                  </button>
                </form>
              )}
            </motion.div>
          </div>
        </div>
      </section>
    </main>
  );
};

export default Contact;
