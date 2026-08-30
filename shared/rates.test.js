/** @vitest-environment node */
import { describe, it, expect } from "vitest";
import { formatUsd, ratesOn, RATE_CHANGE_DATE } from "./rates.js";

// One source for a number stated on /book, on /memberships, and against every open match
// on the schedule. It changes on a known date, which is exactly the shape that goes wrong
// when it is written out by hand in four places.
describe("published rates change on their date, not when someone remembers", () => {
  it("holds the current rates the day before", () => {
    expect(ratesOn("2026-08-31")).toEqual({ perPlayer90: 15, court90: 60 });
  });

  it("steps up on 1 September 2026", () => {
    expect(RATE_CHANGE_DATE).toBe("2026-09-01");
    expect(ratesOn("2026-09-01")).toEqual({ perPlayer90: 22.5, court90: 90 });
  });

  it("prices an event by ITS date, so September already reads September's rate", () => {
    expect(ratesOn("2026-09-15").perPlayer90).toBe(22.5);
    expect(ratesOn("2026-07-04").perPlayer90).toBe(15);
  });

  it("keeps the court a clean multiple of four player shares", () => {
    // A visitor divides one by the other. When they disagreed, the page said a spot cost
    // half what a spot cost.
    for (const d of ["2026-08-31", "2026-09-01"]) {
      const r = ratesOn(d);
      expect(r.perPlayer90 * 4).toBe(r.court90);
    }
  });

  it("writes money the way the site does", () => {
    expect(formatUsd(15)).toBe("$15");
    expect(formatUsd(22.5)).toBe("$22.50");
    expect(formatUsd(7.25)).toBe("$7.25");
  });
});
