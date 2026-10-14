/**
 * @vitest-environment node
 *
 * The phone receptionist's knowledge, kept in step with the club's published facts
 * (Kelly, 2026-10-14). Each test names what would go wrong if it were removed: a sync every
 * hour for nothing, an agent left on a deleted base, or a failure nobody hears about.
 */
import { describe, expect, it } from "vitest";
import { createBlandAutoSync, encryptedKey } from "./blandAutoSync.js";

const CONFIG = {
  persona_id: "p1",
  knowledge_base_id: "stale-in-git",
  twilio_ai_routing: { voice_url: "https://api.bland.ai/twilio?encrypted_key=ek-123&x=1" },
};
const OLD = "11111111-1111-1111-1111-111111111111";
const NEW = "22222222-2222-2222-2222-222222222222";

function harness({ liveDescription = "Synced 2026-10-14 sha:aaaa", push, deploy } = {}) {
  const calls = [];
  const notes = [];
  const sync = createBlandAutoSync({
    apiKey: "k",
    loadKnowledge: async () => ({ all: [{ topic: "League", answer: "Nov 2" }] }),
    docHash: () => "bbbb",
    readConfig: () => CONFIG,
    bland: async (p, o = {}) => {
      calls.push(`${o.method || "GET"} ${p}`);
      if (p === "/v1/personas/p1") return { status: 200, json: { data: { current_production_version: { kb_ids: [OLD] } } } };
      if (p === `/v1/knowledge/${OLD}` && !o.method) return { status: 200, json: { data: { description: liveDescription } } };
      return { status: 200, json: {} };
    },
    run: async (script, args, extra) => {
      calls.push(["run", script, ...args, extra?.BLAND_ENCRYPTED_KEY ? "+key" : ""].filter(Boolean).join(" "));
      if (script.includes("sync-bland-kb")) return push || { code: 0, out: `[kb] created ${NEW} (100 chars)\n` };
      return deploy || { code: 0, out: "[agent] verified: knowledge base and tools are live on the number\n" };
    },
    notify: async (t) => { notes.push(t); },
    log: () => {},
    hours: [1, 5],
    hourNow: () => 3,
  });
  return { sync, calls, notes };
}

describe("the phone agent's knowledge sync", () => {
  it("does nothing when the live base was built from these facts", async () => {
    const { sync, calls } = harness({ liveDescription: "Synced 2026-10-14 sha:bbbb" });
    expect(await sync.runOnce()).toEqual({ changed: false, base: OLD });
    expect(calls.some((c) => c.startsWith("run"))).toBe(false);
  });

  it("builds a new base, moves the agent onto it, and only then deletes the old one", async () => {
    const { sync, calls, notes } = harness();
    expect(await sync.runOnce()).toEqual({ changed: true, created: NEW, previous: OLD });
    const order = calls.filter((c) => c.startsWith("run") || c.startsWith("DELETE"));
    expect(order).toEqual([
      "run scripts/sync-bland-kb.mjs --push --keep-previous",
      "run scripts/deploy-bland-agent.mjs +key",
      `DELETE /v1/knowledge/${OLD}`,
    ]);
    // The live id comes from Bland, not the id committed to git.
    expect(calls).not.toContain("DELETE /v1/knowledge/stale-in-git");
    expect(notes).toEqual([]);
  });

  it("an agent deploy that does not verify keeps the old base and says so", async () => {
    const { sync, calls, notes } = harness({ deploy: { code: 1, out: "[agent] MISCONFIGURED: x\n" } });
    const out = await sync.runOnce();
    expect(out.error).toMatch(/did not verify/);
    expect(calls.some((c) => c.startsWith("DELETE"))).toBe(false);
    expect(notes[0]).toMatch(/phone receptionist's knowledge did not sync/);
  });

  it("a failed upload never reaches the agent deploy", async () => {
    const { sync, calls, notes } = harness({ push: { code: 1, out: "[kb] Bland rejected the knowledge base (500)\n" } });
    expect((await sync.runOnce()).error).toMatch(/was not created/);
    expect(calls.some((c) => c.includes("deploy-bland-agent"))).toBe(false);
    expect(notes).toHaveLength(1);
  });

  it("two runs at once do not both sync", async () => {
    const { sync } = harness();
    const [a, b] = await Promise.all([sync.runOnce(), sync.runOnce()]);
    expect([a, b].filter((r) => r.skipped === "busy")).toHaveLength(1);
  });

  it("finds the deploy key in the number's voice URL", () => {
    expect(encryptedKey(CONFIG)).toBe("ek-123");
    expect(encryptedKey({})).toBe("");
  });
});

describe("only overnight", () => {
  it("leaves the agent alone in the daytime, unless asked", async () => {
    const calls = [];
    const sync = createBlandAutoSync({
      apiKey: "k", hours: [1, 5], hourNow: () => 14, log: () => {},
      loadKnowledge: async () => { calls.push("load"); return { all: [] }; },
      docHash: () => "x", readConfig: () => ({}), bland: async () => ({ status: 200, json: {} }),
      run: async () => ({ code: 0, out: "" }), notify: async () => {},
    });
    expect(await sync.runOnce()).toEqual({ skipped: "daytime" });
    expect(calls).toEqual([]);
    await sync.runOnce({ force: true });
    expect(calls).toEqual(["load"]);
  });

  it("reads the window and the club's hour", async () => {
    const { syncHours, localHour } = await import("./blandAutoSync.js");
    expect(syncHours("2-6")).toEqual([2, 6]);
    expect(syncHours("nonsense")).toEqual([1, 5]);
    expect(localHour(new Date("2026-10-15T10:30:00Z"), "America/Los_Angeles")).toBe(3);
  });
});

describe("the knowledge fingerprint", () => {
  it("ignores the date in the document's header, so a new day is not a change", async () => {
    const { docHash } = await import("../scripts/sync-bland-kb.mjs");
    const facts = [{ topic: "League", answer: "Nov 2 to Dec 13" }];
    expect(docHash(facts)).toBe(docHash(facts));
    expect(docHash(facts)).not.toBe(docHash([{ topic: "League", answer: "Nov 9 to Dec 13" }]));
  });

  it("is stamped on every base the sync creates", async () => {
    const { readFileSync } = await import("fs");
    const src = readFileSync(new URL("../scripts/sync-bland-kb.mjs", import.meta.url), "utf8");
    expect(src).toContain("description: `Synced ${today} ${HASH_TAG}${docHash(all)}`");
  });
});
