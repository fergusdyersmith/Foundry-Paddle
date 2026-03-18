import { useState } from "react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Clock, Users } from "lucide-react";

const Book = () => {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();

  const handleNotify = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast({ title: "Please enter a valid email", variant: "destructive" });
      return;
    }
    setSubmitted(true);
    toast({ title: "You're on the list!", description: "We'll notify you when booking opens." });
  };

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

          {/* Coming soon + email */}
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

            {submitted ? (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="border border-primary p-10">
                <span className="font-display text-3xl text-primary">YOU'RE IN</span>
                <p className="mt-3 font-body text-sm text-muted-foreground">
                  We'll reach out at <span className="text-foreground">{email}</span>
                </p>
              </motion.div>
            ) : (
              <form onSubmit={handleNotify} className="flex gap-3">
                <input
                  type="email"
                  placeholder="YOUR EMAIL"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  maxLength={255}
                  className="flex-1 border border-border bg-secondary px-5 py-4 font-body text-sm tracking-widest text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none transition-colors"
                />
                <button type="submit" className="bg-primary px-8 py-4 font-display text-sm tracking-widest text-primary-foreground transition-all hover:opacity-90">
                  NOTIFY ME
                </button>
              </form>
            )}
          </motion.div>
          <div className="section-divider mt-16" />
        </div>
      </section>
    </main>
  );
};

export default Book;
