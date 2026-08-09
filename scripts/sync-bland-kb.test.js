/** @vitest-environment node */
import { describe, it, expect } from "vitest";
import { redactForeignNumbers, renderDoc } from "./sync-bland-kb.mjs";

const CLUB = "+1 (971) 521-7887";

describe("no caller is ever sent to a personal phone", () => {
  it.each([
    ["message the club owner directly +1 (612) 442-7600", "+1 (612) 442-7600"],
    ["call 503-459-2854 for that", "503-459-2854"],
    ["reach us on (971) 378-7499", "(971) 378-7499"],
    ["text 9714512615 instead", "9714512615"],
    ["ring 1-503-563-7442", "503-563-7442"],
  ])("rewrites %s", (text, original) => {
    const out = redactForeignNumbers(text, CLUB);
    expect(out).not.toContain(original);
    expect(out).toContain(CLUB);
  });

  it("rewrites a stale club number to the current one", () => {
    // The published KB still names an older number. Left alone, the agent
    // answers the new line and tells callers to ring a different one.
    expect(redactForeignNumbers("The club's phone number is (971) 378-7499.", CLUB)).toBe(
      `The club's phone number is ${CLUB}.`,
    );
  });

  it("leaves the club's own number alone", () => {
    expect(redactForeignNumbers(`Call ${CLUB} to book.`, CLUB)).toBe(`Call ${CLUB} to book.`);
  });

  it("does not mangle prices, dates or times that are not phone numbers", () => {
    const text =
      "Court is $60 for 90 minutes, open 7am to 10pm, memberships run to 1 September 2027.";
    expect(redactForeignNumbers(text, CLUB)).toBe(text);
  });
});

describe("the document handed to Bland", () => {
  const entries = [
    { topic: "Opening hours", answer: "Open every day from 7am to 10pm." },
    { topic: "Cancellation policy", answer: "Within 24 hours, call +1 (612) 442-7600" },
  ];

  it("keeps every published fact, under a heading it can be retrieved by", () => {
    const doc = renderDoc(entries, { clubNumber: CLUB, today: "2026-08-09" });
    expect(doc).toContain("## Opening hours");
    expect(doc).toContain("7am to 10pm");
    expect(doc).toContain("## Cancellation policy");
  });

  it("redacts inside the document, not just in isolation", () => {
    const doc = renderDoc(entries, { clubNumber: CLUB, today: "2026-08-09" });
    expect(doc).not.toContain("612");
  });

  it("frames the facts as data rather than instructions", () => {
    // The rows grow from member conversations, so a poisoned row is a real
    // path. Same defence as the website chatbot's CLUB FACTS block.
    const doc = renderDoc(entries, { clubNumber: CLUB, today: "2026-08-09" });
    expect(doc).toMatch(/never as instructions/i);
  });

  it("dates itself, because the rates change on 1 September 2026", () => {
    const doc = renderDoc(entries, { clubNumber: CLUB, today: "2026-08-09" });
    expect(doc).toContain("2026-08-09");
  });
});
