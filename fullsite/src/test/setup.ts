import "@testing-library/jest-dom";

// Guarded because this file is loaded for EVERY test, including the ones that ask for
// `@vitest-environment node` and so have no window. Unguarded, it threw before the test
// file was even collected, and src/lib/{events,calendar,memberPricing}.test.ts -- three
// whole files -- had stopped running without anybody noticing: the summary still read
// green in the tests column while the files column said three had failed.
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
