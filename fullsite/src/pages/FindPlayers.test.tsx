import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import FindPlayers from "./FindPlayers";
import type { MatchSlotFeed } from "@/lib/matchSlots";

/** A feed shaped like the real one: a strong evening slot, a weak afternoon, and a
 *  couple in between. Deliberately NOT a full week — Kumi withholds thin slots, and the
 *  page has to cope with a sparse grid. */
const FEED: MatchSlotFeed = {
  club_fill_rate: 0.65,
  window_days: 120,
  sample_matches: 562,
  min_sample: 4,
  computed_at: "2026-09-13T01:26:50Z",
  slots: [
    { weekday: 1, hour: 17, matches: 13, fill_rate: 0.8, fill_rate_raw: 0.92 },
    { weekday: 2, hour: 19, matches: 14, fill_rate: 0.77, fill_rate_raw: 0.86 },
    { weekday: 3, hour: 19, matches: 27, fill_rate: 0.72, fill_rate_raw: 0.74 },
    { weekday: 2, hour: 16, matches: 11, fill_rate: 0.45, fill_rate_raw: 0.27 },
  ],
};

function stubFeed(body: unknown, status = 200) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(JSON.stringify(body), { status })),
  );
}

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  // <Seo> renders vite-react-ssg's <Head>, which is react-helmet-async underneath and
  // throws without a provider above it. In the app that provider comes from the SSG
  // runtime, so the test has to supply its own.
  return render(
    <HelmetProvider>
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={["/find-players"]}>
          <FindPlayers />
        </MemoryRouter>
      </QueryClientProvider>
    </HelmetProvider>,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("FindPlayers", () => {
  it("ranks the slots that fill most reliably first", async () => {
    stubFeed(FEED);
    renderPage();

    const best = await screen.findByText("MOST LIKELY TO FILL");
    const card = best.closest("div")!.parentElement!;
    const labels = Array.from(card.querySelectorAll("div")).map((d) => d.textContent ?? "");
    const tue = labels.findIndex((t) => t === "TUE 5 PM");
    const thu = labels.findIndex((t) => t === "THU 7 PM");
    expect(tue).toBeGreaterThanOrEqual(0);
    expect(tue).toBeLessThan(thu);
  });

  it("never shows a percentage without the sample size behind it", async () => {
    stubFeed(FEED);
    renderPage();

    // The headline footnote carries the window and the club baseline...
    await waitFor(() =>
      expect(screen.getByText(/562 open matches/)).toBeTruthy(),
    );
    expect(screen.getByText(/65% filled/)).toBeTruthy();
    // ...and each row carries its own n.
    expect(screen.getAllByText(/13 matches ·/).length).toBeGreaterThan(0);
  });

  it("says the numbers are smoothed rather than presenting them as raw truth", async () => {
    stubFeed(FEED);
    renderPage();
    await waitFor(() =>
      expect(screen.getByText(/adjusted toward the club average/)).toBeTruthy(),
    );
  });

  it("renders an empty cell, not a 0%, for a slot Kumi withheld", async () => {
    stubFeed(FEED);
    renderPage();

    const withheld = await screen.findByTitle(/MON 5 PM — not enough matches yet/);
    expect(withheld.textContent).toBe("");
  });

  it("keeps the sign-up CTA and the how-to when the feed fails", async () => {
    stubFeed({ error: "nope" }, 502);
    renderPage();

    // The tool shows its loading state first, so wait for the failure to land rather
    // than asserting into the gap.
    await waitFor(() =>
      expect(screen.queryByText("BEST TIMES TO POST A MATCH")).toBeNull(),
    );
    expect(screen.getByText("HOW TO POST AN OPEN MATCH")).toBeTruthy();
    // ...but the page still does its actual job.
    expect(screen.getByText("GET MATCHES SENT TO ME")).toBeTruthy();
    expect(screen.getByText("SIGN ME UP")).toBeTruthy();
  });

  it("hides the tool when the feed is empty, and does not claim a 0% club average", async () => {
    stubFeed({ ...FEED, slots: [], club_fill_rate: null, sample_matches: 0 });
    renderPage();

    await waitFor(() => expect(screen.getByText("HOW TO POST AN OPEN MATCH")).toBeTruthy());
    expect(screen.queryByText("MOST LIKELY TO FILL")).toBeNull();
    expect(screen.queryByText(/0% filled/)).toBeNull();
  });

  it("warns that converting a booking forfeits free cancellation", async () => {
    stubFeed(FEED);
    renderPage();
    // This is the one instruction on the page that can cost somebody money.
    await waitFor(() =>
      expect(screen.getByText(/cannot cancel without paying for the court/)).toBeTruthy(),
    );
  });

  it("points at /join for the free matchmaking sign-up", async () => {
    stubFeed(FEED);
    renderPage();
    const cta = await screen.findByText("SIGN ME UP");
    expect(cta.closest("a")?.getAttribute("href")).toBe("/join");
  });
});
