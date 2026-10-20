import { act, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LeagueTeams, OpenWhosIn } from "./WhosIn";
import { updatedLabel } from "@/lib/updatedLabel";

function stub(body: unknown, status = 200) {
  const f = vi.fn(async () => new Response(JSON.stringify(body), { status }));
  vi.stubGlobal("fetch", f);
  return f;
}

afterEach(() => vi.unstubAllGlobals());

const OPEN = {
  available: true, updated_at: "2026-10-20T21:45:00Z", total: 7,
  levels: [
    { key: "beginner", label: "Beginner", count: 4, pairs: [["Kyle L.", "Rachael B."]], partner_pending: [], looking: ["Nathan M.", "Wanqi H."] },
    { key: "advanced", label: "Advanced", count: 3, pairs: [["Michael M.", "Sheehan T."]], partner_pending: ["Kelly C."], looking: [] },
  ],
};

describe("OpenWhosIn", () => {
  it("lists the pairs, who is waiting on a partner and who is looking, by level", async () => {
    const f = stub(OPEN);
    render(<OpenWhosIn />);
    expect(await screen.findByRole("heading", { name: "WHO'S IN SO FAR" })).toBeTruthy();
    expect((f.mock.calls[0] as unknown as [string])[0]).toBe("/api/open/entries");
    expect(screen.getByText("Kyle L. and Rachael B.")).toBeTruthy();
    expect(screen.getByText("Michael M. and Sheehan T.")).toBeTruthy();
    expect(screen.getByText("Kelly C.")).toBeTruthy();
    expect(screen.getByText("Nathan M.")).toBeTruthy();
    expect(screen.getByText("4 in")).toBeTruthy();
    expect(screen.getByText("7 players in")).toBeTruthy();
    expect(screen.getAllByRole("heading", { name: "Looking for a partner" })).toHaveLength(1);
    expect(screen.getByRole("link", { name: "portland@foundrypadel.com" })).toBeTruthy();
    expect(document.body.textContent).not.toContain("—");
  });

  it("shows nothing when Kumi has no list, or nobody is in yet", async () => {
    const f = stub({ available: false });
    const { container, unmount } = render(<OpenWhosIn />);
    await waitFor(() => expect(f).toHaveBeenCalled());
    await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
    expect(container.innerHTML).toBe("");
    unmount();
    stub({ ...OPEN, total: 0, levels: [] });
    const second = render(<OpenWhosIn />);
    await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
    expect(second.container.innerHTML).toBe("");
  });
});

describe("LeagueTeams", () => {
  const LEAGUE = {
    available: true, updated_at: "2026-10-20T21:45:00Z", total_teams: 2,
    leagues: [{ key: "mens", label: "Men's", levels: [{ key: "intermediate", label: "Intermediate",
      teams: [{ name: "RAAS", players: ["Aaron R.", "Shiv A."] }, { name: null, players: ["Ameya S.", "Nate D."] }], looking: ["Sam T."] }] }],
  };

  it("lists each team, with its name when it has one, and who is looking", async () => {
    stub(LEAGUE);
    render(<LeagueTeams closesLabel="Sunday, October 25" closed={false} />);
    expect(await screen.findByRole("heading", { name: "TEAMS SO FAR" })).toBeTruthy();
    expect(screen.getByText("RAAS")).toBeTruthy();
    expect(screen.getByText(/Aaron R\. and Shiv A\./)).toBeTruthy();
    expect(screen.getByText("Ameya S. and Nate D.")).toBeTruthy();
    expect(screen.getByText("Sam T.")).toBeTruthy();
    expect(screen.getByText(/Signups close Sunday, October 25\./)).toBeTruthy();
  });

  it("drops the closing date once signups have closed, and hides when unavailable", async () => {
    stub(LEAGUE);
    const { unmount } = render(<LeagueTeams closesLabel="Sunday, October 25" closed />);
    expect(await screen.findByText("Every team in this season, by league and level.")).toBeTruthy();
    unmount();
    const f = stub({ available: false });
    const { container } = render(<LeagueTeams closesLabel="x" closed={false} />);
    await waitFor(() => expect(f).toHaveBeenCalled());
    await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
    expect(container.innerHTML).toBe("");
  });
});

describe("updatedLabel", () => {
  it("says the clock time today and the date before that, in Portland", () => {
    const now = new Date("2026-10-20T23:00:00Z");                    // 4pm in Portland
    expect(updatedLabel("2026-10-20T21:45:00Z", now)).toBe("Updated 2:45 PM");
    expect(updatedLabel("2026-10-19T21:45:00Z", now)).toBe("Updated Oct 19, 2:45 PM");
    expect(updatedLabel(null, now)).toBeNull();
    expect(updatedLabel("nope", now)).toBeNull();
  });
});
