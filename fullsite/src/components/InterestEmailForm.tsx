import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { generateChallenge, INTEREST_WEBHOOK_URL } from "@/lib/interestWebhook";

type Source = "book" | "memberships";

const SOURCE_META: Record<
  Source,
  { listName: string; toastTitle: string; toastDescription: string }
> = {
  book: {
    listName: "Court booking — notify",
    toastTitle: "You're on the list!",
    toastDescription: "We'll notify you when booking opens.",
  },
  memberships: {
    listName: "Memberships — notify",
    toastTitle: "You're on the list!",
    toastDescription: "We'll notify you when memberships launch.",
  },
};

type Props = { source: Source };

const InterestEmailForm = ({ source }: Props) => {
  const meta = SOURCE_META[source];
  const [email, setEmail] = useState("");
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

  const handleNotify = async (e: React.FormEvent) => {
    e.preventDefault();

    if (honeypot) return;

    if (!email.trim()) {
      toast({ title: "Please enter your email", variant: "destructive" });
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
      const res = await fetch(INTEREST_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: meta.listName,
          email: email.trim(),
          source,
        }),
      });

      if (!res.ok) throw new Error(`Status ${res.status}`);

      setSubmitted(true);
      toast({ title: meta.toastTitle, description: meta.toastDescription });
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

  return submitted ? (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="border border-primary p-8">
      <span className="font-display text-3xl text-primary">YOU'RE IN</span>
      <p className="mt-3 font-body text-sm text-muted-foreground">
        We'll reach out at <span className="text-foreground">{email}</span>
      </p>
    </motion.div>
  ) : (
    <form onSubmit={handleNotify} className="space-y-4 relative max-w-lg mx-auto text-left">
      <input
        type="email"
        placeholder="YOUR EMAIL"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        maxLength={255}
        className="w-full border border-border bg-secondary px-5 py-4 font-body text-sm tracking-widest text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none transition-colors"
      />

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
        className="w-full bg-primary py-4 font-display text-sm tracking-widest text-primary-foreground transition-all hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {submitting ? "SENDING…" : "NOTIFY ME"}
      </button>
    </form>
  );
};

export default InterestEmailForm;
