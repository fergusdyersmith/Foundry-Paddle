import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { PadelEvent } from "@/types/events";
import type { PlannedSession } from "@/constants/previewEvening";
import { mergePreviewSessions, withCampaign } from "./previewEvening";

const DATE = "2026-10-10";
const PATTERN = /preview/i;
const CAMPAIGN = "preview-evening";

const planned: PlannedSession[] = [
  { start: "17:00", end: "19:00", bookUrl: null },
  { start: "18:00", end: "20:00", bookUrl: null },
  { start: "19:00", end: "21:00", bookUrl: null },
];

const event = (over: Partial<PadelEvent>): PadelEvent => ({
  id: "e1",
  title: "Neighborhood Preview Evening",
  date: DATE,
  start_time: "17:00",
  end_time: "19:00",
  duration_min: 120,
  price: "$25",
  booking_type: "TOURNAMENT",
  court: "4 courts",
  signed_up: 0,
  capacity: 16,
  book_url: "https://app.playtomic.com/tournaments/abc",
  ...over,
} as PadelEvent);

describe("mergePreviewSessions", () => {
  it("shows every planned time with no link when Playtomic has nothing yet", () => {
    const out = mergePreviewSessions(planned, [], DATE, PATTERN, CAMPAIGN);
    expect(out.map((s) => s.start)).toEqual(["17:00", "18:00", "19:00"]);
    expect(out.every((s) => s.bookUrl === null && s.spotsLeft === null && !s.full)).toBe(true);
  });

  it("takes the link and the places left from the matching live session", () => {
    const out = mergePreviewSessions(planned, [event({ signed_up: 5 })], DATE, PATTERN, CAMPAIGN);
    expect(out[0].bookUrl).toContain("https://app.playtomic.com/tournaments/abc");
    expect(out[0].spotsLeft).toBe(11);
    expect(out[1].bookUrl).toBeNull();
  });

  it("ignores the rest of that day's programme and other days' previews", () => {
    const out = mergePreviewSessions(
      planned,
      [event({ title: "Saturday Social" }), event({ date: "2026-10-11" })],
      DATE,
      PATTERN,
      CAMPAIGN,
    );
    expect(out.every((s) => s.bookUrl === null)).toBe(true);
  });

  it("keeps booking open from a pasted link while the event is still private", () => {
    // Unreleased: the feed strips book_url until five days out. The paper lands before that.
    const pasted = [{ ...planned[0], bookUrl: "https://app.playtomic.com/tournaments/pasted" }, ...planned.slice(1)];
    const out = mergePreviewSessions(pasted, [event({ book_url: null, booking_open: false })], DATE, PATTERN, CAMPAIGN);
    expect(out[0].bookUrl).toContain("/tournaments/pasted");
  });

  it("appends a fourth session nobody planned for, in time order", () => {
    const out = mergePreviewSessions(
      planned,
      [event({ id: "e4", start_time: "20:00", end_time: "22:00" })],
      DATE,
      PATTERN,
      CAMPAIGN,
    );
    expect(out.map((s) => s.start)).toEqual(["17:00", "18:00", "19:00", "20:00"]);
    expect(out[3].bookUrl).not.toBeNull();
  });

  it("marks a full session and offers its waitlist instead", () => {
    const out = mergePreviewSessions(
      planned,
      [event({ signed_up: 16, waitlist: { url: "https://app.playtomic.com/w/1", queued: 2 } })],
      DATE,
      PATTERN,
      CAMPAIGN,
    );
    expect(out[0].full).toBe(true);
    expect(out[0].spotsLeft).toBe(0);
    expect(out[0].waitlistUrl).toBe("https://app.playtomic.com/w/1");
  });
});

describe("withCampaign", () => {
  it("tags the link without disturbing what Playtomic put on it", () => {
    const u = new URL(withCampaign("https://app.playtomic.com/tournaments/abc?foo=1", "juniors"));
    expect(u.searchParams.get("foo")).toBe("1");
    expect(u.searchParams.get("utm_source")).toBe("website");
    expect(u.searchParams.get("utm_campaign")).toBe("juniors");
  });

  it("tags merged sessions with the campaign it was given", () => {
    const out = mergePreviewSessions(planned, [event({})], DATE, PATTERN, "juniors");
    expect(new URL(out[0].bookUrl!).searchParams.get("utm_campaign")).toBe("juniors");
  });

  it("hands back something it cannot parse rather than throwing", () => {
    expect(withCampaign("not a url", CAMPAIGN)).toBe("not a url");
  });

  it("leaves out unplanned Playtomic events when asked to (the junior clinic)", () => {
    const planned: PlannedSession[] = [{ start: "09:00", end: "10:30", bookUrl: null }];
    const stray = event({ start_time: "13:00", end_time: "14:30" });
    expect(mergePreviewSessions(planned, [stray], DATE, PATTERN, "juniors").map((s) => s.start))
      .toEqual(["09:00", "13:00"]);
    expect(mergePreviewSessions(planned, [stray], DATE, PATTERN, "juniors", false).map((s) => s.start))
      .toEqual(["09:00"]);
  });
});

/** The /juniors page wiring, guarded at source because the alternative is mounting a
 *  large page component for two attributes. Both of these have been wrong in production
 *  once each. */
describe("the juniors page signup button", () => {
  // cwd-relative, not import.meta.url: this project's tests run under jsdom, where
  // import.meta.url is not a file:// URL and readFileSync rejects it.
  const src = () =>
    readFileSync(resolve(process.cwd(), "src/pages/Juniors.tsx"), "utf8");

  it("sends SIGN UP to the Playtomic event, not to the form", () => {
    // Kelly, 6 Oct: the button scrolled to the on-page form, left over from when the
    // clinic went free on 2 October and the website was the signup. The free
    // registration lives in Playtomic, and the feed has carried the link all along.
    expect(src()).toMatch(/href=\{s\.bookUrl\}/);
  });

  it("keeps the form as the fallback when there is no link yet", () => {
    // The feed hands out no link while an event is unreleased. A button that scrolls
    // somewhere useful beats one that cannot take a booking.
    expect(src()).toMatch(/s\.bookUrl \? \(/);
    expect(src()).toMatch(/href="#signup"/);
  });

  it("still refuses to list a Playtomic session nobody planned", () => {
    // Monica, 3 Oct: a 1 PM "Junior Clinic w/ Diego Valeri" left in Playtomic appeared
    // on /juniors as a third session. Kelly, 6 Oct: the same 1 PM session must stay off
    // the site entirely so the 9am and 10:30 fill first. The `false` is what stops this
    // page inventing a session from a stray event.
    expect(src()).toMatch(/false, \/\/ only the two planned sessions/);
  });
});
