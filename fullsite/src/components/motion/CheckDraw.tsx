import type { CSSProperties } from "react";

/**
 * The success mark: a clay ring draws round, then the tick strokes through it. It
 * draws when it mounts, which is the moment a form succeeds, so it needs no trigger.
 */
const CheckDraw = ({ className = "h-14 w-14", delay }: { className?: string; delay?: string }) => (
  <svg
    viewBox="0 0 52 52"
    className={className}
    fill="none"
    data-enter="draw"
    style={delay ? ({ "--enter-delay": delay } as CSSProperties) : undefined}
    aria-hidden="true"
    focusable="false"
  >
    <path
      className="draw"
      pathLength={1}
      d="M26 2a24 24 0 1 1 0 48a24 24 0 1 1 0-48"
      stroke="hsl(var(--primary))"
      strokeWidth={1.5}
    />
    <path
      className="draw"
      pathLength={1}
      d="M15 27l7 7 15-16"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="square"
      style={{ "--d": 6 } as CSSProperties}
    />
  </svg>
);

export default CheckDraw;
