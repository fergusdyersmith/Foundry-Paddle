import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ChatWidget from "./ChatWidget";

/** Server responses the widget depends on: the status probe, then the answer. */
function stubServer({ enabled = true, reply = "Courts are $40 an hour.", status = 200 } = {}) {
  const posts: Array<Record<string, unknown>> = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes("/api/chat/status")) {
        return new Response(JSON.stringify({ enabled }), { status: 200 });
      }
      posts.push(JSON.parse(String(init?.body)));
      return new Response(JSON.stringify(status === 200 ? { reply } : { error: "Nope." }), {
        status,
      });
    }),
  );
  return posts;
}

const at = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <ChatWidget />
    </MemoryRouter>,
  );

/** Open the panel once the status probe has resolved. */
async function open() {
  fireEvent.click(await screen.findByLabelText(/ask a question/i));
}

async function send(text: string) {
  fireEvent.change(screen.getByLabelText(/your question/i), { target: { value: text } });
  fireEvent.click(screen.getByLabelText("Send"));
}

beforeEach(() => sessionStorage.clear());
afterEach(() => vi.unstubAllGlobals());

it("stays out of the way until the server says the bot is available", async () => {
  stubServer({ enabled: false });
  at("/");
  await waitFor(() => expect(screen.queryByLabelText(/ask a question/i)).toBeNull());
});

it("appears once the bot is available", async () => {
  stubServer();
  at("/");
  expect(await screen.findByLabelText(/ask a question/i)).toBeInTheDocument();
});

it("never appears on the in-club TV screen", async () => {
  // /tv is projected on the wall at the club. A chat bubble on it is just clutter.
  stubServer();
  at("/tv");
  await new Promise((r) => setTimeout(r, 20));
  expect(screen.queryByLabelText(/ask a question/i)).toBeNull();
});

describe("a conversation", () => {
  it("shows the answer and sends prior turns as context", async () => {
    const posts = stubServer();
    at("/");
    await open();
    await send("what does a court cost?");

    expect(await screen.findByText(/\$40 an hour/)).toBeInTheDocument();
    expect(posts[0].message).toBe("what does a court cost?");
    expect(posts[0].history).toEqual([]);

    await send("and for 90 minutes?");
    await waitFor(() => expect(posts.length).toBe(2));
    // The follow-up only makes sense with the first exchange attached.
    expect(posts[1].history).toEqual([
      { role: "user", content: "what does a court cost?" },
      { role: "assistant", content: "Courts are $40 an hour." },
    ]);
  });

  it("renders a reply as text, never as markup", async () => {
    // The reply is model output. If it ever reached the DOM as HTML, one poisoned knowledge
    // row would be a stored XSS on the club's marketing site.
    stubServer({ reply: '<img src=x onerror="alert(1)">hello' });
    const { container } = at("/");
    await open();
    await send("hi");

    expect(await screen.findByText(/hello/)).toBeInTheDocument();
    expect(container.querySelector("img")).toBeNull();
  });

  it("shows the server's own message when it refuses", async () => {
    stubServer({ status: 429 });
    at("/");
    await open();
    await send("hi");
    expect(await screen.findByText("Nope.")).toBeInTheDocument();
  });

  it("tells visitors not to type anything private", async () => {
    stubServer();
    at("/");
    await open();
    expect(screen.getByText(/do not type anything private/i)).toBeInTheDocument();
  });
});
