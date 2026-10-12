import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

// Left pair first, then the right: a match fills one side of the net before the other.
const SPOTS: [number, number][] = [
  [11, 6.5],
  [11, 15.5],
  [33, 6.5],
  [33, 15.5],
];

type CourtSlotsProps = {
  /** Players in so far (clamped to 0-4). */
  filled: number;
  className?: string;
  /** Accessible label. Leave unset where the count is already written out beside it. */
  label?: string;
};

/**
 * A doubles court from above with its four places: taken ones in clay, open ones as
 * rings. The taken places pop in when it scrolls into view, and a place taken while
 * the page is open (a live list refreshing) pops in on its own.
 */
const CourtSlots = ({ filled, className, label }: CourtSlotsProps) => {
  const n = Math.max(0, Math.min(SPOTS.length, Math.round(filled)));
  return (
    <svg
      viewBox="0 0 44 22"
      className={cn("h-5 w-10 shrink-0", className)}
      fill="none"
      data-reveal="draw"
      {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true })}
      focusable="false"
    >
      <path d="M0.5 0.5H43.5V21.5H0.5Z" stroke="currentColor" strokeOpacity={0.45} />
      <path d="M22 0.5V21.5" stroke="currentColor" strokeOpacity={0.7} />
      {SPOTS.map(([cx, cy], i) =>
        i < n ? (
          <circle
            key={`in-${i}`}
            className="pop"
            cx={cx}
            cy={cy}
            r={3}
            fill="hsl(var(--primary))"
            style={{ "--d": i * 2 } as CSSProperties}
          />
        ) : (
          <circle key={`open-${i}`} cx={cx} cy={cy} r={2.5} stroke="currentColor" strokeOpacity={0.5} />
        ),
      )}
    </svg>
  );
};

export default CourtSlots;
