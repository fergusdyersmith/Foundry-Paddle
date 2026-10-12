/**
 * The scroll half of the site's motion system (the CSS half, and the why, are in
 * index.css under "Motion"; docs/motion.md is the guide).
 *
 * Elements marked [data-reveal], and every .section-divider, animate in the first time
 * they scroll into view. This module decides when: it watches them with one shared
 * IntersectionObserver and sets [data-shown] on each as it arrives.
 *
 * The order of the first pass matters. The prerendered HTML has everything visible, and
 * nothing is hidden until html[data-motion] is set. So before setting it, anything
 * already on screen (or scrolled past) is marked shown and simply stays as painted.
 * Only content still below the fold is hidden, and the visitor never sees that happen.
 *
 * Content that mounts later (a client-side navigation, a list that arrives from a
 * fetch) is picked up by a MutationObserver and enters the same way.
 *
 * [data-shown] is an attribute React never renders, so a re-render cannot take it off
 * again the way it would replace a class name.
 */

const SELECTOR = "[data-reveal], .section-divider";

/** Below this line in the viewport, content counts as not yet arrived. */
const ROOT_MARGIN = "0px 0px -8% 0px";

let started = false;

export function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/** Start the reveal engine. Idempotent; a no-op on the server, without
 *  IntersectionObserver, and for visitors who asked for reduced motion. */
export function initMotion(): void {
  if (started || typeof window === "undefined") return;
  if (typeof IntersectionObserver === "undefined" || typeof MutationObserver === "undefined") return;
  if (prefersReducedMotion()) return;
  started = true;

  const show = (el: Element) => el.setAttribute("data-shown", "");

  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        show(entry.target);
        io.unobserve(entry.target);
      }
    },
    { rootMargin: ROOT_MARGIN },
  );

  const track = (el: Element) => {
    if (!el.hasAttribute("data-shown")) io.observe(el);
  };

  // First pass, before anything is hidden.
  const fold = window.innerHeight;
  document.querySelectorAll(SELECTOR).forEach((el) => {
    if (el.getBoundingClientRect().top < fold) show(el);
    else track(el);
  });
  document.documentElement.setAttribute("data-motion", "");

  new MutationObserver((records) => {
    for (const record of records) {
      record.addedNodes.forEach((node) => {
        if (!(node instanceof Element)) return;
        if (node.matches(SELECTOR)) track(node);
        node.querySelectorAll(SELECTOR).forEach(track);
      });
    }
  }).observe(document.body, { childList: true, subtree: true });
}

/** For tests only. */
export function resetMotionForTests(): void {
  started = false;
  document.documentElement.removeAttribute("data-motion");
}
