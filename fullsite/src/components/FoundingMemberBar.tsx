import { useQuery } from "@tanstack/react-query";
import Reveal from "@/components/motion/Reveal";
import CountUp from "@/components/motion/CountUp";

/** How many of the 100 founding memberships are gone.
 *
 *  Playtomic cannot cap a membership and publishes no count, so the number comes from
 *  the roster Kumi syncs out of Playtomic (every four hours) and is proxied by our own
 *  server, which caches it. That is the same source the club's own cap alert bills
 *  against, so the bar cannot disagree with the number staff act on.
 *
 *  Comped memberships are counted as claimed, because a comp occupies a seat. The
 *  separately-capped MAC listing is not, because it does not come out of the 100.
 */
interface MembershipCount {
  sold: number;
  cap: number;
  remaining: number;
}

function useMembershipCount() {
  return useQuery<MembershipCount>({
    queryKey: ["membership-count"],
    queryFn: async () => {
      const res = await fetch("/api/memberships");
      if (!res.ok) throw new Error("Failed to load membership count");
      return res.json();
    },
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
}

/** Nothing is rendered until the real count arrives, and nothing is rendered if it never
 *  does: a scarcity bar is only worth showing when it is true, and a hardcoded fallback
 *  is exactly how a number like this goes stale without anyone noticing. The height is
 *  reserved either way so the hero does not jump when it loads.
 *
 *  The count arrives after hydration, so the block fades in on mount (data-enter), and
 *  the fill grows from the left when the bar reaches the viewport (Reveal "bar"); on a
 *  short phone that is on scroll rather than on load. */
const FoundingMemberBar = () => {
  const { data } = useMembershipCount();
  // A cap of 0 would divide to NaN, and "NaN%" is an invalid width the browser drops.
  const pct = data && data.cap > 0 ? Math.min(100, Math.round((data.sold / data.cap) * 100)) : 0;

  return (
    <div className="mx-auto mt-5 min-h-[3.5rem] max-w-sm">
      {data && (
        <div data-enter="fade">
          <div
            className="h-2 w-full border border-border bg-secondary"
            role="progressbar"
            aria-label="Founding memberships claimed"
            aria-valuemin={0}
            aria-valuemax={data.cap}
            aria-valuenow={data.sold}
            aria-valuetext={`${data.sold} of ${data.cap} founding memberships claimed`}
          >
            <Reveal variant="bar" className="h-full bg-primary" style={{ width: `${pct}%` }} />
          </div>
          <div className="mt-2 flex items-baseline justify-between font-body text-xs uppercase tracking-[0.15em]">
            <span className="text-foreground">
              <CountUp value={data.sold} /> of {data.cap} claimed
            </span>
            {/* The server clamps an oversold roster, so 0 is as low as this goes. */}
            <span className="text-muted-foreground">
              {data.remaining > 0 ? `${data.remaining} left` : "All claimed"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default FoundingMemberBar;
