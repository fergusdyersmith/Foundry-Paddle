/** @vitest-environment node */
import { describe, it, expect, vi } from "vitest";
import {
  createNotifier,
  buildSlackMessage,
  escapeSlack,
  sanitize,
  normalizePhone,
} from "./notify.js";

const RECORD = {
  name: "Dana Whitfield",
  phone: "+15412704585",
  reason: "Wants to book a court for four on Saturday morning",
  urgent: false,
  callId: "call_123",
  receivedAt: "2026-08-08T23:40:00.000Z",
};

function okFetch() {
  return vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ ok: true }) }));
}

const BOT = { botToken: "xoxb-test", channel: "#front-desk" };

describe("a caller cannot use their own words as Slack markup", () => {
  it("escapes the characters Slack treats as markup", () => {
    expect(escapeSlack("a & b < c > d")).toBe("a &amp; b &lt; c &gt; d");
  });

  it("stops a caller paging the whole channel by saying their name is <!channel>", () => {
    const msg = buildSlackMessage({ ...RECORD, name: "<!channel>" });
    const json = JSON.stringify(msg);
    // Escaped, so Slack renders it as text rather than firing a notification.
    expect(json).not.toMatch(/<!channel>/);
    expect(json).toMatch(/&lt;!channel&gt;/);
  });

  it("strips zero-width and bidi characters hidden in what the caller said", () => {
    expect(sanitize("book​a ‮court")).toBe("book a court");
  });

  it("caps a rambling message rather than posting a wall of text", () => {
    expect(sanitize("x".repeat(900), 500)).toHaveLength(500);
  });
});

describe("the phone number has to be dialable", () => {
  it.each([
    ["+1 541 270 4585", "+15412704585"],
    ["15412704585", "+15412704585"],
    ["+44 20 7946 0958", "+442079460958"],
  ])("normalizes %s", (input, expected) => {
    expect(normalizePhone(input)).toBe(expected);
  });

  it.each([["(541) 270-4585"], ["541 270 4585"], ["5412704585"]])(
    "adds the country code to the bare 10 digits in %s",
    (input) => {
    // Speech-to-text hands us bare digits constantly, and a tel: link with no
    // country code does not dial.
      expect(normalizePhone(input)).toBe("+15412704585");
    },
  );

  it.each([
    ["not a number"],
    ["12"],
    [""],
    [null],
    ["5412704"],
    ["2345678901234"],
    // Half transcribed as words: only 7 digits survive, so the agent must ask
    // again rather than post a number that is missing its area code.
    ["five four one, 270 4585"],
  ])(
    "refuses %s rather than posting an undialable link",
    (input) => {
      expect(normalizePhone(input)).toBeNull();
    },
  );
});

describe("the Slack message", () => {
  it("makes the number tappable to call back", () => {
    const msg = buildSlackMessage(RECORD);
    expect(JSON.stringify(msg)).toMatch(/<tel:\+15412704585\|\+15412704585>/);
  });

  it("carries the useful part in the notification banner, not just the blocks", () => {
    // The banner is all most people read before deciding to open Slack.
    expect(buildSlackMessage(RECORD).text).toContain("Dana Whitfield");
    expect(buildSlackMessage(RECORD).text).toContain("Saturday morning");
  });

  it("marks an urgent message differently from a routine one", () => {
    expect(buildSlackMessage({ ...RECORD, urgent: true }).text).toMatch(/^URGENT: /);
    expect(buildSlackMessage(RECORD).text).not.toMatch(/URGENT/);
  });

  it("still posts something usable when the caller left no name", () => {
    const msg = buildSlackMessage({ ...RECORD, name: "" });
    expect(msg.text).toContain("Someone");
  });
});

