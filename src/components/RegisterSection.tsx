import { useState } from "react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

const RegisterSection = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !email.trim()) {
      toast({ title: "Please fill in all fields", variant: "destructive" });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast({ title: "Please enter a valid email", variant: "destructive" });
      return;
    }

    setSubmitted(true);
    toast({ title: "You're on the list!", description: "We'll be in touch soon." });
  };

  return (
    <section id="register" className="relative py-28 px-6">
      <div className="mx-auto max-w-lg text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
        >
          <h2 className="font-display text-5xl sm:text-6xl text-foreground mb-3">
            GET ON THE LIST
          </h2>
          <p className="font-body text-sm tracking-[0.15em] uppercase text-muted-foreground mb-12">
            Be the first to know when we open
          </p>

          {submitted ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="border border-primary p-10"
            >
              <span className="font-display text-3xl text-primary">YOU'RE IN</span>
              <p className="mt-3 font-body text-sm text-muted-foreground">
                We'll reach out at <span className="text-foreground">{email}</span>
              </p>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                type="text"
                placeholder="YOUR NAME"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={100}
                className="w-full border border-border bg-secondary px-5 py-4 font-body text-sm tracking-widest text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none transition-colors"
              />
              <input
                type="email"
                placeholder="YOUR EMAIL"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                maxLength={255}
                className="w-full border border-border bg-secondary px-5 py-4 font-body text-sm tracking-widest text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none transition-colors"
              />
              <button
                type="submit"
                className="w-full bg-primary py-4 font-display text-lg tracking-widest text-primary-foreground transition-all hover:opacity-90"
              >
                REGISTER INTEREST
              </button>
            </form>
          )}
        </motion.div>
      </div>
    </section>
  );
};

export default RegisterSection;
