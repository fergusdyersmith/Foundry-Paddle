import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

function generateChallenge() {
  const a = Math.floor(Math.random() * 10) + 1;
  const b = Math.floor(Math.random() * 10) + 1;
  return { a, b, answer: a + b };
}

const WEBHOOK_URL =
  "https://hook.eu1.make.com/ay8xqbengj94jw74iie1ndy116vw03ba";

const RegisterSection = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [captcha, setCaptcha] = useState(generateChallenge);
  const [captchaInput, setCaptchaInput] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const refreshCaptcha = useCallback(() => {
    setCaptcha(generateChallenge());
    setCaptchaInput("");
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (honeypot) return;

    if (!name.trim() || !email.trim() || !mobile.trim()) {
      toast({ title: "Please fill in all fields", variant: "destructive" });
      return;
    }

    if (!/\d/.test(mobile)) {
      toast({ title: "Please enter a mobile number (digits required)", variant: "destructive" });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast({ title: "Please enter a valid email", variant: "destructive" });
      return;
    }

    if (parseInt(captchaInput, 10) !== captcha.answer) {
      toast({ title: "Incorrect answer — please try again", variant: "destructive" });
      refreshCaptcha();
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch(WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          mobile: mobile.trim(),
        }),
      });

      if (!res.ok) throw new Error(`Status ${res.status}`);

      setSubmitted(true);
      toast({ title: "You're on the list!", description: "We'll be in touch soon." });
    } catch {
      toast({
        title: "Something went wrong",
        description: "Please try again in a moment.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
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
                We'll reach out at <span className="text-foreground">{email}</span> and{" "}
                <span className="text-foreground">{mobile.trim()}</span>
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
              <input
                type="tel"
                placeholder="MOBILE NUMBER"
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                autoComplete="tel"
                maxLength={32}
                className="w-full border border-border bg-secondary px-5 py-4 font-body text-sm tracking-widest text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none transition-colors"
              />

              {/* Honeypot — invisible to humans, traps bots that auto-fill all fields */}
              <div aria-hidden="true" className="absolute -left-[9999px]">
                <input
                  type="text"
                  name="website"
                  tabIndex={-1}
                  autoComplete="off"
                  value={honeypot}
                  onChange={(e) => setHoneypot(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-3">
                <span className="font-body text-sm tracking-widest text-muted-foreground whitespace-nowrap">
                  {captcha.a} + {captcha.b} =
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="?"
                  value={captchaInput}
                  onChange={(e) => setCaptchaInput(e.target.value)}
                  maxLength={3}
                  className="w-full border border-border bg-secondary px-5 py-4 font-body text-sm tracking-widest text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={refreshCaptcha}
                  className="shrink-0 border border-border px-3 py-4 font-body text-xs tracking-widest text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="New question"
                >
                  ↻
                </button>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-primary py-4 font-display text-lg tracking-widest text-primary-foreground transition-all hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {submitting ? "SENDING…" : "REGISTER INTEREST"}
              </button>
            </form>
          )}
        </motion.div>
      </div>
    </section>
  );
};

export default RegisterSection;
