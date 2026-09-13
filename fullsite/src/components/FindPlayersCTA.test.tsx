import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import FindPlayersCTA from "./FindPlayersCTA";

const renderCTA = () =>
  render(
    <MemoryRouter>
      <FindPlayersCTA />
    </MemoryRouter>,
  );

describe("FindPlayersCTA", () => {
  it("sends the primary action to /join, which is the whole point of the section", () => {
    renderCTA();
    const primary = screen.getByText("GET MATCHES SENT TO ME").closest("a");
    expect(primary?.getAttribute("href")).toBe("/join");
  });

  it("offers /find-players as the secondary route for people who already have a court", () => {
    renderCTA();
    const secondary = screen.getByText(/See the best times to post/).closest("a");
    expect(secondary?.getAttribute("href")).toBe("/find-players");
  });

  it("says it is free, because that is the objection it exists to answer", () => {
    renderCTA();
    expect(screen.getByText(/Free · No membership needed/)).toBeTruthy();
  });

  it("fetches nothing", async () => {
    // The homepage must not hang on a third-party feed. If this component ever grows a
    // fetch, the fill rates belong on /find-players instead — a slow upstream there
    // costs one page, here it costs the front door.
    const calls: unknown[] = [];
    const original = globalThis.fetch;
    globalThis.fetch = ((...args: unknown[]) => {
      calls.push(args);
      return Promise.reject(new Error("no network in this component"));
    }) as typeof fetch;
    try {
      renderCTA();
      await Promise.resolve();
      expect(calls).toHaveLength(0);
    } finally {
      globalThis.fetch = original;
    }
  });
});
