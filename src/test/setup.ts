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
