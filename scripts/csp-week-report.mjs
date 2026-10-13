#!/usr/bin/env node
// What the report-only Content-Security-Policy would have blocked, across every Railway
// deployment since a date. The question it answers: is it safe to change the header in
// server.js from Content-Security-Policy-Report-Only to Content-Security-Policy?
//
//   node scripts/csp-week-report.mjs [--since 2026-10-12] [--service foundry-court-welcome]
//
// --since defaults to 7 days ago. Needs the Railway CLI logged in to the foundry-padel
// project; it runs from any directory. Each distinct violation is logged once per running
// deployment (server/csp.js dedupes in memory), so the counts are "deployments it showed
// up in", not page views. Prints plain text.

import { execFileSync } from "node:child_process";

const arg = (name) => {
  const i = process.argv.indexOf(name);
  return i > 0 ? process.argv[i + 1] : undefined;
};
const since = arg("--since") || new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10);
// The foundry-padel project and its production website service, named rather than taken
// from the directory link, which `railway add` and friends quietly change.
const target = [
  "--project", "2bc04856-bbe8-411a-b033-ee7fe7f3605d",
  "--service", arg("--service") || "foundry-court-welcome",
  "--environment", "production",
];

const railway = (args) =>
  execFileSync("railway", args, { encoding: "utf8", timeout: 120_000, maxBuffer: 64 << 20 });

// Things that would be blocked but that the site does not need, so enforcing is fine.
const KNOWN = [
  [/browser\.sentry-cdn\.com/, "Wistia's own error tracker, left out on purpose"],
  [/connect\.facebook\.net\/.*pcm\.js/, "Facebook/Instagram in-app browser injecting its own script"],
  [/^(chrome|moz|safari|safari-web)-extension:/, "a visitor's browser extension"],
];

// Every deployment that served traffic since the date: those created after it, plus the
// one that was already live when it began.
const all = JSON.parse(railway(["deployment", "list", "--json", "--limit", "200", ...target]))
  .filter((d) => d.meta?.buildOnly !== true)
  .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
const firstAfter = all.findIndex((d) => d.createdAt >= since);
const deploys = firstAfter < 0 ? all.slice(-1) : all.slice(Math.max(0, firstAfter - 1));

const seen = new Map(); // "directive blocked" -> { directive, blocked, pages:Set, deploys:Set, first, last }
let unreadable = 0;
for (const d of deploys) {
  let out;
  try {
    out = railway(["logs", d.id, "--json", "-n", "5000", "-f", "csp", ...target]);
  } catch {
    unreadable++;
    continue;
  }
  for (const line of out.split("\n")) {
    if (!line.trim()) continue;
    let rec;
    try {
      rec = JSON.parse(line);
    } catch {
      continue;
    }
    const m = /^\[csp\] would block (\S+): (.*) on (\S*)$/.exec(rec.message || "");
    if (!m) continue;
    const [, directive, rawBlocked, page] = m;
    const blocked = rawBlocked.replace(/[?#].*$/, ""); // older deploys logged query strings

    const key = `${directive} ${blocked}`;
    const v = seen.get(key) || { directive, blocked, pages: new Set(), deploys: new Set(), first: rec.timestamp, last: rec.timestamp };
    v.pages.add(page);
    v.deploys.add(d.id);
    if (rec.timestamp < v.first) v.first = rec.timestamp;
    if (rec.timestamp > v.last) v.last = rec.timestamp;
    seen.set(key, v);
  }
}

// A report from an older deploy may be about something the policy has since allowed.
// Read the live header and say so, rather than flag what is already fixed.
const livePolicy = await fetch("https://www.foundrypadel.com/", { signal: AbortSignal.timeout(15_000) })
  .then((r) => r.headers.get("content-security-policy-report-only") || r.headers.get("content-security-policy") || "")
  .catch(() => "");
const policy = Object.fromEntries(
  livePolicy.split(";").map((d) => d.trim().split(/\s+/)).filter((p) => p[0]).map(([name, ...srcs]) => [name, srcs]),
);
function nowAllowed(directive, blocked) {
  const srcs = policy[directive] || policy[directive.replace(/-(elem|attr)$/, "")] || policy["default-src"];
  if (!srcs) return false;
  if (blocked === "wasm-eval") return srcs.includes("'wasm-unsafe-eval'");
  let url;
  try {
    url = new URL(blocked);
  } catch {
    return false;
  }
  return srcs.some((s) => {
    if (s === "'self'") return url.hostname === "www.foundrypadel.com" || url.hostname === "foundrypadel.com";
    const m = /^(https?:)\/\/(\*\.)?([^/]+)/.exec(s);
    if (!m || m[1] !== url.protocol) return false;
    return m[2] ? url.hostname.endsWith(`.${m[3]}`) : url.hostname === m[3];
  });
}

const day = (ts) => String(ts).slice(5, 10);
const describe = (v) =>
  `${v.directive}: ${v.blocked}\n    on ${[...v.pages].slice(0, 5).join(", ")}; ${v.deploys.size} of ${deploys.length} deploys; ${day(v.first)} to ${day(v.last)}`;
const known = [];
const unknown = [];
for (const v of seen.values()) {
  const why = nowAllowed(v.directive, v.blocked)
    ? "now allowed by the live policy"
    : KNOWN.find(([re]) => re.test(v.blocked))?.[1];
  (why ? known : unknown).push(why ? `${describe(v)}\n    (${why})` : describe(v));
}
if (!livePolicy) unknown.push("(could not read the live policy header; check www.foundrypadel.com is up)");

const lines = [`Foundry CSP report since ${since}: ${deploys.length} deployments checked.`];
if (unreadable) lines.push(`WARNING: could not read the logs of ${unreadable} of them.`);
lines.push(
  unknown.length
    ? `${unknown.length} kind(s) of report to look at before enforcing:`
    : "Nothing unexplained. Safe to switch the header to enforcing.",
);
for (const u of unknown) lines.push(`- ${u}`);
if (known.length) {
  lines.push(`Explained (${known.length}):`);
  for (const k of known) lines.push(`- ${k}`);
}
console.log(lines.join("\n"));
