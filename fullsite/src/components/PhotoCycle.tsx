import { useEffect, useState } from "react";
import Photo from "@/components/Photo";

export type CycleFrame = {
  /** Basename inside /photos/site, without extension. */
  name: string;
  alt: string;
};

type PhotoCycleProps = {
  frames: CycleFrame[];
  /** Milliseconds each frame holds before the crossfade starts. */
  holdMs?: number;
  className?: string;
};

const FADE_MS = 1200;

/**
 * A single photo slot that crossfades between several frames on a timer.
 *
 * Three things it deliberately does NOT do:
 *
 * - It never loads the whole set up front. Only the current frame and the one
 *   after it are mounted, so a visitor who scrolls straight past downloads one
 *   photo, not five.
 * - It stops while the tab is hidden. Otherwise the timer keeps advancing in a
 *   background tab and pulls down frames nobody is looking at.
 * - It does not move for anyone who asked the OS to reduce motion; they get the
 *   first frame, held.
 *
 * The first frame renders as normal markup, so it is present in the prerendered
 * HTML and carries the alt text before any JavaScript runs.
 */
const PhotoCycle = ({ frames, holdMs = 4000, className }: PhotoCycleProps) => {
  const [index, setIndex] = useState(0);
  // High-water mark: how far the cycle has advanced. Frames past this + 1 are
  // not in the DOM yet, so their files are never requested.
  const [reached, setReached] = useState(0);

  useEffect(() => {
    if (frames.length < 2) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    let timer: ReturnType<typeof setInterval> | undefined;
    const start = () => {
      // Guard against a second "visible" without an intervening "hidden", which
      // would otherwise leave two intervals advancing the same cycle.
      if (timer) return;
      timer = setInterval(() => {
        setIndex((i) => {
          const next = (i + 1) % frames.length;
          setReached((r) => Math.max(r, next));
          return next;
        });
      }, holdMs + FADE_MS);
    };
    const stop = () => {
      if (timer) clearInterval(timer);
      timer = undefined;
    };

    const onVisibility = () => (document.hidden ? stop() : start());
    if (!document.hidden) start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [frames.length, holdMs]);

  return (
    <div className={`relative ${className ?? ""}`}>
      {frames.map((frame, i) => {
        // One frame ahead stays mounted so the crossfade never lands on a blank.
        if (i > reached + 1) return null;
        const isCurrent = i === index;
        return (
          <div
            key={frame.name}
            aria-hidden={isCurrent ? undefined : true}
            className="absolute inset-0 transition-opacity ease-in-out motion-reduce:transition-none"
            style={{ opacity: isCurrent ? 1 : 0, transitionDuration: `${FADE_MS}ms` }}
          >
            <Photo
              name={frame.name}
              // Only the visible frame describes itself; the rest are decorative
              // duplicates as far as a screen reader is concerned.
              alt={isCurrent ? frame.alt : ""}
              className="h-full w-full object-cover"
              priority={i === 0}
            />
          </div>
        );
      })}
    </div>
  );
};

export default PhotoCycle;
