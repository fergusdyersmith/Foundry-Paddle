import { useEffect, useRef, useState } from "react";
import Photo from "@/components/Photo";

export type CycleFrame = {
  /** Basename, without directory or extension. */
  name: string;
  alt: string;
  /** Directory under /photos/. Defaults to the site set. */
  dir?: string;
  /** Source dimensions, when they differ from the 3:2 landscape default. */
  w?: number;
  h?: number;
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
 * Four things it deliberately does NOT do:
 *
 * - It never loads the whole set up front. Only the current frame and the one
 *   after it are mounted, so a visitor who scrolls straight past downloads one
 *   photo, not five.
 * - It does not advance while it is off screen, or while the tab is hidden.
 *   Besides being wasted work, a cycle that ran on unseen would arrive at a
 *   frame nothing had fetched, and the first thing the visitor saw on scrolling
 *   down would be an empty box.
 * - It does not lazy-load the frame it is about to need. Anything mounted past
 *   the first is due within one hold, so it is fetched now rather than on an
 *   intersection that has already happened.
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
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (frames.length < 2) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    const box = boxRef.current;
    if (!box) return;

    let onScreen = false;
    let timer: ReturnType<typeof setInterval> | undefined;

    const stop = () => {
      if (timer) clearInterval(timer);
      timer = undefined;
    };

    // Single source of truth for "should the timer be running", so neither the
    // observer nor the visibility listener can leave a second interval behind.
    const sync = () => {
      if (!onScreen || document.hidden) return stop();
      if (timer) return;
      timer = setInterval(() => {
        setIndex((i) => {
          const next = (i + 1) % frames.length;
          setReached((r) => Math.max(r, next));
          return next;
        });
      }, holdMs + FADE_MS);
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        onScreen = entry.isIntersecting;
        sync();
      },
      { threshold: 0.25 },
    );
    observer.observe(box);
    document.addEventListener("visibilitychange", sync);

    return () => {
      stop();
      observer.disconnect();
      document.removeEventListener("visibilitychange", sync);
    };
  }, [frames.length, holdMs]);

  return (
    <div ref={boxRef} className={`relative ${className ?? ""}`}>
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
              dir={frame.dir}
              width={frame.w}
              height={frame.h}
              // Only the visible frame describes itself; the rest are decorative
              // duplicates as far as a screen reader is concerned.
              alt={isCurrent ? frame.alt : ""}
              className="h-full w-full object-cover"
              priority={i === 0}
              eager={i > 0}
            />
          </div>
        );
      })}
    </div>
  );
};

export default PhotoCycle;
