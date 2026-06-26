const LAST_UPDATED = "June 24, 2026";
const CONTACT_EMAIL = "portland@foundrypadel.com";

const Privacy = () => {
  return (
    <main className="bg-background min-h-screen pt-24">
      <section className="py-16 px-6">
        <div className="mx-auto max-w-3xl">
          <h1 className="font-display text-5xl sm:text-6xl text-foreground mb-3">Privacy Policy</h1>
          <p className="font-body text-sm text-muted-foreground mb-10">Last updated: {LAST_UPDATED}</p>

          <div className="space-y-8 font-body text-sm sm:text-base text-secondary-foreground leading-relaxed">
            <p>
              Foundry Padel ("we", "us", "our") respects your privacy. This policy explains what
              information we collect, how we use it, and the choices you have. It applies to
              foundrypadel.com and the services we offer through it.
            </p>

            <div>
              <h2 className="font-display text-2xl text-foreground mb-3">Information we collect</h2>
              <p>
                We collect information you provide directly, such as your name, email address, and
                mobile phone number when you register your interest, book, or opt in to messages. We
                also collect basic usage data (such as pages visited) to operate and improve the site.
              </p>
            </div>

            <div>
              <h2 className="font-display text-2xl text-foreground mb-3">How we use information</h2>
              <p>
                We use your information to respond to enquiries, manage bookings and memberships, send
                the communications you have requested, and operate and improve our club and services.
              </p>
            </div>

            {/* The exact clause 10DLC reviewers look for. Do not reword. */}
            <div className="border-l-2 border-primary pl-5">
              <h2 className="font-display text-2xl text-foreground mb-3">SMS / Text Messaging Privacy</h2>
              <p>
                Foundry Padel offers SMS notifications about classes, clinics, bookings, and schedule
                updates to individuals who opt in. No mobile information will be shared with third
                parties or affiliates for marketing or promotional purposes. Information shared with
                subprocessors solely to provide the messaging service (such as our SMS provider) is not
                shared for any other purpose. Message frequency varies. Message and data rates may
                apply. Reply STOP to unsubscribe at any time, or HELP for assistance.
              </p>
            </div>

            <div>
              <h2 className="font-display text-2xl text-foreground mb-3">How we share information</h2>
              <p>
                We do not sell your personal information. We share information only with service
                providers who help us operate (for example, our SMS provider and payment processor),
                and only to the extent needed to provide the service. Mobile information is never shared
                with third parties or affiliates for marketing or promotional purposes.
              </p>
            </div>

            <div>
              <h2 className="font-display text-2xl text-foreground mb-3">Your choices</h2>
              <p>
                You can opt out of text messages at any time by replying STOP, and reply HELP for
                assistance. To access, update, or delete the information we hold about you, contact us
                using the details below.
              </p>
            </div>

            <div>
              <h2 className="font-display text-2xl text-foreground mb-3">Contact us</h2>
              <p>
                Questions about this policy? Email{" "}
                <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline">{CONTACT_EMAIL}</a>.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};

export default Privacy;
