import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import PayLinkForm from "./PayLinkForm";

const props = {
  idPrefix: "t", endpoint: "/api/open/pay-link", linkKey: "bookUrl" as const,
  intro: "Get the link.", payLabel: "PAY ON PLAYTOMIC", noLink: "Not open yet.", email: "portland@foundrypadel.com",
};

function stub(body: unknown, status = 200) {
  const f = vi.fn(async () => new Response(JSON.stringify(body), { status }));
  vi.stubGlobal("fetch", f);
  return f;
}

afterEach(() => vi.unstubAllGlobals());

describe("PayLinkForm", () => {
  it("asks for the link with every field blank and shows the pay button", async () => {
    const f = stub({ ok: true, bookUrl: "https://app.playtomic.com/tournaments/abc", price: 75 });
    render(<PayLinkForm {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "GET THE PAYMENT LINK" }));
    const pay = await screen.findByRole("link", { name: /PAY ON PLAYTOMIC/ });
    expect(pay.getAttribute("href")).toBe("https://app.playtomic.com/tournaments/abc");
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/open/pay-link");
    expect(JSON.parse(String(init.body))).toEqual({ name: "", email: "", partner: "", website: "" });
  });

  it("sends what was typed, and reads the league's payUrl", async () => {
    const f = stub({ ok: true, payUrl: "https://square.link/u/own", each: 35 });
    render(<PayLinkForm {...props} endpoint="/api/league/pay-link" linkKey="payUrl" payLabel="PAY YOUR $35" />);
    fireEvent.change(screen.getByLabelText(/Your name/), { target: { value: "Tariq Eltayeb" } });
    fireEvent.change(screen.getByLabelText(/Who you are playing with/), { target: { value: "Alois" } });
    fireEvent.click(screen.getByRole("button", { name: "GET THE PAYMENT LINK" }));
    expect((await screen.findByRole("link", { name: /PAY YOUR \$35/ })).getAttribute("href")).toBe("https://square.link/u/own");
    const body = JSON.parse(String((f.mock.calls[0] as unknown as [string, RequestInit])[1].body));
    expect(body).toMatchObject({ name: "Tariq Eltayeb", partner: "Alois", email: "" });
  });

  it("says to email the club when there is no link, and shows the server's error otherwise", async () => {
    stub({ ok: true, bookUrl: null });
    const { unmount } = render(<PayLinkForm {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "GET THE PAYMENT LINK" }));
    await waitFor(() => expect(screen.getByText(/Not open yet\./)).toBeTruthy());
    expect(screen.getByRole("link", { name: "portland@foundrypadel.com" })).toBeTruthy();
    unmount();
    stub({ error: "That email does not look right. Leave it blank if you like." }, 400);
    render(<PayLinkForm {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "GET THE PAYMENT LINK" }));
    expect((await screen.findByRole("alert")).textContent).toContain("does not look right");
  });
});
