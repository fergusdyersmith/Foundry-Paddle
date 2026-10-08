import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Seo from "@/components/Seo";
import { JUNIOR_DAYS } from "@/constants/juniorClinic";
import {
  LEAVE_ALONE_LABEL,
  MEDIA_CHOICES,
  MEDICAL_INTRO,
  PARENT_ACK,
  PARENT_ACK_LINE,
  PARTICIPANT_ACK,
  PARTICIPANT_ACK_HEADING,
  PICKUP_INTRO,
  WAIVER_NOTICE,
  WAIVER_PREAMBLE,
  WAIVER_SECTIONS,
  WAIVER_SUBTITLE,
  WAIVER_TITLE,
} from "@shared/juniorWaiver";

/**
 * The junior waiver, signed online instead of at the desk.
 *
 * The same words as the paper form, in the same order, with the blanks as fields: the
 * parent reads the agreement here, fills in one block per child, ticks the two boxes and
 * types their name. The server lays the answers into the agreement, files a PDF per child
 * and marks the child's signup row, so the desk list says who is good to go before the
 * family arrives. See server/juniors-waiver.js. The printable PDF stays linked for anyone
 * who would rather bring it on paper.
 */

const PRINTABLE = "/juniors/Foundry_Padel_Junior_Waiver.pdf";
const PHONE_DISPLAY = "(612) 442-7600";
const sectionHeading = "font-display text-3xl sm:text-4xl text-foreground";
const field =
  "w-full border border-border bg-secondary px-5 py-4 font-body text-sm tracking-widest text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none transition-colors";
const fieldLabel = "mb-2 block font-body text-xs tracking-[0.2em] uppercase text-muted-foreground";
const hint = "mt-2 font-body text-xs leading-relaxed text-muted-foreground";
const legal = "font-body text-sm leading-relaxed text-secondary-foreground";

type Person = { name: string; phone: string };
type ChildForm = {
  name: string;
  dob: string;
  sessionDates: string;
  allergies: string;
  conditions: string;
  medications: string;
  insurer: string;
  policy: string;
  leaveAlone: boolean;
  media: "" | "yes" | "no";
  participantSigned: string;
};

const blankPerson = (): Person => ({ name: "", phone: "" });
const blankChild = (sessionDates: string): ChildForm => ({
  name: "", dob: "", sessionDates, allergies: "", conditions: "", medications: "", insurer: "", policy: "",
  leaveAlone: false, media: "", participantSigned: "",
});

function todayInPortland(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles" }).format(new Date());
}

/** Whole years from a YYYY-MM-DD, or null while the date is incomplete. */
function ageFrom(dob: string, today: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) return null;
  const [y, m, d] = dob.split("-").map(Number);
  const [Y, M, D] = today.split("-").map(Number);
  let age = Y - y;
  if (M < m || (M === m && D < d)) age -= 1;
  return age;
}

const JuniorWaiver = () => {
  const [today, setToday] = useState<string>("");
  useEffect(() => setToday(todayInPortland()), []);
  const nextDay = useMemo(() => JUNIOR_DAYS.find((d) => !today || d.date >= today) ?? null, [today]);

  return (
    <main className="min-h-screen bg-background pt-24">
      <Seo
        title="Junior Waiver | Foundry Padel"
        description="Sign the junior participant waiver online before the clinic. One form per family, about five minutes, and it covers every visit until your child turns 18."
        path="/juniors/waiver"
      />
      <section className="px-6 py-16">
        <div className="mx-auto max-w-3xl">
          <p className="font-body text-xs tracking-[0.3em] uppercase text-primary">Junior padel clinic</p>
          <h1 className="mt-3 font-display text-5xl text-foreground sm:text-6xl">JUNIOR WAIVER</h1>
          <p className="mt-5 max-w-2xl font-body text-base leading-relaxed text-secondary-foreground">
            Every player under 18 needs this signed by a parent or guardian before their first session.
            Sign it here once and it covers every junior clinic and visit until they turn 18. One form per
            family, a block for each child, about five minutes. Done online, check-in on the day is just
            your name at the desk.
          </p>
          <p className={`${hint} max-w-2xl`}>
            Rather print it? <a href={PRINTABLE} className="text-primary hover:underline" target="_blank" rel="noreferrer">Download the paper form</a> and
            bring it signed. Questions? Call {PHONE_DISPLAY}.
          </p>
        </div>
      </section>

      <WaiverForm defaultSessionDates={nextDay?.label ?? ""} today={today} />
    </main>
  );
};

