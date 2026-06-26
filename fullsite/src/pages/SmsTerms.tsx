import { Link } from "react-router-dom";

const LAST_UPDATED = "June 24, 2026";
const CONTACT_EMAIL = "portland@foundrypadel.com";

const SmsTerms = () => {
  return (
    <main className="bg-background min-h-screen pt-24">
      <section className="py-16 px-6">
        <div className="mx-auto max-w-3xl">
          <h1 className="font-display text-5xl sm:text-6xl text-foreground mb-3">SMS Terms</h1>
          <p className="font-body text-sm text-muted-foreground mb-10">Last updated: {LAST_UPDATED}</p>

          <div className="space-y-8 font-body text-sm sm:text-base text-secondary-foreground leading-relaxed">
            <p>
              By opting in, you agree to receive recurring automated text messages from Foundry Padel
              at the number provided (booking confirmations, class and clinic reminders, match
              notifications, schedule changes, and support replies). Consent is not a condition of any
              purchase. Message frequency varies. Message and data rates may apply. Reply STOP to
              cancel, HELP for help. Carriers are not liable for delayed or undelivered messages.
            </p>

            <div>
              <h2 className="font-display text-2xl text-foreground mb-3">How to opt out</h2>
              <p>
                You can cancel the SMS service at any time by replying STOP to any message. After you
                send STOP, we will send a confirmation and then stop sending messages. To get help,
                reply HELP or contact us at the email below.
              </p>
            </div>

            <div>
              <h2 className="font-display text-2xl text-foreground mb-3">Cost and frequency</h2>
              <p>
                Message and data rates may apply, depending on your mobile carrier and plan. Message
                frequency varies based on your activity and the notifications you opt in to.
              </p>
            </div>

            <div>
              <h2 className="font-display text-2xl text-foreground mb-3">Privacy</h2>
              <p>
                Your mobile information is handled as described in our{" "}
                <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>. No
                mobile information will be shared with third parties or affiliates for marketing or
                promotional purposes.
              </p>
            </div>

            <div>
              <h2 className="font-display text-2xl text-foreground mb-3">Contact us</h2>
              <p>
                For questions, contact{" "}
                <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline">{CONTACT_EMAIL}</a>.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};

export default SmsTerms;
