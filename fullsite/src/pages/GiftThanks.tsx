import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Head } from "vite-react-ssg";
import { Loader2 } from "lucide-react";

/**
 * Where Square sends the buyer after paying.
 *
 * This page proves nothing on its own. Landing on it does not mean a payment happened —
 * the URL can be opened by anybody, at any time — so it asks the backend, which only says
 * "paid" once Square has told it so over a signed webhook.
 *
 * That takes a few seconds, so the page polls rather than deciding on first load. Showing
 * "we have no record of this" to somebody whose card was charged two seconds ago is the
 * kind of thing that generates a phone call.
 *
 * The codes are shown here as well as emailed. A buyer who has just spent $90 should not
 * have to go and watch an inbox to find out whether it worked, and email takes a minute
 * and sometimes lands in spam.
 */

interface Gift {
  label: string;
  value: string;
  code: string;
  expires: string;
}

interface OrderStatus {
  reference: string;
  status: string;
  paid: boolean;
  buyer_email?: string;
  gifts?: Gift[];
  certificate_url?: string | null;
}

// Square's redirect can beat its own webhook by a few seconds. Poll for a couple of
// minutes before admitting we cannot see it, which is far longer than it has ever taken
// and still short enough that a genuinely broken order does not spin forever.
const POLL_MS = 3000;
const GIVE_UP_AFTER_MS = 120_000;

export default function GiftThanks() {
  const { reference, token } = useMemo(() => {
    if (typeof window === "undefined") return { reference: "", token: "" };
    const q = new URLSearchParams(window.location.search);
    return { reference: q.get("ref") ?? "", token: q.get("t") ?? "" };
  }, []);

  const [order, setOrder] = useState<OrderStatus | null>(null);
  const [gaveUp, setGaveUp] = useState(false);

  useEffect(() => {
    if (!reference) return;
    let stop = false;
    const started = Date.now();

    async function poll() {
      try {
        const res = await fetch(
          `/api/gift/order/${encodeURIComponent(reference)}` +
            (token ? `?t=${encodeURIComponent(token)}` : ""),
        );
        if (res.ok) {
          const body: OrderStatus = await res.json();
          if (stop) return;
          setOrder(body);
          // Stop once the codes exist. `paid` alone is not the end: fulfilment runs
          // straight after, and stopping there would leave the page saying "paid" with
          // nothing on it a moment before the codes appeared.
          if (body.gifts && body.gifts.length > 0) return;
        }
      } catch {
        // A failed poll is not a failed order. Keep trying.
      }
      if (stop) return;
      if (Date.now() - started > GIVE_UP_AFTER_MS) {
        setGaveUp(true);
        return;
      }
      setTimeout(poll, POLL_MS);
    }

    poll();
    return () => {
      stop = true;
    };
  }, [reference, token]);

  const gifts = order?.gifts ?? [];
  const done = gifts.length > 0;

  return (
    <main className="bg-background min-h-screen pt-24">
      {/* Not a page anybody should reach from a search result: it is one buyer's
          receipt, and it carries an order token in the query string. Kept out of the
          sitemap for the same reason. */}
      <Head>
        <title>Thank you | Foundry Padel</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <section className="px-6 py-16">
        <div className="mx-auto max-w-2xl">
          <h1 className="font-display text-[clamp(2rem,9vw,3rem)] leading-none text-foreground">
            {done ? "THANK YOU" : "ONE MOMENT"}
          </h1>
          <div className="mt-5 h-px w-16 bg-primary" />

          {!reference && (
            <p className="mt-8 font-body text-secondary-foreground">
              This link is missing its order reference. If you have just paid, check your
              email: the codes are on their way there regardless.
            </p>
          )}

          {reference && !done && !gaveUp && (
            <div className="mt-8 flex items-center gap-3 font-body text-secondary-foreground">
              <Loader2 className="h-5 w-5 animate-spin shrink-0" />
              <span>
                Confirming your payment with Square. This usually takes a few seconds.
              </span>
            </div>
          )}

          {reference && !done && gaveUp && (
            <div className="mt-8 font-body text-secondary-foreground space-y-3">
              <p>
                We have not had confirmation from Square yet. If your card was charged,
                nothing is lost: your codes will arrive by email as soon as it comes
                through, and we are told automatically if it does not.
              </p>
              <p>
                Quote <strong className="text-foreground">{order?.reference ?? reference}</strong>{" "}
                if you need to get in touch.
              </p>
            </div>
          )}

          {done && (
            <>
              <p className="mt-8 font-body text-secondary-foreground">
                Your payment went through. {gifts.length === 1 ? "This code is" : "These codes are"}{" "}
                also on the way to{" "}
                <strong className="text-foreground">{order?.buyer_email}</strong>, with a
                printable certificate attached.
              </p>

              <div className="mt-10 space-y-4">
                {gifts.map((g) => (
                  <div key={g.code} className="border border-border p-5">
                    <div className="font-display text-sm tracking-[0.06em] uppercase text-foreground">
                      {g.label}
                    </div>
                    <div className="font-body text-xs text-secondary-foreground mt-1">
                      {g.value} credit · valid until {g.expires}
                    </div>
                    <div className="mt-4 border border-primary bg-secondary/20 py-4 text-center font-mono text-2xl tracking-[0.22em] text-foreground">
                      {g.code}
                    </div>
                  </div>
                ))}
              </div>

              {order?.certificate_url && (
                <a
                  href={order.certificate_url}
                  className="mt-8 block w-full bg-primary text-primary-foreground text-center font-body text-sm tracking-[0.2em] uppercase py-4"
                >
                  Download the certificate
                </a>
              )}

              <div className="mt-10 border-t border-border pt-6">
                <h2 className="font-body text-sm tracking-[0.2em] uppercase text-primary">
                  How to use it
                </h2>
                <ol className="mt-3 list-decimal pl-5 font-body text-sm text-secondary-foreground space-y-1">
                  <li>Book at Foundry Padel in the Playtomic app or on playtomic.com.</li>
                  <li>
                    At checkout, enter {gifts.length === 1 ? "the code" : "a code"} in the
                    promo code field.
                  </li>
                  <li>
                    The credit comes off the total. Anything over it goes on your card.
                  </li>
                </ol>
                <p className="mt-6 font-body text-xs text-secondary-foreground">
                  Order {order?.reference}. Keep this email: no change is given if a
                  booking costs less than the credit.
                </p>
              </div>
            </>
          )}

          <Link
            to="/"
            className="mt-12 inline-block font-body text-sm tracking-[0.15em] uppercase text-primary"
          >
            Back to Foundry Padel
          </Link>
        </div>
      </section>
    </main>
  );
}
