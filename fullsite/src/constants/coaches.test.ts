/** Who the coaching page offers private lessons for.
 *
 * The PRIVATE LESSONS panel renders for every coach, and when a coach has no pricing it
 * falls back to "Private availability coming soon" with a mail link. That is right for
 * somebody who has not set their pricing up yet and wrong for somebody who has stopped
 * coaching: it invites a member to email about a lesson nobody is going to give.
 *
 * Tato, Eugene and Axel stopped coaching at Foundry (2026-09-18) and it is not known
 * whether they return, so their panel is hidden rather than deleted along with their
 * bios.
 */
import { describe, expect, it } from "vitest";

import { COACHES } from "./coaches";

const by = (id: string) => COACHES.find((c) => c.id === id);
const STOPPED = ["eugene", "tato", "axel"];

describe("coaches who are not taking private lessons", () => {
  it.each(STOPPED)("%s is marked as not taking them", (id) => {
    expect(by(id)?.takingPrivateLessons).toBe(false);
  });

  it.each(STOPPED)("%s advertises no rate at all", (id) => {
    // Eugene's used to be the last rate on the page derived from free text rather than
    // Playtomic, and it had drifted to being the cheapest on offer.
    expect(by(id)?.privateLessons).toBeUndefined();
  });

  it.each(STOPPED)("%s keeps their bio and photo", (id) => {
    // Hidden lessons, not a deleted coach: removing them loses the photo and the
    // aliases that match their historic classes.
    const c = by(id);
    expect(c?.bio).toBeTruthy();
    expect(c?.photo).toBeTruthy();
    expect(c?.aliases.length).toBeGreaterThan(0);
  });
});

describe("coaches who are still taking them", () => {
  it.each(["kelly", "ryan", "carlos", "juan"])("%s is untouched", (id) => {
    const c = by(id);
    expect(c?.takingPrivateLessons).not.toBe(false);
    expect(c?.privateLessons?.rate).toMatch(/^\$\d+\/hour, court included$/);
  });

  it("jack keeps his panel even with no rate set", () => {
    // He is coaching; he simply has no Playtomic pricing rules yet, which is exactly
    // the case the "coming soon" fallback exists for.
    const c = by("jack");
    expect(c?.takingPrivateLessons).not.toBe(false);
    expect(c?.privateLessons).toBeUndefined();
  });
});
