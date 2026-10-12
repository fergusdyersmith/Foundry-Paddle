import { useEffect, useRef, type ReactNode } from "react";
import { useMotionAllowed, useOnScreen, usePageVisible } from "./hooks";

type BallFlightProps = {
  viewBox: string;
  /** The ball's flight, as SVG path data in viewBox units. */
  path: string;
  /** Where the ball sits when it is not flying: in the prerendered HTML, for reduced
   *  motion, and while scrolled out of view before it has ever started. */
  rest: [number, number];
  /** One lap of the path. */
  periodMs?: number;
  radius?: number;
  ballFill?: string;
  /** Ghost balls behind the real one, for a sense of speed. */
  trail?: number;
  /** Artwork drawn under the ball: a court, a net, the path itself. */
  children?: ReactNode;
  className?: string;
  /** Accessible name. Without one the graphic is decorative and hidden. */
  label?: string;
  /** Extra attributes for the <svg>, e.g. a draw trigger for the artwork. */
  svgProps?: Record<string, unknown>;
};

const TRAIL_GAP = 0.018; // of a lap, between ghosts

/**
 * A ball that flies along a path, frame by frame. It only spends frames while it can
 * be seen: paused when scrolled away or in a background tab, and still for visitors
 * who asked for reduced motion. Pausing keeps the phase, so it resumes where it was.
 */
const BallFlight = ({
  viewBox,
  path,
  rest,
  periodMs = 4000,
  radius = 2,
  ballFill = "hsl(var(--primary))",
  trail = 0,
  children,
  className,
  label,
  svgProps,
}: BallFlightProps) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const ballRef = useRef<SVGCircleElement>(null);
  const ghostRefs = useRef<(SVGCircleElement | null)[]>([]);
  const elapsed = useRef(0);

  const allowed = useMotionAllowed();
  const onScreen = useOnScreen(svgRef);
  const pageVisible = usePageVisible();
  const flying = allowed && onScreen && pageVisible;

  useEffect(() => {
    const line = pathRef.current;
    const ball = ballRef.current;
    if (!flying || !line || !ball || typeof line.getTotalLength !== "function") return;
    const length = line.getTotalLength();
    const place = (el: SVGCircleElement | null, lap: number) => {
      if (!el) return;
      const p = line.getPointAtLength((((lap % 1) + 1) % 1) * length);
      el.setAttribute("cx", p.x.toFixed(2));
      el.setAttribute("cy", p.y.toFixed(2));
    };
    let raf = 0;
    const origin = performance.now() - elapsed.current;
    const tick = (now: number) => {
      elapsed.current = now - origin;
      const lap = elapsed.current / periodMs;
      place(ball, lap);
      ghostRefs.current.forEach((ghost, i) => {
        place(ghost, lap - (i + 1) * TRAIL_GAP);
        ghost?.setAttribute("opacity", String(0.35 / (i + 1)));
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [flying, periodMs]);

  return (
    <svg
      ref={svgRef}
      viewBox={viewBox}
      className={className}
      fill="none"
      {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true })}
      focusable="false"
      {...svgProps}
    >
      {children}
      <path ref={pathRef} d={path} stroke="none" />
      {Array.from({ length: trail }, (_, i) => (
        <circle
          key={i}
          ref={(el) => (ghostRefs.current[i] = el)}
          cx={rest[0]}
          cy={rest[1]}
          r={radius * (1 - (i + 1) * 0.15)}
          fill={ballFill}
          opacity={0}
        />
      ))}
      <circle ref={ballRef} cx={rest[0]} cy={rest[1]} r={radius} fill={ballFill} />
    </svg>
  );
};

export default BallFlight;
