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
  // Ten slots, not four: the page only shows its HARDEST TO FILL card once there are more
  // than eight, and a fixture below that threshold silently skips half the component.
  // Every hour stays inside 16-19 so the grid's column span is predictable, and MON 5 PM
  // is deliberately absent as the withheld-slot case.
  slots: [
    { weekday: 1, hour: 17, matches: 13, fill_rate: 0.8, fill_rate_raw: 0.92 },
    { weekday: 2, hour: 19, matches: 14, fill_rate: 0.77, fill_rate_raw: 0.86 },
    { weekday: 3, hour: 19, matches: 27, fill_rate: 0.72, fill_rate_raw: 0.74 },
    { weekday: 0, hour: 16, matches: 9, fill_rate: 0.7, fill_rate_raw: 0.78 },
    { weekday: 0, hour: 19, matches: 7, fill_rate: 0.68, fill_rate_raw: 0.71 },
    { weekday: 4, hour: 16, matches: 6, fill_rate: 0.66, fill_rate_raw: 0.67 },
    { weekday: 4, hour: 19, matches: 12, fill_rate: 0.62, fill_rate_raw: 0.58 },
    { weekday: 5, hour: 17, matches: 8, fill_rate: 0.55, fill_rate_raw: 0.5 },
    { weekday: 6, hour: 18, matches: 5, fill_rate: 0.5, fill_rate_raw: 0.4 },
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

    const withheld = await screen.findByTitle(/MON 5 PM: not enough matches yet/);
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

  it("does not repeat Playtomic's generic cancellation warning", async () => {
    // It was on this page and it is not true at Foundry, whose own policy (club_knowledge
    // #68) is that cancelling more than 24 hours ahead is always free. It came from
    // Playtomic's help centre, which does not describe this club. Publishing a stricter
    // policy than the club actually has talks people out of posting matches.
    stubFeed(FEED);
    renderPage();
    await waitFor(() => expect(screen.getByText("HOW TO POST AN OPEN MATCH")).toBeTruthy());
    expect(screen.queryByText(/cannot cancel without paying/)).toBeNull();
  });

  it("points at /join for the free matchmaking sign-up", async () => {
    stubFeed(FEED);
    renderPage();
    const cta = await screen.findByText("SIGN ME UP");
    expect(cta.closest("a")?.getAttribute("href")).toBe("/join");
  });

  it("navigates to /join for real instead of routing to it client-side", async () => {
    // /join is server-rendered by server.js (a proxy of Kumi's sign-up page) and has no
    // React route. A react-router <Link> renders an <a href="/join"> too, so checking the
    // href proves nothing — it also swallows the click and renders NotFound. Shipped that
    // way on 2026-09-13: a pasted URL worked, every in-app click 404'd.
    //
    // What separates them is whether the click survives. A plain <a> leaves it alone.
    stubFeed(FEED);
    renderPage();

    for (const label of ["GET MATCHES SENT TO ME", "SIGN ME UP"]) {
      const anchor = (await screen.findByText(label)).closest("a")!;
      const click = new MouseEvent("click", { bubbles: true, cancelable: true, button: 0 });
      anchor.dispatchEvent(click);
      expect(click.defaultPrevented, `${label} is intercepted by the router`).toBe(false);
    }
  });

  it("links the WhatsApp group to /community rather than just naming it", async () => {
    stubFeed(FEED);
    renderPage();
    const link = (await screen.findByText("WhatsApp group")).closest("a");
    expect(link?.getAttribute("href")).toBe("/community");
  });

  it("does not ask the host to post to the WhatsApp group, which happens automatically", async () => {
    stubFeed(FEED);
    renderPage();
    // "automatically" also appears in the convert-a-booking box, so anchor on the
    // sentence unique to this card.
    await waitFor(() =>
      expect(screen.getByText(/every public match is posted into the/i)).toBeTruthy(),
    );
    expect(screen.queryByText(/tell the/)).toBeNull();
  });

  it("shows when the figures were last recomputed", async () => {
    // If the nightly job dies the page keeps rendering the same numbers forever; this
    // line is the only thing that would tell a visitor they had stopped moving.
    stubFeed({ ...FEED, computed_at: new Date().toISOString() });
    renderPage();
    await waitFor(() => expect(screen.getByText("Updated today")).toBeTruthy());
  });
});
