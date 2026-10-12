import { useEffect, useRef } from "react";
import { prefersReducedMotion } from "@/lib/motion";

type CountUpProps = {
  /** The number to land on. The prerendered HTML always carries this final value. */
  value: number;
  /** Text after the number, e.g. " ft". Counts never apply to prices: a price that
   *  ticks up reads as a price that changed. */
  suffix?: string;
  durationMs?: number;
  className?: string;
};

const format = (n: number, suffix: string) => `${n.toLocaleString("en-US")}${suffix}`;

/**
 * A figure that counts up from zero the first time it scrolls into view.
 *
 * Only figures still below the fold when the page hydrates count: one already on screen
 * keeps the value it was painted with rather than snapping to zero in front of the reader.
 * It edits React's own text node in place, never textContent, so React still owns the
 * node and a later change of `value` renders as usual.
 */
const CountUp = ({ value, suffix = "", durationMs = 1400, className }: CountUpProps) => {
  const ref = useRef<HTMLSpanElement>(null);
  // What React last rendered. A cleanup restores this, never the value from its own
  // closure: on a change of `value`, React writes the new figure before the old
  // effect's cleanup runs, and a stale restore would paint over it.
  const rendered = useRef("");
  rendered.current = format(value, suffix);

  useEffect(() => {
    const el = ref.current;
    const text = el?.firstChild;
    if (!el || !(text instanceof Text)) return;
    if (prefersReducedMotion() || typeof IntersectionObserver === "undefined") return;
    if (el.getBoundingClientRect().top < window.innerHeight) return;

    text.nodeValue = format(0, suffix);
    let raf = 0;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        const start = performance.now();
        const tick = (now: number) => {
          const t = Math.min(1, (now - start) / durationMs);
          const eased = 1 - Math.pow(1 - t, 3);
          text.nodeValue = format(Math.round(value * eased), suffix);
          if (t < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
      text.nodeValue = rendered.current;
    };
  }, [value, suffix, durationMs]);

  return (
    <span ref={ref} className={className}>
      {format(value, suffix)}
    </span>
  );
};

export default CountUp;
