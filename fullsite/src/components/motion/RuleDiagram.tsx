import type { CSSProperties, ReactNode } from "react";

export type RuleKind = "doubles" | "serve" | "walls" | "scoring";

const d = (step: number) => ({ "--d": step }) as CSSProperties;
const CLAY = "hsl(var(--primary))";

// Top-down court at 2:1, the frame for the two plan-view diagrams.
const Court = () => (
  <>
    <path className="draw" pathLength={1} d="M0.75 0.75H119.25V59.25H0.75Z" stroke="currentColor" />
    <path className="draw" pathLength={1} d="M60 0.75V59.25" stroke={CLAY} style={d(3)} />
  </>
);

const DIAGRAMS: Record<RuleKind, ReactNode> = {
  // Two a side.
  doubles: (
    <>
      <Court />
      {[
        [30, 18],
        [30, 42],
        [90, 18],
        [90, 42],
      ].map(([cx, cy], i) => (
        <circle key={i} className="pop" cx={cx} cy={cy} r={4} fill={CLAY} stroke="none" style={d(7 + i)} />
      ))}
    </>
  ),
  // Side view: struck below the waist line, up over the net, down on the far side.
  serve: (
    <>
      <path className="draw" pathLength={1} d="M0 56.25H120" stroke="currentColor" strokeOpacity={0.5} />
      <path className="draw" pathLength={1} d="M60 56.25V40" stroke={CLAY} style={d(2)} />
      <path className="pop" d="M4 34H40" stroke="currentColor" strokeOpacity={0.6} strokeDasharray="2 3" style={d(3)} />
      <path className="draw" pathLength={1} d="M14 48Q60 2 100 54" stroke="currentColor" style={d(5)} />
      <circle className="pop" cx={100} cy={53} r={3} fill={CLAY} stroke="none" style={d(18)} />
    </>
  ),
  // Plan view: a shot into the back glass, and the angle it comes back off at.
  walls: (
    <>
      <Court />
      <path className="draw" pathLength={1} d="M22 46L118.5 24L82 9" stroke="currentColor" style={d(6)} />
      <circle className="pop" cx={118.5} cy={24} r={3.5} stroke={CLAY} style={d(13)} />
      <circle className="pop" cx={82} cy={9} r={3} fill={CLAY} stroke="none" style={d(20)} />
    </>
  ),
  // Tennis scoring, a point at a time.
  scoring: (
    <>
      <path className="draw" pathLength={1} d="M2 46H118" stroke="currentColor" strokeOpacity={0.4} />
      {[
        ["15", 4, 3],
        ["30", 30, 6],
        ["40", 56, 9],
      ].map(([label, x, step]) => (
        <text key={label} className="pop" x={x} y={38} fill="currentColor" style={d(step as number)}>
          {label}
        </text>
      ))}
      <text className="pop" x={84} y={38} fill={CLAY} style={d(13)}>
        GAME
      </text>
    </>
  ),
};

/**
 * A small line diagram for each rule on The Sport, drawn in the same court-line
 * language as the page headers. It draws in when its card scrolls into view.
 */
const RuleDiagram = ({ kind, className }: { kind: RuleKind; className?: string }) => (
  <svg
    viewBox="0 0 120 60"
    className={className}
    fill="none"
    strokeWidth={1.25}
    fontFamily="var(--font-display)"
    fontSize={12}
    letterSpacing="0.06em"
    data-reveal="draw"
    aria-hidden="true"
    focusable="false"
  >
    {DIAGRAMS[kind]}
  </svg>
);

export default RuleDiagram;
