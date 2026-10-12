import type { CSSProperties, ReactNode } from "react";
import CourtPlan from "@/components/motion/CourtPlan";
import { cn } from "@/lib/utils";

type PageHeaderProps = {
  title: ReactNode;
  /** The clay line between the two rules, e.g. "First-Timer Friendly". */
  kicker?: ReactNode;
  /** Intro copy or buttons under the kicker; enters just after it. */
  children?: ReactNode;
  className?: string;
  /** Override the h1's size where a long word needs it (see Memberships). */
  titleClassName?: string;
};

const step = (s: string) => ({ "--enter-delay": s }) as CSSProperties;

/**
 * The hero for every text-led page: a court plan drawing itself in behind the title,
 * the title rising, and the two clay rules growing outward from the kicker. All of it
 * is first-paint CSS ([data-enter]), so it plays on load with no hydration flash and
 * reads complete with no JavaScript.
 *
 * Renders the block only; the page keeps its own <section> and spacing around it.
 */
const PageHeader = ({ title, kicker, children, className, titleClassName }: PageHeaderProps) => (
  <div className={cn("relative isolate text-center", className)}>
    <CourtPlan
      className="pointer-events-none absolute left-1/2 top-1/2 -z-10 w-[min(40rem,140%)] -translate-x-1/2 -translate-y-1/2 text-foreground opacity-[0.12]"
      strokeWidth={0.5}
      delay="0.15s"
    />
    <h1
      data-enter
      className={cn("mb-4 font-display text-6xl text-foreground sm:text-8xl", titleClassName)}
    >
      {title}
    </h1>
    {kicker && (
      <div className="mb-6 flex items-center justify-center gap-4">
        <div data-enter="rule-l" style={step("0.35s")} className="h-px w-16 bg-primary" />
        <span data-enter="fade" style={step("0.2s")} className="font-body text-sm uppercase tracking-[0.2em] text-primary">
          {kicker}
        </span>
        <div data-enter="rule-r" style={step("0.35s")} className="h-px w-16 bg-primary" />
      </div>
    )}
    {children && (
      <div data-enter style={step("0.3s")}>
        {children}
      </div>
    )}
  </div>
);

export default PageHeader;
