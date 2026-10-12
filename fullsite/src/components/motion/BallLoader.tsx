import { cn } from "@/lib/utils";

type BallLoaderProps = {
  /** What is loading, for screen readers (and on screen with `showLabel`). */
  label?: string;
  showLabel?: boolean;
  className?: string;
};

/**
 * The site's loading state: a ball rallying back and forth over a net. Replaces the
 * spinning Loader2 wherever a fetch is in flight. The rally is CSS (index.css,
 * "ball-loader"): a linear sweep across with the height on a half-period alternate,
 * which traces a parabola. Under reduced motion the ball simply waits at the net.
 */
const BallLoader = ({ label = "Loading", showLabel = false, className }: BallLoaderProps) => (
  <div role="status" className={cn("flex flex-col items-center gap-3 text-muted-foreground", className)}>
    <svg viewBox="0 0 64 34" className="h-9 w-16" fill="none" aria-hidden="true" focusable="false">
      <path d="M2 32.5H62" stroke="currentColor" strokeOpacity={0.4} />
      <path d="M32 32.5V21" stroke="hsl(var(--primary))" strokeWidth={1.5} />
      <g className="ball-loader-x">
        <ellipse className="ball-loader-shadow" cx={12} cy={32.5} rx={3} ry={0.9} fill="currentColor" opacity={0.35} />
        <g className="ball-loader-y">
          <circle cx={12} cy={29} r={3} fill="hsl(var(--foreground))" />
        </g>
      </g>
    </svg>
    <span className={showLabel ? "font-body text-xs uppercase tracking-[0.2em]" : "sr-only"}>{label}</span>
  </div>
);

export default BallLoader;
