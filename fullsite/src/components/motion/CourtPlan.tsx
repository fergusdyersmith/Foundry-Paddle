import type { CSSProperties } from "react";

/**
 * A padel court seen from above, at true proportions: 20m x 10m, so one viewBox unit
 * is 10cm. Glass walls, the net, the two service lines 6.95m from the net, and the
 * centre service line between them. Each line draws itself in the order a court is
 * marked out: walls, net, service lines, centre line.
 *
 * `trigger="enter"` draws on first paint (page headers); `"reveal"` on scroll.
 */
type CourtPlanProps = {
  className?: string;
  trigger?: "enter" | "reveal";
  /** Stroke width in viewBox units (one unit = 10cm of court). */
  strokeWidth?: number;
  /** For "enter", a CSS time ("0.2s"); for "reveal", stagger steps. */
  delay?: string | number;
};

const LINES: { d: string; step: number; accent?: boolean }[] = [
  { d: "M0.5 0.5H199.5V99.5H0.5Z", step: 0 },
  { d: "M100 0.5V99.5", step: 4, accent: true },
  { d: "M30.5 0.5V99.5", step: 7 },
  { d: "M169.5 0.5V99.5", step: 7 },
  { d: "M30.5 50H169.5", step: 10 },
];

const CourtPlan = ({ className, trigger = "enter", strokeWidth = 0.6, delay }: CourtPlanProps) => {
  const triggerProps =
    trigger === "enter"
      ? { "data-enter": "draw", style: delay ? ({ "--enter-delay": delay } as CSSProperties) : undefined }
      : { "data-reveal": "draw", style: delay ? ({ "--reveal-delay": delay } as CSSProperties) : undefined };
  return (
    <svg
      viewBox="0 0 200 100"
      className={className}
      fill="none"
      strokeWidth={strokeWidth}
      aria-hidden="true"
      focusable="false"
      {...triggerProps}
    >
      {LINES.map((line) => (
        <path
          key={line.d}
          className="draw"
          pathLength={1}
          d={line.d}
          stroke={line.accent ? "hsl(var(--primary))" : "currentColor"}
          style={{ "--d": line.step } as CSSProperties}
        />
      ))}
    </svg>
  );
};

export default CourtPlan;
