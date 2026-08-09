// Ask the knowledge base the questions a caller actually asks, and check it
// answers. Free: Bland does not bill knowledge queries, verified by measuring
// the account balance across ten of them. Run it on every knowledge change.
//
//   BLAND_API_KEY=… node scripts/test-knowledge.mjs
//   BLAND_API_KEY=… node scripts/test-knowledge.mjs --verbose
//
// This exists because RETRIEVAL is what fails, not content. The ceiling height
// was published, correct, and sitting in its own chunk, and the agent still told
// a caller it did not know: "How high are the ceilings?" retrieved nothing while
// "43 feet" retrieved it perfectly. Unit tests cannot catch that. Only asking
// Bland, in the caller's words, can.
//
// Exits non-zero on any failure, so it can gate a knowledge deploy.

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = path.join(__dirname, "..", "bland", "config.json");
const TESTS_PATH = path.join(__dirname, "..", "bland", "knowledge-tests.json");

const BLAND_API_KEY = process.env.BLAND_API_KEY;
const VERBOSE = process.argv.includes("--verbose");
const CONCURRENCY = 4;

async function ask(kbId, query) {
  const res = await fetch("https://api.bland.ai/v1/knowledge/chat", {
    method: "POST",
    headers: { authorization: BLAND_API_KEY, "content-type": "application/json" },
    body: JSON.stringify({ knowledge_base_id: kbId, query }),
  });
  const json = await res.json().catch(() => ({}));
  return (json?.data?.result || json?.data?.answer || "").trim();
}

/** A pass is any one of the expected tokens appearing. Deliberately loose: the
 *  answer is generated prose, so pinning exact wording would fail on a rewrite
 *  that is still correct. We are testing retrieval, not phrasing. */
function passes(answer, expect) {
  const haystack = answer.toLowerCase();
  return expect.some((token) => haystack.includes(String(token).toLowerCase()));
}

async function pool(items, size, fn) {
  const out = [];
  let i = 0;
  await Promise.all(
    Array.from({ length: size }, async () => {
      while (i < items.length) {
        const index = i++;
        out[index] = await fn(items[index]);
      }
    }),
  );
  return out;
}

async function main() {
  if (!BLAND_API_KEY) throw new Error("BLAND_API_KEY is required");
  const { knowledge_base_id: kbId } = JSON.parse(readFileSync(CONFIG_PATH, "utf8"));
  if (!kbId) throw new Error("No knowledge_base_id in bland/config.json");
  const { cases } = JSON.parse(readFileSync(TESTS_PATH, "utf8"));

  console.log(`Asking ${cases.length} caller questions of ${kbId}\n`);

  const results = await pool(cases, CONCURRENCY, async (c) => {
    const answer = await ask(kbId, c.q);
    return { ...c, answer, ok: passes(answer, c.expect) };
  });

  const failed = results.filter((r) => !r.ok);
  for (const r of results) {
    if (r.ok && !VERBOSE) continue;
    const mark = r.ok ? "PASS" : "FAIL";
    console.log(`${mark}  ${r.q}`);
    console.log(`      wanted one of: ${r.expect.join(" | ")}`);
    console.log(`      got: ${r.answer ? r.answer.slice(0, 160) : "(no answer)"}`);
    console.log();
  }

  console.log(`${results.length - failed.length}/${results.length} answered.`);
  if (failed.length) {
    console.log(
      `\n${failed.length} question(s) the agent would fluff on a real call.`,
    );
    console.log("Usually the fix is a phrasing in bland/knowledge-aliases.json,");
    console.log("not a new fact: check whether the fact is already published first.");
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("[test-knowledge]", error.message);
  process.exit(1);
});
