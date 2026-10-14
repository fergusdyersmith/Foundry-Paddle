# Motion on foundrypadel.com

Every animation on the marketing site (`fullsite/`) uses one vocabulary, so a page
added next year moves like the pages there today. This is the guide; the
implementation is the "Motion" block in `fullsite/src/index.css`,
`fullsite/src/lib/motion.ts`, and `fullsite/src/components/motion/`.

## The motif

**Court lines draw themselves; a ball flies along them.** Strokes are thin, square-capped
and in alabaster (`currentColor`) with clay (`hsl(var(--primary))`) for the one line that
matters: the net, the ring round a tick, a taken place on court. Nothing bounces for the
sake of it, nothing loops unless it is a ball in play.

## Tokens

| Token | Value | Used for |
|---|---|---|
| `--ease-out` | `cubic-bezier(0.22, 1, 0.36, 1)` | every entrance |
| `--ease-in-out` | `cubic-bezier(0.65, 0, 0.35, 1)` | strokes drawing |
| `--motion-enter` | 0.8s | first-paint hero entrance |
| `--motion-reveal` | 0.7s | scroll entrance |
| `--motion-draw` | 1.4s | a line drawing, a rule growing |
| `--motion-step` | 80ms | one stagger step |
| `--motion-distance` | 24px | how far things rise or slide |

Don't type durations, distances or delays per element. If something needs to wait,
give it a `delay` in steps.

## Two triggers

**Above the fold, on first paint: `data-enter`.** CSS keyframes that start from the
markup, so a prerendered hero never flashes visible, then hidden, then in. Use it only
for content that is on screen when the page loads (page heroes).

```tsx
<div data-enter>…</div>                                   // rises
<div data-enter style={{ "--enter-delay": "0.3s" }}>…</div> // a beat later
<span data-enter="fade">…</span>                          // opacity only (inline ok)
<div data-enter="rule-l" /> <div data-enter="rule-r" />   // rules grow outward
<svg data-enter="draw">…</svg>                            // its .draw paths draw
```

Text-led pages don't write this by hand: they use `<PageHeader>` (below).

**Below the fold, on scroll: `<Reveal>`.**

```tsx
import Reveal from "@/components/motion/Reveal";

<Reveal>…</Reveal>                          // rises in (default "up")
<Reveal delay={2}>…</Reveal>                // two steps (160ms) behind its neighbour
<Reveal variant="fade">…</Reveal>           // fine print, footnotes, logo bands
<Reveal variant="stagger" className="grid …">  // the grid stays; its children follow
  {cards.map((c) => <div key=…>…</div>)}       // each other in, 80ms apart (cap: 7 steps)
</Reveal>
<Reveal variant="left">… <Reveal variant="right">…  // alternating text/photo rows
<Reveal variant="bar" className="h-2 bg-primary" style={{ width: "62%" }} /> // fills from the left
<Reveal as="section" …>                     // any element
```

`.section-divider` reveals itself (grows from the centre); never wrap one.

Rules:
- **Never nest** a Reveal inside a Reveal (or inside a stagger child): the inner one
  moves twice. Reveal the outer block, or the inner pieces, not both.
- **Never put Reveal on rows of a live, polled list** (schedule, open matches): React
  can remount them on refetch. Reveal the list's container once.
- **Don't reveal what must be read at once**: form inputs, error messages, prices in a
  rate card, legal copy. They are already visible in the HTML; leave them be.
- A Reveal is visible in the prerendered HTML. Only after hydration does
  `lib/motion.ts` hide what is still below the fold, so there is no flash and the
  content is there for crawlers and for anyone whose JavaScript fails.

## Components

| Component | What it is | Where |
|---|---|---|
| `PageHeader` | h1 + kicker between two clay rules | every text-led page hero |
| `AnimatedMonogram` | FP monogram; the racket's holes ripple out from the sweet spot | home hero only |
| `BallFlight` | JS ball following any SVG path (rAF; pauses off screen and in background tabs) | home "∞", 404, BookCTA |
| `BallLoader` | ball rallying over a net, `role="status"` | every loading state (replaces `Loader2`) |
| `CheckDraw` | clay ring + tick that draw on mount | every success state |
| `CourtSlots` | four places on a doubles court, taken ones in clay | open matches, "your spot" |
| `CountUp` | a figure counting up on arrival | headline stats only, never prices |

```tsx
<PageHeader title="FAQ" kicker="First-Timer Friendly">
  <p className="font-body text-base text-secondary-foreground">Optional intro…</p>
</PageHeader>
```

`PageHeader` renders the block only: the page keeps its own `<section>` and padding.

## Hover and press

- Cards: border to `primary`, photo `scale-105` over 500ms (already the house style).
- A trailing arrow leans: `Explore <span aria-hidden="true" className="nudge">→</span>`
  inside a `group` or a link.
- Primary buttons: `hover:brightness-110 active:scale-[0.98]`.

## Reduced motion

Under `prefers-reduced-motion: reduce` every entrance is off (content simply present),
`BallFlight` holds the ball at its rest point, `BallLoader` freezes mid-rally, and
framer-motion follows `MotionConfig reducedMotion="user"` in `Layout.tsx`.

## Where not to animate

Privacy, SMS terms, the junior waiver form, the Open registration form, the Playtomic
and Maps iframes, rate tables, and the TV screen (`/tv`, its own world).
