import { useEffect, useState, type RefObject } from "react";
import { prefersReducedMotion } from "@/lib/motion";

/**
 * Whether JS-driven animation may run. False on the server and on the first client
 * render (so hydration matches the prerendered HTML), then the real answer.
 */
export function useMotionAllowed(): boolean {
  const [allowed, setAllowed] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    setAllowed(!prefersReducedMotion());
    if (!mq) return;
    const onChange = () => setAllowed(!mq.matches);
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);
  return allowed;
}

/**
 * Tracks whether an element is on screen. Used to start a JS animation on arrival
 * and to pause a looping one while it is scrolled away.
 */
export function useOnScreen(ref: RefObject<Element>, rootMargin = "0px"): boolean {
  const [onScreen, setOnScreen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([entry]) => setOnScreen(entry.isIntersecting), { rootMargin });
    io.observe(el);
    return () => io.disconnect();
  }, [ref, rootMargin]);
  return onScreen;
}

/** Whether the tab is visible, so loops stop spending frames in a background tab. */
export function usePageVisible(): boolean {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const onChange = () => setVisible(document.visibilityState !== "hidden");
    document.addEventListener("visibilitychange", onChange);
    return () => document.removeEventListener("visibilitychange", onChange);
  }, []);
  return visible;
}
