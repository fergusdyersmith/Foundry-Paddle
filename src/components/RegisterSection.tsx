import { useState, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import {
  COUNTRY_DIAL_CODES,
  E164_REGEX,
  composeE164,
  maxNationalDigits,
} from "@shared/countryDialCodes";

function generateChallenge() {
  const a = Math.floor(Math.random() * 10) + 1;
  const b = Math.floor(Math.random() * 10) + 1;
  return { a, b, answer: a + b };
}

const REGISTER_INTEREST_ENDPOINT = "/api/register-interest";
const DEFAULT_COUNTRY_CODE = "US";

const fieldClassName =
  "w-full border border-border bg-secondary px-5 py-4 font-body text-sm tracking-widest text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none transition-colors";

const RegisterSection = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [countryCode, setCountryCode] = useState(DEFAULT_COUNTRY_CODE);
  const [nationalDigits, setNationalDigits] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [captcha, setCaptcha] = useState(generateChallenge);
  const [captchaInput, setCaptchaInput] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const dialDigits = useMemo(
    () => COUNTRY_DIAL_CODES.find((c) => c.code === countryCode)?.dial ?? "1",
    [countryCode],
  );

  const nationalMax = useMemo(() => maxNationalDigits(dialDigits), [dialDigits]);

  const refreshCaptcha = useCallback(() => {
    setCaptcha(generateChallenge());
    setCaptchaInput("");
  }, []);

  const handleCountryChange = (code: string) => {
    setCountryCode(code);
    setNationalDigits("");
  };

  const handleNationalChange = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, nationalMax);
    setNationalDigits(digits);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (honeypot) return;

    if (!name.trim() || !email.trim()) {
      toast({ title: "Please fill in your name and email", variant: "destructive" });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast({ title: "Please enter a valid email", variant: "destructive" });
      return;
    }

    let mobile: string | undefined;
    if (nationalDigits.trim()) {
      const composed = composeE164(dialDigits, nationalDigits);
      if (!E164_REGEX.test(composed)) {
        toast({
          title: "Please enter a valid mobile number",
          description: "Include your full number after the country code, or leave the field blank.",
          variant: "destructive",
        });
        return;
      }
      mobile = composed;
    }

    if (parseInt(captchaInput, 10) !== captcha.answer) {
      toast({ title: "Incorrect answer — please try again", variant: "destructive" });
      refreshCaptcha();
      return;
    }

    setSubmitting(true);

    try {
      const body: {
        name: string;
        email: string;
        source: "home";
        mobile?: string;
      } = {
        name: name.trim(),
        email: email.trim(),
        source: "home",
      };
      if (mobile) body.mobile = mobile;

      const res = await fetch(REGISTER_INTEREST_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
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

  const successMobile =
    nationalDigits.trim() ? composeE164(dialDigits, nationalDigits) : null;

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
                {successMobile ? (
                  <>
                    We'll reach out at <span className="text-foreground">{email}</span> and{" "}
                    <span className="text-foreground">{successMobile}</span>
                  </>
                ) : (
                  <>
                    We'll reach out at <span className="text-foreground">{email}</span>
                  </>
                )}
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
                className={fieldClassName}
              />
              <input
                type="email"
                placeholder="YOUR EMAIL"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                maxLength={255}
                className={fieldClassName}
              />

              <div className="space-y-2">
                <label className="sr-only" htmlFor="register-country">
                  Country code
                </label>
                <select
                  id="register-country"
                  value={countryCode}
                  onChange={(e) => handleCountryChange(e.target.value)}
                  className={fieldClassName}
                >
                  {COUNTRY_DIAL_CODES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name} (+{c.dial})
                    </option>
                  ))}
                </select>
                <div className="flex items-center border border-border bg-secondary px-5 py-4 focus-within:border-primary transition-colors">
                  <span className="shrink-0 font-body text-sm tracking-widest text-muted-foreground">
                    +{dialDigits}
                  </span>
                  <input
                    id="register-mobile-national"
                    type="tel"
                    placeholder="Mobile (optional)"
                    value={nationalDigits}
                    onChange={(e) => handleNationalChange(e.target.value)}
                    autoComplete="tel-national"
                    inputMode="numeric"
                    maxLength={nationalMax}
                    aria-label="Mobile number, optional"
                    className="ml-3 w-full min-w-0 bg-transparent font-body text-sm tracking-widest text-foreground placeholder:text-muted-foreground focus:outline-none"
                  />
                </div>
              </div>

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
                  className={fieldClassName}
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
