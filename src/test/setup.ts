import "@testing-library/jest-dom";

// The server-side tests (server/**) run in the node environment, where there is no window
// to patch. Everything below is browser-only setup, so skip it there.
if (typeof window !== "undefined") {
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});
}

// framer-motion's `whileInView` (BookCTA, Community, FindPlayers and every other section
// that fades in on scroll) calls IntersectionObserver on mount, and jsdom has none. The
// component throws during render, so the failure is not "the animation did not play" but
// "the page would not mount at all" — which makes any page using it untestable.
//
// Nothing observes anything here: the callback is never fired, so an element under
// `whileInView` stays at its initial style. Assert on text and roles, not on opacity.
if (typeof window !== "undefined" && !("IntersectionObserver" in window)) {
  class NoopIntersectionObserver implements IntersectionObserver {
    readonly root = null;
    readonly rootMargin = "";
    readonly thresholds: ReadonlyArray<number> = [];
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords(): IntersectionObserverEntry[] {
      return [];
    }
  }
  Object.defineProperty(window, "IntersectionObserver", {
    writable: true,
    value: NoopIntersectionObserver,
  });
  Object.defineProperty(globalThis, "IntersectionObserver", {
    writable: true,
    value: NoopIntersectionObserver,
  });
}