function WaiverForm({ defaultSessionDates, today }: { defaultSessionDates: string; today: string }) {
  const [parent, setParent] = useState({ name: "", relationship: "", phone: "", email: "" });
  const [emergency, setEmergency] = useState<[Person, Person]>([blankPerson(), blankPerson()]);
  const [pickup, setPickup] = useState<[Person, Person]>([blankPerson(), blankPerson()]);
  const [children, setChildren] = useState<ChildForm[]>([blankChild(defaultSessionDates)]);
  const [signature, setSignature] = useState("");
  const [agree, setAgree] = useState(false);
  const [guardian, setGuardian] = useState(false);
  const [website, setWebsite] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ children: string[]; unmatched: string[] } | null>(null);

  // The next clinic date arrives after mount; fill it into blocks the parent has not typed in.
  useEffect(() => {
    if (!defaultSessionDates) return;
    setChildren((cs) => cs.map((c) => (c.sessionDates ? c : { ...c, sessionDates: defaultSessionDates })));
  }, [defaultSessionDates]);

  const setP = (k: keyof typeof parent) => (e: { target: { value: string } }) => setParent((p) => ({ ...p, [k]: e.target.value }));
  const setPair = (
    setter: typeof setEmergency, i: 0 | 1, k: keyof Person,
  ) => (e: { target: { value: string } }) =>
    setter((ps) => ps.map((p, j) => (j === i ? { ...p, [k]: e.target.value } : p)) as [Person, Person]);
  const setChild = (i: number, patch: Partial<ChildForm>) =>
    setChildren((cs) => cs.map((c, j) => (j === i ? { ...c, ...patch } : c)));

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!parent.name.trim() || !parent.relationship.trim() || !parent.phone.trim() || !parent.email.trim()) {
      setError("Your name, relationship, mobile and email are all needed.");
      return;
    }
    if (!emergency[0].name.trim() || !emergency[0].phone.trim()) {
      setError("At least one emergency contact, with a phone number, is needed.");
      return;
    }
    for (const c of children) {
      if (!c.name.trim() || !c.dob) {
        setError("Each child needs their full name and date of birth.");
        return;
      }
      const age = ageFrom(c.dob, today || todayInPortland());
      if (age == null || age < 3) {
        setError(`${c.name.trim()}'s date of birth does not look right.`);
        return;
      }
      if (age >= 18) {
        setError(`${c.name.trim()} is 18 or over, so this form does not apply. They sign the adult waiver at the club.`);
        return;
      }
      if (!c.media) {
        setError(`Choose one of the two photo and video options for ${c.name.trim()}.`);
        return;
      }
    }
    if (!agree || !guardian) {
      setError("Both boxes above the signature need to be ticked.");
      return;
    }
    if (!signature.trim()) {
      setError("Type your full name as your signature.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/juniors/waiver", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parent, emergency, pickup,
          children: children.map((c) => ({ ...c, program: "Junior Padel Clinic" })),
          signature, agree, guardian, website,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error || "Something went wrong. Please try again.");
        return;
      }
      setDone({ children: json.children ?? children.map((c) => c.name.trim()), unmatched: json.unmatched ?? [] });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setError("We could not reach the club. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    const names = done.children;
    const who = names.length === 1 ? names[0] : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
    return (
      <section className="px-6 pb-24">
        <div className="mx-auto max-w-3xl border border-primary bg-secondary p-10 text-center">
          <p className="font-display text-3xl text-foreground sm:text-4xl">SIGNED AND ON FILE</p>
          <p className="mt-4 font-body text-base leading-relaxed text-secondary-foreground">
            The waiver for {who} is filed. A copy is on its way to {parent.email.trim()}. At the clinic,
            come to the desk, give your name, and they are on court.
          </p>
          {done.unmatched.length > 0 && (
            <p className="mt-4 font-body text-sm leading-relaxed text-secondary-foreground">
              We could not match {done.unmatched.join(", ")} to a clinic signup. If they are not signed up
              yet, <Link to="/juniors#signup" className="text-primary hover:underline">hold their place here</Link>.
              If they are, the desk will sort it on the day.
            </p>
          )}
        </div>
      </section>
    );
  }

  return (
    <form onSubmit={submit} className="px-6 pb-24" noValidate>
      <div className="mx-auto max-w-3xl space-y-14">
        <div className="border border-primary/60 bg-secondary px-6 py-5">
          <p className="font-body text-xs tracking-[0.2em] uppercase text-primary">{WAIVER_TITLE}, {WAIVER_SUBTITLE}</p>
          <p className={`mt-3 ${legal} font-semibold text-foreground`}>{WAIVER_NOTICE}</p>
          {WAIVER_PREAMBLE.map((p) => <p key={p.slice(0, 24)} className={`mt-3 ${legal}`}>{p}</p>)}
        </div>

        {/* 2: the parent, first, because it is the one block every child shares. */}
        <section>
          <h2 className={sectionHeading}>PARENT OR GUARDIAN</h2>
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <div><label className={fieldLabel} htmlFor="w-pname">Your full name</label><input id="w-pname" className={field} value={parent.name} onChange={setP("name")} autoComplete="name" /></div>
            <div><label className={fieldLabel} htmlFor="w-prel">Relationship to the child</label><input id="w-prel" className={field} value={parent.relationship} onChange={setP("relationship")} placeholder="Mother, father, guardian" /></div>
            <div><label className={fieldLabel} htmlFor="w-pphone">Mobile phone</label><input id="w-pphone" type="tel" className={field} value={parent.phone} onChange={setP("phone")} autoComplete="tel" placeholder="(503) 555-0142" /></div>
            <div><label className={fieldLabel} htmlFor="w-pemail">Email</label><input id="w-pemail" type="email" className={field} value={parent.email} onChange={setP("email")} autoComplete="email" /></div>
          </div>
          <p className={hint}>Use the same email you signed up with, so we can match the waiver to the signup.</p>

          <h3 className="mt-10 font-body text-xs tracking-[0.2em] uppercase text-foreground">Emergency contacts</h3>
          <p className={hint}>Someone other than you, in case you cannot be reached. The second is optional.</p>
          {([0, 1] as const).map((i) => (
            <div key={i} className="mt-4 grid gap-5 sm:grid-cols-2">
              <div><label className={fieldLabel} htmlFor={`w-em-${i}`}>Emergency contact {i + 1}{i === 1 ? " (optional)" : ""}</label><input id={`w-em-${i}`} className={field} value={emergency[i].name} onChange={setPair(setEmergency, i, "name")} placeholder="Name and relationship" /></div>
              <div><label className={fieldLabel} htmlFor={`w-emp-${i}`}>Phone</label><input id={`w-emp-${i}`} type="tel" className={field} value={emergency[i].phone} onChange={setPair(setEmergency, i, "phone")} /></div>
            </div>
          ))}
        </section>

        {/* 4: pickup, also per family. */}
        <section>
          <h2 className={sectionHeading}>AUTHORIZED PICKUP</h2>
          <p className={`mt-4 ${legal}`}>{PICKUP_INTRO}</p>
          {([0, 1] as const).map((i) => (
            <div key={i} className="mt-4 grid gap-5 sm:grid-cols-2">
              <div><label className={fieldLabel} htmlFor={`w-pu-${i}`}>Authorized adult {i + 1} (optional)</label><input id={`w-pu-${i}`} className={field} value={pickup[i].name} onChange={setPair(setPickup, i, "name")} /></div>
              <div><label className={fieldLabel} htmlFor={`w-pup-${i}`}>Phone</label><input id={`w-pup-${i}`} type="tel" className={field} value={pickup[i].phone} onChange={setPair(setPickup, i, "phone")} /></div>
            </div>
          ))}
          <p className={hint}>For a player aged 14 or over who may leave on their own, there is a box in their block below.</p>
        </section>

        {/* 1 and 3: one block per child. */}
        <section>
          <h2 className={sectionHeading}>EACH CHILD</h2>
          <p className={`mt-4 ${legal}`}>{MEDICAL_INTRO} Leave a medical line blank and we record it as "None".</p>
          <div className="mt-6 space-y-8">
            {children.map((c, i) => {
              const age = ageFrom(c.dob, today || todayInPortland());
              return (
                <fieldset key={i} className="border border-border p-6 sm:p-8">
                  <legend className="px-3 font-display text-2xl text-foreground">
                    {c.name.trim() ? c.name.trim().toUpperCase() : `CHILD ${i + 1}`}
                    {age != null && age >= 0 && age < 18 && <span className="ml-3 font-body text-xs tracking-[0.2em] text-primary">AGE {age}</span>}
                  </legend>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div><label className={fieldLabel} htmlFor={`w-cname-${i}`}>Participant full name</label><input id={`w-cname-${i}`} className={field} value={c.name} onChange={(e) => setChild(i, { name: e.target.value })} placeholder="First and last name" /></div>
                    <div><label className={fieldLabel} htmlFor={`w-dob-${i}`}>Date of birth</label><input id={`w-dob-${i}`} type="date" className={field} value={c.dob} max={today || undefined} onChange={(e) => setChild(i, { dob: e.target.value })} /></div>
                    <div className="sm:col-span-2"><label className={fieldLabel} htmlFor={`w-dates-${i}`}>Session date(s)</label><input id={`w-dates-${i}`} className={field} value={c.sessionDates} onChange={(e) => setChild(i, { sessionDates: e.target.value })} placeholder="Friday, October 9" /></div>
                  </div>

                  <h3 className="mt-8 font-body text-xs tracking-[0.2em] uppercase text-foreground">Medical information</h3>
                  <div className="mt-4 grid gap-5 sm:grid-cols-2">
                    <div><label className={fieldLabel} htmlFor={`w-all-${i}`}>Allergies</label><input id={`w-all-${i}`} className={field} value={c.allergies} onChange={(e) => setChild(i, { allergies: e.target.value })} placeholder="None" /></div>
                    <div><label className={fieldLabel} htmlFor={`w-cond-${i}`}>Medical conditions</label><input id={`w-cond-${i}`} className={field} value={c.conditions} onChange={(e) => setChild(i, { conditions: e.target.value })} placeholder="Asthma, diabetes, seizures, prior concussion" /></div>
                    <div className="sm:col-span-2"><label className={fieldLabel} htmlFor={`w-med-${i}`}>Medications or emergency medication</label><input id={`w-med-${i}`} className={field} value={c.medications} onChange={(e) => setChild(i, { medications: e.target.value })} placeholder="Inhaler, EpiPen" /></div>
                    <div><label className={fieldLabel} htmlFor={`w-ins-${i}`}>Health insurance provider</label><input id={`w-ins-${i}`} className={field} value={c.insurer} onChange={(e) => setChild(i, { insurer: e.target.value })} /></div>
                    <div><label className={fieldLabel} htmlFor={`w-pol-${i}`}>Policy or member number</label><input id={`w-pol-${i}`} className={field} value={c.policy} onChange={(e) => setChild(i, { policy: e.target.value })} /></div>
                  </div>

                  {age != null && age >= 14 && (
                    <label className="mt-6 flex cursor-pointer items-start gap-3">
                      <input type="checkbox" checked={c.leaveAlone} onChange={(e) => setChild(i, { leaveAlone: e.target.checked })} className="mt-0.5 h-4 w-4 shrink-0 accent-primary" />
                      <span className={legal}><b>Participants age 14 and older only:</b> {LEAVE_ALONE_LABEL}</span>
                    </label>
                  )}

                  <h3 className="mt-8 font-body text-xs tracking-[0.2em] uppercase text-foreground">Image, video and media consent</h3>
                  <p className={`mt-3 ${legal}`}>{WAIVER_SECTIONS.find((s) => s.n === 11)?.paras[0]}</p>
                  <div className="mt-3 space-y-3">
                    {MEDIA_CHOICES.map((m) => (
                      <label key={m.value} className={`flex cursor-pointer items-start gap-3 border p-4 transition-colors ${c.media === m.value ? "border-primary bg-secondary" : "border-border hover:border-primary/60"}`}>
                        <input type="radio" name={`w-media-${i}`} value={m.value} checked={c.media === m.value} onChange={() => setChild(i, { media: m.value as "yes" | "no" })} className="mt-0.5 h-4 w-4 shrink-0 accent-primary" />
                        <span className={legal}>{m.label}</span>
                      </label>
                    ))}
                  </div>

                  <h3 className="mt-8 font-body text-xs tracking-[0.2em] uppercase text-foreground">{PARTICIPANT_ACK_HEADING}</h3>
                  <p className={`mt-3 ${legal}`}>{PARTICIPANT_ACK}</p>
                  <div className="mt-3"><label className={fieldLabel} htmlFor={`w-psig-${i}`}>Participant's name, typed by them (optional)</label><input id={`w-psig-${i}`} className={field} value={c.participantSigned} onChange={(e) => setChild(i, { participantSigned: e.target.value })} /></div>

                  {children.length > 1 && (
                    <button type="button" onClick={() => setChildren((cs) => cs.filter((_, j) => j !== i))} className="mt-6 border border-border px-4 py-3 font-body text-xs tracking-widest text-muted-foreground hover:border-primary">
                      REMOVE THIS CHILD
                    </button>
                  )}
                </fieldset>
              );
            })}
          </div>
          {children.length < 6 && (
            <button type="button" onClick={() => setChildren((cs) => [...cs, blankChild(defaultSessionDates)])} className="mt-5 font-body text-xs tracking-[0.15em] uppercase text-primary hover:underline">
              + Add another child
            </button>
          )}
        </section>

        {/* 5 to 17: the agreement, in full. */}
        <section>
          <h2 className={sectionHeading}>THE AGREEMENT</h2>
          <p className={hint}>Sections 5 to 17, exactly as on the paper form. Please read them before signing.</p>
          <div className="mt-6 space-y-6 border border-border p-6 sm:p-8">
            {WAIVER_SECTIONS.map((s) => (
              <div key={s.n}>
                <h3 className="font-display text-xl text-foreground">{s.n} &nbsp;{s.heading.toUpperCase()}</h3>
                {s.paras.map((p) => <p key={p.slice(0, 24)} className={`mt-2 ${legal}`}>{p}</p>)}
                {s.bullets && (
                  <ul className={`mt-2 list-disc space-y-2 pl-5 ${legal}`}>
                    {s.bullets.map((b) => <li key={b.slice(0, 24)}>{b}</li>)}
                  </ul>
                )}
                {s.n === 11 && <p className={`mt-2 ${legal} italic`}>Your choice for each child is in their block above.</p>}
              </div>
            ))}
          </div>
        </section>

        {/* The signature. */}
        <section>
          <h2 className={sectionHeading}>PARENT OR GUARDIAN ACKNOWLEDGMENT</h2>
          <p className={`mt-4 ${legal} font-semibold text-foreground`}>{PARENT_ACK}</p>
          <p className={`mt-3 ${legal}`}>{PARENT_ACK_LINE}</p>
          <div className="mt-6 space-y-4">
            <label className="flex cursor-pointer items-start gap-3">
              <input id="w-agree" type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-primary" />
              <span className={legal}>I have read this Agreement in full and agree to all of its terms, for myself and for each child named above.</span>
            </label>
            <label className="flex cursor-pointer items-start gap-3">
              <input id="w-guardian" type="checkbox" checked={guardian} onChange={(e) => setGuardian(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-primary" />
              <span className={legal}>I confirm that I am the parent or legal guardian of each child named above, with authority to sign on their behalf.</span>
            </label>
          </div>
          <div className="mt-6">
            <label className={fieldLabel} htmlFor="w-sig">Signature: type your full name</label>
            <input id="w-sig" className={`${field} font-serif text-xl italic tracking-normal`} value={signature} onChange={(e) => setSignature(e.target.value)} placeholder={parent.name || "Your full name"} autoComplete="off" />
            <p className={hint}>Typing your name here is your electronic signature, dated today. We record the time and the device it came from with the signed copy.</p>
          </div>
          <div className="hidden" aria-hidden="true"><input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} /></div>

          {error && <p className="mt-6 font-body text-sm text-primary">{error}</p>}
          <button type="submit" disabled={submitting} className="mt-6 w-full bg-primary px-8 py-4 font-display text-lg tracking-widest text-primary-foreground transition-all hover:brightness-110 disabled:opacity-60">
            {submitting ? "FILING THE WAIVER" : "SIGN AND SUBMIT"}
          </button>
          <p className={`${hint} text-center`}>
            A signed copy goes to you and to the club. Would rather do it on paper?{" "}
            <a href={PRINTABLE} className="text-primary hover:underline" target="_blank" rel="noreferrer">Print the form</a>.
          </p>
        </section>
      </div>
    </form>
  );
}

export default JuniorWaiver;
