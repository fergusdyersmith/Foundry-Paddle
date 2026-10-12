/**
 * @vitest-environment node
 *
 * The Apps Script's own rules, run in node. The .gs file is plain ES5 with no imports,
 * so it is loaded into a sandbox with stand-ins for the few Google services it touches.
 * What is tested here is what the front desk relies on: which signup rows get "Waiver
 * signed", and that the script refuses a caller without the shared secret.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import path from "path";
import vm from "vm";

function loadScript({ secret = "s3cret" } = {}) {
  const src = readFileSync(path.join(__dirname, "juniors-sheet.gs"), "utf8");
  const output = { content: "", setMimeType() { return this; }, setContent(c) { this.content = c; return this; } };
  const ctx = {
    ContentService: { createTextOutput: () => output, MimeType: { JSON: "json" } },
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => (k === "SECRET" ? secret : null) }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    SpreadsheetApp: { getActiveSpreadsheet: () => ({ getSheets: () => [{ getLastRow: () => 1, appendRow() {} }] }) },
  };
  vm.createContext(ctx);
  vm.runInContext(src, ctx);
  return ctx;
}

// Columns: Submitted, Parent, Email, Phone, Texts, Child, Age, Day, Session, Notes, Status.
const row = (email, child, status = "") => ["", "", email, "", "", child, "", "", "", "", status];
const HEADER = row("Email", "Child name", "Status");

function sheetFor(rows) {
  const writes = {};
  return {
    data: [HEADER, ...rows],
    writes,
    sheet: { getRange: (r, c) => ({ setValue: (v) => { writes[r] = v; expect(c).toBe(11); } }) },
  };
}

describe("which signup rows a waiver marks", () => {
  const gs = loadScript();

  it("marks the family's own rows, by email and first name", () => {
    const s = sheetFor([row("ana@example.com", "Josie"), row("ana@example.com", "Josie"), row("bo@example.com", "Max")]);
    expect(gs.markSigned(s.sheet, s.data, "Ana@Example.com", "Josie Rivera", "10/12/26")).toBe("email");
    expect(s.writes).toEqual({ 2: "Waiver signed 10/12/26", 3: "Waiver signed 10/12/26" });
  });

  it("does not mark another family's child who shares the name", () => {
    const s = sheetFor([row("ana@example.com", "Sam Lee"), row("cy@example.com", "Sam Lee")]);
    expect(gs.markSigned(s.sheet, s.data, "ana@example.com", "Sam Lee", "10/12/26")).toBe("email");
    expect(s.writes).toEqual({ 2: "Waiver signed 10/12/26" });
  });

  it("marks by full name when one family has the child, and labels it for the desk", () => {
    const s = sheetFor([row("ana@work.example", "Josie Rivera")]);
    expect(gs.markSigned(s.sheet, s.data, "ana@home.example", "Josie Rivera", "10/12/26")).toBe("name");
    expect(s.writes[2]).toBe("Waiver signed 10/12/26 (name match, signed as ana@home.example)");
  });

  it("marks nothing when the name alone is shared by two families", () => {
    const s = sheetFor([row("ana@example.com", "Sam Lee"), row("cy@example.com", "Sam Lee")]);
    expect(gs.markSigned(s.sheet, s.data, "someone@else.example", "Sam Lee", "10/12/26")).toBeNull();
    expect(s.writes).toEqual({});
  });

  it("leaves a row already marked alone", () => {
    const s = sheetFor([row("ana@example.com", "Josie", "Waiver signed 10/1/26")]);
    expect(gs.markSigned(s.sheet, s.data, "ana@example.com", "Josie", "10/12/26")).toBe("email");
    expect(s.writes).toEqual({});
  });

  it("finds nothing for a walk-up", () => {
    const s = sheetFor([row("ana@example.com", "Josie")]);
    expect(gs.markSigned(s.sheet, s.data, "new@example.com", "Theo Park", "10/12/26")).toBeNull();
  });
});

describe("the shared secret", () => {
  const post = (gs, body) => JSON.parse(gs.doPost({ postData: { contents: JSON.stringify(body) } }).content);

  it("refuses a wrong secret", () => {
    expect(post(loadScript(), { secret: "nope", row: ["x"] })).toEqual({ ok: false, error: "bad secret" });
  });

  it("refuses everyone when the script has no SECRET set, rather than everyone being let in", () => {
    expect(post(loadScript({ secret: null }), { row: ["x"] })).toEqual({ ok: false, error: "no SECRET set" });
  });

  it("takes a row with the right secret", () => {
    expect(post(loadScript(), { secret: "s3cret", row: ["x"] })).toEqual({ ok: true });
  });
});
