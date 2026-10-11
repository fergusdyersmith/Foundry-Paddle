/** Who the coaching page shows, and who it offers private lessons for.
 *
 * Tato, Eugene and Axel stopped coaching at Foundry on 2026-09-18. For three weeks they
 * stayed on the page with their PRIVATE LESSONS panel hidden, in case they came back.
 * The club removed them on 2026-10-11, so they are off the page entirely: a bio on the
 * coaching page says "book this person", whatever the lessons panel says.
 */
import { existsSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { COACHES, coachMatchesName } from "./coaches";

const by = (id: string) => COACHES.find((c) => c.id === id);
const FORMER = [
  { id: "eugene", name: "Eugene Jung" },
  { id: "tato", name: "Tato" },
  { id: "axel", name: "Axel Garay" },
];

describe("coaches who have left", () => {
  it.each(FORMER)("$name is not on the coaching page", ({ id, name }) => {
    expect(by(id)).toBeUndefined();
    // Nor does a class still carrying their name pin them to anyone else's tile.
    expect(COACHES.filter((c) => coachMatchesName(c, name))).toEqual([]);
  });

  it.each(FORMER)("$name's photo is not published", ({ id }) => {
    expect(existsSync(resolve(__dirname, `../../public/coaches/${id}.jpg`))).toBe(false);
  });
});

describe("coaches who asked not to be listed", () => {
  it("Javi is not on the coaching page, at his own request", () => {
    // He coaches at Foundry and Kumi knows him; he has asked not to appear here
    // (confirmed by the club 2026-10-11). Not an oversight to fix.
    expect(COACHES.filter((c) => /\bjavi(er)?\b/i.test([c.name, ...c.aliases].join(" ")))).toEqual([]);
  });
});

describe("coaches who are still taking them", () => {
  it.each(["kelly", "ryan", "carlos", "juan"])("%s is untouched", (id) => {
    const c = by(id);
    expect(c?.takingPrivateLessons).not.toBe(false);
    expect(c?.privateLessons?.rate).toMatch(/^\$\d+\/hour, court included$/);
  });

  it.each(["jack", "alejandro"])("%s keeps his panel even with no rate set", (id) => {
    // Coaching, but with no Playtomic pricing rules yet, which is exactly the case the
    // "coming soon" fallback exists for. Alejandro joined the page on 2026-10-11.
    const c = by(id);
    expect(c).toBeDefined();
    expect(c?.takingPrivateLessons).not.toBe(false);
    expect(c?.privateLessons).toBeUndefined();
  });
});
