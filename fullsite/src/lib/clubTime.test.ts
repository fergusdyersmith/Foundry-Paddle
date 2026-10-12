/** @vitest-environment node */
import { describe, expect, it } from "vitest";
import { clubNow, clubToday, clubTodayDate } from "./clubTime";

// Every instant is written in UTC, so these hold whatever zone the test machine is in.
describe("the club's clock", () => {
  it("reads Portland's date and time, not the visitor's or UTC's", () => {
    // 02:00 UTC on the 29th is 7pm on the 28th in Portland (PDT).
    expect(clubNow(new Date("2026-08-29T02:00:00Z"))).toEqual({ date: "2026-08-28", time: "19:00" });
  });

  it("follows daylight saving", () => {
    // 2am UTC in January is 6pm the day before in Portland (PST, UTC-8).
    expect(clubNow(new Date("2026-01-10T02:00:00Z"))).toEqual({ date: "2026-01-09", time: "18:00" });
  });

  it("writes midnight as 00:00, not 24:00", () => {
    expect(clubNow(new Date("2026-08-29T07:00:00Z")).time).toBe("00:00");
  });

  it("gives today as a date-fns friendly local midnight", () => {
    const d = clubTodayDate(new Date("2026-08-29T02:00:00Z"));
    expect([d.getFullYear(), d.getMonth(), d.getDate(), d.getHours()]).toEqual([2026, 7, 28, 0]);
    expect(clubToday(new Date("2026-08-29T02:00:00Z"))).toBe("2026-08-28");
  });
});
