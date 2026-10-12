import type { CSSProperties, ComponentPropsWithoutRef, ElementType } from "react";

/**
 * Scroll entrance for anything below the fold. Renders a plain element carrying
 * [data-reveal]; lib/motion.ts and the "Motion" block in index.css do the rest.
 *
 *   up       rises into place (default)
 *   fade     opacity only, for fine print and anything that shouldn't move
 *   left     slides in from the left; right from the right (alternating rows)
 *   stagger  stays put; its direct children rise one after another
 *   bar      grows from its left edge (a percentage bar)
 *   rule     grows from its centre (a 1px divider)
 *   draw     stays put; its .draw strokes draw and its .pop dots pop (see the SVGs)
 *
 * `delay` is counted in stagger steps (80ms each), not seconds, so sequences on
 * different pages keep the same rhythm.
 *
 * Don't nest one Reveal inside another: the child would move twice.
 */
export type RevealVariant = "up" | "fade" | "left" | "right" | "stagger" | "bar" | "rule" | "draw";

type RevealProps<T extends ElementType> = {
  as?: T;
  variant?: RevealVariant;
  delay?: number;
} & Omit<ComponentPropsWithoutRef<T>, "as">;

const Reveal = <T extends ElementType = "div">({ as, variant = "up", delay, style, ...rest }: RevealProps<T>) => {
  const Tag: ElementType = as ?? "div";
  const merged = delay ? ({ ...(style as CSSProperties), "--reveal-delay": delay } as CSSProperties) : style;
  return <Tag data-reveal={variant} style={merged} {...rest} />;
};

export default Reveal;
