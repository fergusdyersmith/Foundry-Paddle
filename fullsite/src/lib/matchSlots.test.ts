import { describe, expect, it } from "vitest";
import {
  type MatchSlot,
  hourLabel,
  hourRange,
  hourTick,
  intensity,
  percent,
  rankSlots,
  slotLabel,
  slotMap,
  verdict,
} from "./matchSlots";

const slot = (weekday: number, hour: number, fill_rate: number, matches = 10): MatchSlot => ({
  weekday,
  hour,
  matches,
  fill_rate,
  fill_rate_raw: fill_rate,
});

describe("labels", () => {
  it("renders 12-hour clock times without minutes", () => {
    expect(hourLabel(0)).toBe("12 AM");
    expect(hourLabel(9)).toBe("9 AM");
    expect(hourLabel(12)).toBe("12 PM");
    expect(hourLabel(19)).toBe("7 PM");
  });

  it("names the weekday from a Monday-zero index", () => {
    // Kumi sends Python's weekday(), where Monday is 0 — NOT JavaScript's getDay(),
    // where Sunday is 0. Off by one here relabels the entire chart.
    expect(slotLabel(slot(0, 19, 0.7))).toBe("MON 7 PM");
    expect(slotLabel(slot(6, 8, 0.7))).toBe("SUN 8 AM");
  });

  it("marks morning and afternoon in the grid header", () => {
    // Bare numbers left 6 7 8 9 10 11 12 1 2 with no morning/afternoon boundary.
    expect(hourTick(6)).toBe("6a");
    expect(hourTick(11)).toBe("11a");
    expect(hourTick(12)).toBe("12p");
    expect(hourTick(13)).toBe("1p");
    expect(hourTick(21)).toBe("9p");
    expect(hourTick(0)).toBe("12a");
  });

  it("rounds rates to whole percents", () => {
    expect(percent(0.7845)).toBe(78);
    expect(percent(0.455)).toBe(46);
  });
});

describe("rankSlots", () => {
  it("puts the most reliable slot first", () => {
    const ranked = rankSlots([slot(0, 16, 0.52), slot(2, 19, 0.78), slot(4, 18, 0.64)]);
    expect(ranked.map((s) => s.fill_rate)).toEqual([0.78, 0.64, 0.52]);
  });

  it("breaks ties on the bigger sample, because more evidence is a better bet", () => {
    const ranked = rankSlots([slot(1, 10, 0.7, 5), slot(3, 19, 0.7, 27)]);
    expect(ranked[0].matches).toBe(27);
  });

  it("does not mutate the input", () => {
    const input = [slot(0, 9, 0.4), slot(1, 9, 0.9)];
    rankSlots(input);
    expect(input[0].fill_rate).toBe(0.4);
  });
});

describe("hourRange", () => {
  it("spans only the hours the club has data for", () => {
    expect(hourRange([slot(0, 9, 0.6), slot(3, 12, 0.6), slot(5, 11, 0.6)])).toEqual([
      9, 10, 11, 12,
    ]);
  });

  it("is empty when there is nothing to draw", () => {
    expect(hourRange([])).toEqual([]);
  });
});

describe("intensity", () => {
  it("spreads across the range actually present, not 0-100%", () => {
    // Smoothing compresses published rates into a band. An absolute 0->1 scale would
    // paint every one of these in the middle of the ramp and show no difference at all.
    const slots = [slot(0, 9, 0.45), slot(1, 9, 0.62), slot(2, 9, 0.8)];
    expect(intensity(0.45, slots)).toBe(0);
    expect(intensity(0.8, slots)).toBe(1);
    expect(intensity(0.62, slots)).toBeGreaterThan(0.4);
    expect(intensity(0.62, slots)).toBeLessThan(0.6);
  });

  it("does not divide by zero when every slot is identical", () => {
    const slots = [slot(0, 9, 0.6), slot(1, 9, 0.6)];
    expect(intensity(0.6, slots)).toBe(1);
  });

  it("is zero with no slots at all", () => {
    expect(intensity(0.6, [])).toBe(0);
  });
});

describe("verdict", () => {
  it("is phrased relative to THIS club's average", () => {
    expect(verdict(0.8, 0.65)).toBe("Fills most often");
    expect(verdict(0.65, 0.65)).toBe("About average");
    expect(verdict(0.45, 0.65)).toBe("Often goes unfilled");
    // The same rate means different things at a club that fills everything.
    expect(verdict(0.8, 0.9)).toBe("Often goes unfilled");
  });

  it("says nothing when there is no baseline to compare against", () => {
    expect(verdict(0.8, null)).toBe("");
  });
});

describe("slotMap", () => {
  it("keys on weekday and hour so the grid can look cells up", () => {
    const m = slotMap([slot(2, 19, 0.78)]);
    expect(m.get("2-19")?.fill_rate).toBe(0.78);
    // A slot Kumi withheld is simply absent — the grid must render an empty cell,
    // never a 0%.
    expect(m.get("6-6")).toBeUndefined();
  });
});
