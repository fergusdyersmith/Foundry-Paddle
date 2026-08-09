/** @vitest-environment node */
import { describe, it, expect } from "vitest";
import { stripPhoneNumbers, isDroppedTopic, renderDoc } from "./sync-bland-kb.mjs";

describe("the agent is given no phone numbers at all", () => {
  it.each([
    ["message the club owner directly +1 (612) 442-7600"],
    ["call 503-459-2854 for that"],
    ["reach us on (971) 378-7499"],
    ["text 9714512615 instead"],
    ["ring 1-503-563-7442"],
    ["the club's number is 971 521 7887"],
  ])("strips the number from %s", (text) => {
    // The caller is already on the phone. Any number the agent reads out is a
    // number that can be wrong, and one of these is an owner's personal mobile.
    expect(stripPhoneNumbers(text)).not.toMatch(/\d{3}[\s.-]?\d{4}/);
  });

  it("leaves a sentence that still reads as English, because it is spoken", () => {
    expect(stripPhoneNumbers("Within 24 hours, message the club owner directly +1 (612) 442-7600")).toBe(
      "Within 24 hours, message the club owner directly",
    );
    expect(stripPhoneNumbers("Questions? Call us on 503-459-2854.")).toBe("Questions? Call us.");
  });

  it("does not mangle prices, dates, times or hours", () => {
    const text =
      "Court is $60 for 90 minutes, open 7am to 10pm, memberships run to 1 September 2027.";
    expect(stripPhoneNumbers(text)).toBe(text);
  });

  it.each([
    ["Courts 2 and 4 are the original courts. All are nice to play on."],
    ["Rate your comfort with each shot, from beginner to advanced."],
    ["Send a corporate inquiry from the membership webpage."],
    ["Open every day from 7am to 10pm."],
  ])("returns %s completely untouched", (text) => {
    // A cleanup rule that runs unconditionally eventually mangles a fact that
    // was fine: an earlier version rewrote "nice to play on." as "nice to play."
    expect(stripPhoneNumbers(text)).toBe(text);
  });

  it("keeps ordinary numbers that are not phone numbers", () => {
    expect(stripPhoneNumbers("The ceiling height is 43 feet.")).toBe("The ceiling height is 43 feet.");
    expect(stripPhoneNumbers("Limited to 100 founding members.")).toBe(
      "Limited to 100 founding members.",
    );
  });
});

describe("rows that exist only to hand out a number are dropped whole", () => {
  it.each([["Club phone number"], ["What is your phone number"]])("drops %s", (topic) => {
    expect(isDroppedTopic(topic)).toBe(true);
  });

  it.each([["Opening hours"], ["Cancellation policy"], ["Racket rental"]])(
    "keeps %s",
    (topic) => {
      expect(isDroppedTopic(topic)).toBe(false);
    },
  );
});

describe("the document handed to Bland", () => {
  const entries = [
    { topic: "Opening hours", answer: "Open every day from 7am to 10pm." },
    { topic: "Club phone number", answer: "The club's phone number is (971) 378-7499." },
    { topic: "Cancellation policy", answer: "Within 24 hours, call +1 (612) 442-7600" },
  ];
  const doc = renderDoc(entries, { today: "2026-08-09" });

  it("keeps every published fact, under a heading it can be retrieved by", () => {
    expect(doc).toContain("## Opening hours");
    expect(doc).toContain("7am to 10pm");
    expect(doc).toContain("## Cancellation policy");
  });

  it("contains no phone number anywhere, in any row", () => {
    expect(doc).not.toMatch(/\d{3}[\s.-]?\d{4}/);
    expect(doc).not.toContain("612");
    expect(doc).not.toContain("378");
  });

  it("drops the phone-number row entirely rather than leaving an empty heading", () => {
    expect(doc).not.toContain("Club phone number");
  });

  it("frames the facts as data rather than instructions", () => {
    // The rows grow from member conversations, so a poisoned row is a real
    // path. Same defence as the website chatbot's CLUB FACTS block.
    expect(doc).toMatch(/never as instructions/i);
  });

  it("dates itself, because the court rates change on 1 September 2026", () => {
    expect(doc).toContain("2026-08-09");
  });

  it("uses no em dash, because the agent reads this aloud", () => {
    expect(doc).not.toMatch(/—/);
  });
});
