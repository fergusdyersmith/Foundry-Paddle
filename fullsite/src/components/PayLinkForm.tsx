import { useState, type FormEvent } from "react";
import { ExternalLink } from "lucide-react";
import { useTurnstile } from "@/hooks/useTurnstile";

/**
 * "Signed up but need to pay?" on the Open and League pages (Kelly, 20 Oct).
 *
 * The people it is for are already on the list but have no way to pay: a partner who was
 * named on someone else's form, or a player who filled the form in and closed the tab
 * before paying. On 20 Oct that was five people for the Open and two for the league.
 * Every field is optional, because the link is the point ("if someone just wants to get
 * the playtomic link, then we should let them get it and pay"). A name or email only
 * helps the club match the payment to the list; the server posts it to Slack.
 *
 * The server answers with the link under bookUrl (Open) or payUrl (League), null when it
 * has none; see server/open.js and server/league.js.
 */

const field =
  "w-full border border-border bg-secondary px-5 py-4 font-body text-sm tracking-widest text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none transition-colors";
const label = "mb-2 block font-body text-xs tracking-[0.2em] uppercase text-muted-foreground";
const optional = <span className="normal-case tracking-normal">(optional)</span>;

type Props = {
  /** id prefix for the inputs, so two forms on one page never share an id */
  idPrefix: string;
  /** POST endpoint, e.g. /api/open/pay-link */
  endpoint: string;
  /** which key of the answer holds the link: bookUrl (Open) or payUrl (League) */
  linkKey: "bookUrl" | "payUrl";
  intro: string;
  /** the button that opens the link, e.g. "PAY ON PLAYTOMIC" */
  payLabel: string;
  /** under the pay button, e.g. what it costs */
  payNote?: string;
  /** shown when the server had no link to give */
  noLink: string;
  email: string;
};

const PayLinkForm = ({ idPrefix, endpoint, linkKey, intro, payLabel, payNote, noLink, email }: Props) => {
  const [form, setForm] = useState({ name: "", email: "", partner: "", website: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // undefined: not asked yet; null: asked, and there was no link to give
  const [link, setLink] = useState<string | null | undefined>(undefined);
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const human = useTurnstile();

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!human.ready) {
      setError("One moment: we are still checking this came from a person. Try again in a second.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...human.headers() },
        body: JSON.stringify(form),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        human.reset();
        setError(json.error || "Something went wrong. Please try again.");
        return;
      }
      const url = json[linkKey];
      setLink(typeof url === "string" && url.startsWith("https://") ? url : null);
    } catch {
      human.reset();
      setError("We could not reach the club. Nothing has been charged; please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div id="pay" className="mt-16 scroll-mt-24 border border-border p-6 sm:p-10">
      <h3 className="font-display text-2xl sm:text-3xl text-foreground">SIGNED UP BUT NEED TO PAY?</h3>
      <p className="mt-3 font-body text-sm leading-relaxed text-secondary-foreground">{intro}</p>
      {link ? (
        <div className="mt-8 text-center">
          <a href={link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-primary px-10 py-4 font-display text-lg tracking-widest text-primary-foreground transition-all hover:brightness-110">
            {payLabel} <ExternalLink size={18} />
          </a>
          {payNote && <p className="mx-auto mt-4 max-w-md font-body text-xs leading-relaxed text-muted-foreground">{payNote}</p>}
        </div>
      ) : link === null ? (
        <p className="mt-8 font-body text-sm text-secondary-foreground">
          {noLink} Email <a href={`mailto:${email}`} className="text-primary hover:underline">{email}</a> and we will send it.
        </p>
      ) : (
        <form onSubmit={submit} className="mt-8 space-y-5" noValidate>
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className={label} htmlFor={`${idPrefix}-name`}>Your name {optional}</label>
              <input id={`${idPrefix}-name`} className={field} value={form.name} onChange={set("name")} autoComplete="name" />
            </div>
            <div>
              <label className={label} htmlFor={`${idPrefix}-email`}>Your email {optional}</label>
              <input id={`${idPrefix}-email`} type="email" className={field} value={form.email} onChange={set("email")} autoComplete="email" />
            </div>
          </div>
          <div>
            <label className={label} htmlFor={`${idPrefix}-partner`}>Who you are playing with {optional}</label>
            <input id={`${idPrefix}-partner`} className={field} value={form.partner} onChange={set("partner")} autoComplete="off" placeholder="Your partner's name" />
          </div>
          {/* Honeypot: hidden from people, filled by bots. */}
          <div className="hidden" aria-hidden="true"><input tabIndex={-1} autoComplete="off" value={form.website} onChange={set("website")} /></div>
          {error && <p role="alert" className="font-body text-sm text-primary">{error}</p>}
          <div ref={human.ref} />
          <button type="submit" disabled={submitting} className="w-full border border-primary px-8 py-4 font-display text-lg tracking-widest text-foreground transition-all hover:bg-primary hover:text-primary-foreground disabled:opacity-60">
            {submitting ? "ONE MOMENT" : "GET THE PAYMENT LINK"}
          </button>
        </form>
      )}
    </div>
  );
};

export default PayLinkForm;
