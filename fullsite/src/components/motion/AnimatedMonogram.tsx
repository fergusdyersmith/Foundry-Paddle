import type { CSSProperties } from "react";
import { MONOGRAM_HOLES, MONOGRAM_LETTERS, MONOGRAM_SWEET_SPOT, MONOGRAM_VIEWBOX } from "./monogram";

// Holes this far apart (in viewBox units) pop on the same beat, so the wave reads as
// rings spreading from the sweet spot rather than one dot at a time.
const RING_WIDTH = 2.5;
const [sx, sy] = MONOGRAM_SWEET_SPOT;

/**
 * The FP monogram, inline, for the home hero. The letters arrive with the lockup;
 * then the racket's string holes pop in rings from the sweet spot, as if a ball had
 * just come off the strings. Drawn from the brand kit's own paths (monogram.ts), in
 * the kit's light fill, so it is identical to /rebrand/FP_icon_light.svg once still.
 */
const AnimatedMonogram = ({ className, delay = "0.7s" }: { className?: string; delay?: string }) => (
  <svg
    viewBox={MONOGRAM_VIEWBOX}
    className={className}
    data-enter="draw"
    style={{ "--enter-delay": delay } as CSSProperties}
    fill="#EEEFE3"
    aria-hidden="true"
    focusable="false"
  >
    {MONOGRAM_LETTERS.map((d) => (
      <path key={d.slice(0, 16)} d={d} />
    ))}
    {MONOGRAM_HOLES.map(([cx, cy]) => (
      <circle
        key={`${cx},${cy}`}
        className="pop"
        cx={cx}
        cy={cy}
        r={0.9}
        style={{ "--d": Math.round(Math.hypot(cx - sx, cy - sy) / RING_WIDTH) } as CSSProperties}
      />
    ))}
  </svg>
);

export default AnimatedMonogram;
