/** @vitest-environment node */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createCallPoller } from "./callpoller.js";

const NUMBER = "+19715217887";

function blandStub(calls, details) {
  return vi.fn(async (url) => {
    if (url.includes("/v1/calls?")) {
      return { ok: true, json: async () => ({ calls }) };
    }
    const id = url.split("/v1/calls/")[1];
    return { ok: true, json: async () => details[id] };
  });
}

function call(id, extra = {}) {
  return { call_id: id, to: NUMBER, completed: true, ...extra };
}

function detail(id, transcripts, extra = {}) {
  return {
    call_id: id,
    from: "9717707851",
    call_length: 1.2,
    summary: "A summary.",
    transcripts,
    ...extra,
  };
}

let notifier, linkSender;
beforeEach(() => {
  notifier = { configured: () => true, notifyMessage: vi.fn(async () => ({ delivered: true })) };
  linkSender = { configured: () => true, sendLink: vi.fn(async () => ({ sent: true, reason: null })) };
});

function poller(calls, details, over = {}) {
  return createCallPoller({
    apiKey: "k",
    number: NUMBER,
    notifier,
    linkSender,
    cachedEvents: () => ({ events: [] }),
    fetchImpl: blandStub(calls, details),
    ...over,
  });
}

describe("a restart must not re-post yesterday's calls", () => {
  it("reports nothing on the first poll, only remembers", async () => {
    // A duplicate Slack card teaches people to ignore the channel. A missed one
    // during a deploy is noticed. Priming picks the safer failure.
    const p = poller([call("a"), call("b")], {
      a: detail("a", []), b: detail("b", []),
    });
    await p.poll();
    expect(notifier.notifyMessage).not.toHaveBeenCalled();
  });

  it("reports only what is new after priming", async () => {
    const calls = [call("a")];
    const details = { a: detail("a", []), b: detail("b", []) };
    const p = poller(calls, details);
    await p.poll();
    calls.unshift(call("b"));
    await p.poll();
    expect(notifier.notifyMessage).toHaveBeenCalledTimes(1);
    expect(notifier.notifyMessage.mock.calls[0][0].callId).toBe("b");
  });

  it("never reports the same call twice", async () => {
    const calls = [call("a")];
    const details = { a: detail("a", []), b: detail("b", []) };
    const p = poller(calls, details);
    await p.poll();
    calls.unshift(call("b"));
    await p.poll();
    await p.poll();
    expect(notifier.notifyMessage).toHaveBeenCalledTimes(1);
  });
});

describe("what it does with a finished call", () => {
  it("ignores calls to another number", async () => {
    const calls = [call("a")];
    const details = { a: detail("a", []), z: detail("z", []) };
    const p = poller(calls, details);
    await p.poll();
    calls.unshift({ call_id: "z", to: "+15550000000", completed: true });
    await p.poll();
    expect(notifier.notifyMessage).not.toHaveBeenCalled();
  });

  it("ignores a call still in progress", async () => {
    const calls = [call("a")];
    const details = { a: detail("a", []), live: detail("live", []) };
    const p = poller(calls, details);
    await p.poll();
    calls.unshift({ call_id: "live", to: NUMBER, completed: false, status: "in-progress" });
    await p.poll();
    expect(notifier.notifyMessage).not.toHaveBeenCalled();
  });

  it("sends the text the agent promised, to the number they called from", async () => {
    const calls = [call("a")];
    const details = {
      a: detail("a", []),
      b: detail("b", [
        { user: "user", text: "Can you send me that over text?" },
        { user: "assistant", text: "Sure, I'll text that over to you as soon as we hang up." },
      ]),
    };
    const p = poller(calls, details);
    await p.poll();
    calls.unshift(call("b"));
    await p.poll();
    expect(linkSender.sendLink).toHaveBeenCalledWith(
      expect.objectContaining({ phone: "+19717707851" }),
    );
    expect(notifier.notifyMessage.mock.calls[0][0].texted).toMatch(/Texted/);
  });

  it("texts nobody when no promise was made", async () => {
    const calls = [call("a")];
    const details = {
      a: detail("a", []),
      b: detail("b", [{ user: "assistant", text: "We're open seven to ten." }]),
    };
    const p = poller(calls, details);
    await p.poll();
    calls.unshift(call("b"));
    await p.poll();
    expect(linkSender.sendLink).not.toHaveBeenCalled();
    expect(notifier.notifyMessage).toHaveBeenCalledTimes(1);
  });

  it("still posts the call when the promised text fails", async () => {
    linkSender.sendLink = vi.fn(async () => ({ sent: false, reason: "cooldown" }));
    const calls = [call("a")];
    const details = {
      a: detail("a", []),
      b: detail("b", [{ user: "assistant", text: "I'll text that over." }]),
    };
    const p = poller(calls, details);
    await p.poll();
    calls.unshift(call("b"));
    await p.poll();
    expect(notifier.notifyMessage.mock.calls[0][0].texted).toMatch(/Could NOT/);
  });

  it("keeps going when one call fails to report", async () => {
    // One bad call must not stop the rest of the batch.
    notifier.notifyMessage = vi.fn(async (r) => {
      if (r.callId === "b") throw new Error("slack down");
      return { delivered: true };
    });
    const calls = [call("a")];
    const details = { a: detail("a", []), b: detail("b", []), c: detail("c", []) };
    const p = poller(calls, details);
    await p.poll();
    calls.unshift(call("b"), call("c"));
    await p.poll();
    expect(notifier.notifyMessage).toHaveBeenCalledTimes(2);
  });
});

describe("urgency, since the agent's flag never arrives", () => {
  it("pages the channel when a caller is locked out", async () => {
    const calls = [call("a")];
    const details = {
      a: detail("a", []),
      b: detail("b", [
        { user: "user", text: "I'm locked out at the front door and my court starts now" },
      ]),
    };
    const p = poller(calls, details);
    await p.poll();
    calls.unshift(call("b"));
    await p.poll();
    expect(notifier.notifyMessage.mock.calls[0][0].urgent).toBe(true);
  });

  it("leaves an ordinary enquiry unflagged", async () => {
    const calls = [call("a")];
    const details = {
      a: detail("a", []),
      b: detail("b", [{ user: "user", text: "how much is a court for 90 minutes?" }]),
    };
    const p = poller(calls, details);
    await p.poll();
    calls.unshift(call("b"));
    await p.poll();
    expect(notifier.notifyMessage.mock.calls[0][0].urgent).toBe(false);
  });

  it("marks a call that asked for a callback", async () => {
    const calls = [call("a")];
    const details = {
      a: detail("a", []),
      b: detail("b", [{ user: "user", text: "can someone call me back about memberships?" }]),
    };
    const p = poller(calls, details);
    await p.poll();
    calls.unshift(call("b"));
    await p.poll();
    expect(notifier.notifyMessage.mock.calls[0][0].needsCallback).toBe(true);
  });
});
