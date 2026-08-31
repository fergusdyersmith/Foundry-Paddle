/** The clock has to clear the court screen's own controls.
 *
 *  This page is mostly seen embedded in the club's court screen (padelmaps' /cameras/tv),
 *  which lays a menu button over the top right corner. It landed on the clock and
 *  swallowed the "PM" (reported from the wall, 2026-08-30).
 *
 *  The overlay is in a different document on a different origin, so it cannot be measured
 *  or moved from here -- the clock is the side that gives way. That makes the padding look
 *  like an arbitrary bit of styling to anybody tidying this file later, which is exactly
 *  why it is pinned here with its reason.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

// Resolved from the vitest root rather than import.meta.url: this config does not give
// the test module a file:// URL, so new URL(...) throws before a single test runs.
const SRC = readFileSync(resolve(__dirname, "TvScreen.tsx"), "utf8");

describe("the TV clock", () => {
  it("keeps its right padding clear of an overlaid control", () => {
    const clock = SRC.split('format(now, "EEE MMM d · h:mm a")')[0].slice(-260);
    expect(clock).toMatch(/className="pr-\d+ /);
  });

  it("leaves enough room at the smallest screen the canvas is scaled for", () => {
    // Fixed 1920 canvas, scale = min(w/1920, h/1080), so a fixed-size overlay covers more
    // CANVAS pixels the smaller the screen is. The overlay is ~46 screen px wide.
    const pad = Number(SRC.match(/className="pr-(\d+) font-display text-2xl tabular-nums/)![1]);
    const canvasPx = pad * 4; // tailwind spacing unit
    const covers = (w: number) => 46 / (w / 1920);
    expect(canvasPx).toBeGreaterThan(covers(1920));
    expect(canvasPx).toBeGreaterThan(covers(1280));
  });
});