describe("delivery decides what the agent says next", () => {
  it("reports delivered when Slack accepts it", async () => {
    const fetchImpl = okFetch();
    const notifier = createNotifier({ ...BOT, fetchImpl });
    await expect(notifier.notifyMessage(RECORD)).resolves.toEqual({
      delivered: true,
      channel: "slack",
    });
    expect(fetchImpl).toHaveBeenCalledOnce();
  });

  it("posts to chat.postMessage with the bot token and channel", async () => {
    const fetchImpl = okFetch();
    await createNotifier({ ...BOT, fetchImpl }).notifyMessage(RECORD);
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe("https://slack.com/api/chat.postMessage");
    expect(init.headers.authorization).toBe("Bearer xoxb-test");
    expect(JSON.parse(init.body).channel).toBe("#front-desk");
  });

  it("treats {ok:false} on an HTTP 200 as a failure", async () => {
    // The Slack Web API answers 200 with an error body. Trusting the status
    // code alone would report every failure as a success and let the agent
    // promise a callback that never happens.
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ ok: false, error: "not_in_channel" }),
    }));
    const notifier = createNotifier({ ...BOT, fetchImpl });
    expect((await notifier.notifyMessage(RECORD)).delivered).toBe(false);
  });

  it("pings the channel for an urgent message only", async () => {
    // @channel is what still reaches someone whose notifications are set to
    // mentions only, which is Slack's default.
    const fetchImpl = okFetch();
    const notifier = createNotifier({ ...BOT, fetchImpl });
    await notifier.notifyMessage({ ...RECORD, urgent: true });
    expect(JSON.parse(fetchImpl.mock.calls[0][1].body).text).toMatch(/^<!channel> /);

    fetchImpl.mockClear();
    await notifier.notifyMessage(RECORD);
    expect(JSON.parse(fetchImpl.mock.calls[0][1].body).text).not.toMatch(/<!channel>/);
  });

  it("falls back to a webhook when there is no bot token", async () => {
    const fetchImpl = okFetch();
    const notifier = createNotifier({
      botToken: undefined,
      webhookUrl: "https://hooks.slack.test/x",
      fetchImpl,
    });
    expect((await notifier.notifyMessage(RECORD)).delivered).toBe(true);
    expect(fetchImpl.mock.calls[0][0]).toBe("https://hooks.slack.test/x");
  });

  it("reports NOT delivered when Slack rejects it", async () => {
    const fetchImpl = vi.fn(async () => ({ ok: false, status: 404, json: async () => ({}) }));
    const notifier = createNotifier({ ...BOT, fetchImpl });
    const result = await notifier.notifyMessage(RECORD);
    expect(result.delivered).toBe(false);
  });

  it("reports NOT delivered when Slack times out, rather than hanging the call", async () => {
    const fetchImpl = vi.fn(
      (url, init) =>
        new Promise((_, reject) => {
          init.signal.addEventListener("abort", () => reject(new Error("aborted")));
        }),
    );
    const notifier = createNotifier({ ...BOT, fetchImpl, timeoutMs: 20 });
    const result = await notifier.notifyMessage(RECORD);
    expect(result.delivered).toBe(false);
  });

  it("records the message to the log BEFORE attempting delivery", async () => {
    // The log is the durable half. A notifier being down must never lose a
    // caller's callback request.
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    const notifier = createNotifier({
      ...BOT,
      fetchImpl: vi.fn(async () => ({ ok: false, status: 500, json: async () => ({}) })),
    });
    await notifier.notifyMessage(RECORD);

    const logged = log.mock.calls.find((c) => c[0] === "[message] %s");
    expect(logged).toBeDefined();
    expect(JSON.parse(logged[1])).toMatchObject({
      name: "Dana Whitfield",
      phone: "+15412704585",
      call_id: "call_123",
    });
    vi.restoreAllMocks();
  });

  it("is unconfigured, not silently open, when no webhook is set", () => {
    expect(createNotifier({ botToken: undefined, webhookUrl: undefined }).configured()).toBe(false);
  });
});

describe("a message taken on the way to a human", () => {
  it("is labelled as a transfer, not a callback request", async () => {
    // A failed transfer cannot return to the agent, so the caller lands in
    // someone's personal voicemail. The message taken beforehand is then the
    // only record the call happened, and staff need to know which it is.
    const msg = buildSlackMessage({ ...RECORD, transferring: true });
    expect(JSON.stringify(msg)).toMatch(/being put through/i);
    expect(msg.text).toMatch(/^Transferring: /);
  });

  it("says it may already be handled, so nobody calls back twice", () => {
    const msg = buildSlackMessage({ ...RECORD, transferring: true });
    expect(JSON.stringify(msg)).toMatch(/may already be handled/i);
  });

  it("still reads as a normal message when no transfer is happening", () => {
    const msg = buildSlackMessage(RECORD);
    expect(msg.text).not.toMatch(/Transferring/);
    expect(JSON.stringify(msg)).not.toMatch(/already be handled/i);
  });

  it("urgent still outranks transferring in the banner", () => {
    const msg = buildSlackMessage({ ...RECORD, urgent: true, transferring: true });
    expect(msg.text).toMatch(/^URGENT: /);
  });
});
