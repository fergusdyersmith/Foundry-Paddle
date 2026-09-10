import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Minus, Plus } from "lucide-react";
import Seo from "@/components/Seo";

/**
 * Gift certificates.
 *
 * The catalogue is FETCHED rather than written here. The same four prices appear on this
 * page, in Square, on the Playtomic voucher and on the printed certificate, and the
 * backend is the one that charges — so a figure typed into this file could quote a price
 * we would not honour. One deploy changes a price, not two.
 *
 * The other thing this page owes the buyer is honesty about how the credit behaves. A
 * Playtomic voucher is a fixed dollar amount with no change given, and members can book
 * 60-minute courts, so a $90 credit spent on one loses $30. That is said next to the
 * price, again in the terms, and confirmed with a tick before payment — not because a
 * tick protects the club, but because somebody finding out afterwards is a support
 * message and a bad afternoon.
 */

interface CatalogueItem {
  sku: string;
  label: string;
  value_cents: number;
  price: string;
  covers: string;
  warning: string;
}

interface Catalogue {
  items: CatalogueItem[];
  valid_months: number;
  max_per_item: number;
}

const money = (cents: number) =>
  cents % 100 === 0 ? `$${cents / 100}` : `$${(cents / 100).toFixed(2)}`;

export default function GiftCards() {
  const { data, isLoading, isError } = useQuery<Catalogue>({
    queryKey: ["gift-catalogue"],
    queryFn: async () => {
      const res = await fetch("/api/gift/catalogue");
      if (!res.ok) throw new Error("Failed to load");
      return res.json();
    },
    staleTime: 10 * 60_000,
    refetchOnWindowFocus: false,
  });

  const [qty, setQty] = useState<Record<string, number>>({});
  const [buyerEmail, setBuyerEmail] = useState("");
  const [buyerName, setBuyerName] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [giftMessage, setGiftMessage] = useState("");
  const [termsAck, setTermsAck] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const items = data?.items ?? [];
  const maxPer = data?.max_per_item ?? 10;

  const bump = (sku: string, by: number) =>
    setQty((q) => {
      const next = Math.min(maxPer, Math.max(0, (q[sku] ?? 0) + by));
      return { ...q, [sku]: next };
    });

  const chosen = useMemo(
    () => items.filter((i) => (qty[i.sku] ?? 0) > 0),
    [items, qty],
  );
  const subtotal = useMemo(
    () => chosen.reduce((n, i) => n + i.value_cents * (qty[i.sku] ?? 0), 0),
    [chosen, qty],
  );

  const canSubmit = chosen.length > 0 && buyerEmail.trim() !== "" && termsAck && !busy;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/gift/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: chosen.map((i) => ({ sku: i.sku, quantity: qty[i.sku] })),
          buyer_email: buyerEmail.trim(),
          buyer_name: buyerName.trim() || null,
          recipient_name: recipientName.trim() || null,
          gift_message: giftMessage.trim() || null,
          terms_ack: termsAck,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        // The backend writes these to be read by a buyer, so they go through as-is.
        throw new Error(body.detail || "We could not start that checkout.");
      }
      // Square's hosted page. Card details never touch this site.
      window.location.href = body.checkout_url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setBusy(false);
    }
  }

  return (
    <main className="bg-background min-h-screen pt-24">
      <Seo
        title="Gift Certificates | Foundry Padel"
        description="Give a court or a spot in a match at Foundry Padel. Delivered by email with a printable certificate, valid for 12 months."
        path="/gift-cards"
      />

      <section className="py-16 px-6">
        <div className="mx-auto max-w-3xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="font-display text-[clamp(2.25rem,11vw,3.75rem)] leading-none sm:text-7xl text-foreground mb-4">
              GIFT CERTIFICATES
            </h1>
            <div className="flex items-center justify-center gap-4 mb-6">
              <div className="h-px w-16 bg-primary" />
              <span className="font-body text-sm tracking-[0.2em] uppercase text-primary">
                Give a game
              </span>
              <div className="h-px w-16 bg-primary" />
            </div>
            <p className="font-body text-base text-secondary-foreground max-w-xl mx-auto">
              Delivered by email within minutes, with a printable certificate you can hand
              over. Redeemed in the Playtomic promo code field at checkout.
            </p>
          </motion.div>
        </div>
      </section>

      <form onSubmit={submit} className="px-6 pb-24">
        <div className="mx-auto max-w-3xl">
          {isLoading && (
            <div className="flex justify-center py-16 text-secondary-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          )}

          {isError && (
            <p className="font-body text-center text-secondary-foreground py-16">
              We could not load the gift options just now. Please refresh, or email us and
              we will sort one out by hand.
            </p>
          )}

          {/* The items. Each carries its own warning, because a court credit and a match
              spot fail differently and a shared sentence would be wrong for one of them. */}
          <div className="space-y-4">
            {items.map((item) => {
              const n = qty[item.sku] ?? 0;
              return (
                <div
                  key={item.sku}
                  className={`border p-5 sm:p-6 transition-colors ${
                    n > 0 ? "border-primary" : "border-border"
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <h2 className="font-display text-lg sm:text-xl tracking-[0.05em] uppercase text-foreground">
                        {item.label}
                      </h2>
                      <p className="font-body text-sm text-secondary-foreground mt-1">
                        {item.covers}
                      </p>
                      <p className="font-body text-xs text-secondary-foreground/80 mt-2">
                        {item.warning}
                      </p>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      <span className="font-display text-2xl text-foreground">
                        {item.price}
                      </span>
                      <div className="flex items-center border border-border">
                        <button
                          type="button"
                          aria-label={`One fewer ${item.label}`}
                          onClick={() => bump(item.sku, -1)}
                          disabled={n === 0}
                          className="p-2 text-foreground disabled:opacity-30"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="w-8 text-center font-body text-foreground">
                          {n}
                        </span>
                        <button
                          type="button"
                          aria-label={`One more ${item.label}`}
                          onClick={() => bump(item.sku, 1)}
                          disabled={n >= maxPer}
                          className="p-2 text-foreground disabled:opacity-30"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {chosen.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-10 border-t border-border pt-8"
            >
              <div className="flex items-baseline justify-between">
                <span className="font-body text-sm tracking-[0.2em] uppercase text-primary">
                  Total
                </span>
                <span className="font-display text-3xl text-foreground">
                  {money(subtotal)}
                </span>
              </div>

              <div className="mt-8 space-y-5">
                <label className="block">
                  <span className="font-body text-sm tracking-[0.12em] uppercase text-primary">
                    Your email
                  </span>
                  <input
                    type="email"
                    required
                    value={buyerEmail}
                    onChange={(e) => setBuyerEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="mt-2 w-full bg-transparent border border-border px-4 py-3 font-body text-foreground placeholder:text-secondary-foreground/50 focus:border-primary focus:outline-none"
                  />
                  <span className="mt-2 block font-body text-xs text-secondary-foreground">
                    The codes and the printable certificate go here. Forward it on, or
                    print it and hand it over.
                  </span>
                </label>

                <div className="grid gap-5 sm:grid-cols-2">
                  <label className="block">
                    <span className="font-body text-sm tracking-[0.12em] uppercase text-primary">
                      Your name <span className="normal-case tracking-normal opacity-60">(optional)</span>
                    </span>
                    <input
                      type="text"
                      value={buyerName}
                      onChange={(e) => setBuyerName(e.target.value)}
                      className="mt-2 w-full bg-transparent border border-border px-4 py-3 font-body text-foreground focus:border-primary focus:outline-none"
                    />
                  </label>
                  <label className="block">
                    <span className="font-body text-sm tracking-[0.12em] uppercase text-primary">
                      Who is it for <span className="normal-case tracking-normal opacity-60">(optional)</span>
                    </span>
                    <input
                      type="text"
                      value={recipientName}
                      onChange={(e) => setRecipientName(e.target.value)}
                      placeholder="Printed on the certificate"
                      className="mt-2 w-full bg-transparent border border-border px-4 py-3 font-body text-foreground placeholder:text-secondary-foreground/50 focus:border-primary focus:outline-none"
                    />
                  </label>
                </div>

                <label className="block">
                  <span className="font-body text-sm tracking-[0.12em] uppercase text-primary">
                    A short message <span className="normal-case tracking-normal opacity-60">(optional)</span>
                  </span>
                  <textarea
                    rows={2}
                    maxLength={200}
                    value={giftMessage}
                    onChange={(e) => setGiftMessage(e.target.value)}
                    placeholder="Printed under their name."
                    className="mt-2 w-full bg-transparent border border-border px-4 py-3 font-body text-foreground placeholder:text-secondary-foreground/50 focus:border-primary focus:outline-none resize-none"
                  />
                </label>
              </div>

              {/* The terms, stated before payment rather than only in the receipt. The
                  tick is stored against the order with the time on it. */}
              <div className="mt-8 border border-border p-5">
                <p className="font-body text-xs leading-relaxed text-secondary-foreground">
                  Each gift is a fixed dollar credit, applied in the Playtomic promo code
                  field at checkout. No change or refund is given if the booking costs less
                  than the credit. Rates may change; if the price has risen when it is
                  redeemed, the difference goes on the card. One use per code.
                  Non-refundable. Transferable. Valid {data?.valid_months ?? 12} months.
                </p>
                <label className="mt-4 flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={termsAck}
                    onChange={(e) => setTermsAck(e.target.checked)}
                    className="mt-1 h-4 w-4 shrink-0 accent-[hsl(var(--primary))]"
                  />
                  <span className="font-body text-sm text-foreground">
                    I understand these credits give no change.
                  </span>
                </label>
              </div>

              {error && (
                <p className="mt-6 font-body text-sm text-destructive">{error}</p>
              )}

              <button
                type="submit"
                disabled={!canSubmit}
                className="mt-8 w-full bg-primary text-primary-foreground font-body text-sm tracking-[0.2em] uppercase py-4 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {busy ? "Taking you to checkout…" : `Pay ${money(subtotal)}`}
              </button>
              <p className="mt-3 text-center font-body text-xs text-secondary-foreground">
                Payment is handled by Square. Card details never touch this site.
              </p>
            </motion.div>
          )}
        </div>
      </form>
    </main>
  );
}
