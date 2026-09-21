import { describe, expect, it } from "vitest";
import type { PadelEvent } from "@/types/events";
import type { PlannedSession } from "@/constants/previewEvening";
import { mergePreviewSessions, withCampaign } from "./previewEvening";

const DATE = "2026-10-10";
const PATTERN = /preview/i;

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
    const out = mergePreviewSessions(planned, [], DATE, PATTERN);
    expect(out.map((s) => s.start)).toEqual(["17:00", "18:00", "19:00"]);
    expect(out.every((s) => s.bookUrl === null && s.spotsLeft === null && !s.full)).toBe(true);
  });

  it("takes the link and the places left from the matching live session", () => {
    const out = mergePreviewSessions(planned, [event({ signed_up: 5 })], DATE, PATTERN);
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
    );
    expect(out.every((s) => s.bookUrl === null)).toBe(true);
  });

  it("keeps booking open from a pasted link while the event is still private", () => {
    // Unreleased: the feed strips book_url until five days out. The paper lands before that.
    const pasted = [{ ...planned[0], bookUrl: "https://app.playtomic.com/tournaments/pasted" }, ...planned.slice(1)];
    const out = mergePreviewSessions(pasted, [event({ book_url: null, booking_open: false })], DATE, PATTERN);
    expect(out[0].bookUrl).toContain("/tournaments/pasted");
  });

  it("appends a fourth session nobody planned for, in time order", () => {
    const out = mergePreviewSessions(
      planned,
      [event({ id: "e4", start_time: "20:00", end_time: "22:00" })],
      DATE,
      PATTERN,
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
    );
    expect(out[0].full).toBe(true);
    expect(out[0].spotsLeft).toBe(0);
    expect(out[0].waitlistUrl).toBe("https://app.playtomic.com/w/1");
  });
});

describe("withCampaign", () => {
  it("tags the link without disturbing what Playtomic put on it", () => {
    const u = new URL(withCampaign("https://app.playtomic.com/tournaments/abc?foo=1"));
    expect(u.searchParams.get("foo")).toBe("1");
    expect(u.searchParams.get("utm_source")).toBe("website");
    expect(u.searchParams.get("utm_campaign")).toBe("preview-evening");
  });

  it("hands back something it cannot parse rather than throwing", () => {
    expect(withCampaign("not a url")).toBe("not a url");
  });
});
