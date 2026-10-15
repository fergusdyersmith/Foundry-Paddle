// Apps Script bound to "The Foundry League · signups" (Google Sheet, owned by
// kelly@foundrypadel.com, shared with Ryan and Monica). One caller, the site's server,
// POSTing JSON with the shared secret. Two jobs:
//   1. A signup: {secret, row: [...]}, one body per team. Appends the row to the first
//      sheet; writes the header row first if the sheet is empty. The last two columns
//      (Paid, Status) are for the organisers to fill in by hand.
//   2. A score: {secret, action: "score", row: [...]}, one body per match, from the
//      /league/score form. Appends to the "Scores" tab (created with its header on first
//      use). Ryan keeps the table from it.
//   3. A payment: {secret, action: "paid", email, name, amount, paidAt, paymentId}, from
//      the Kumi box when Square reports a league entry paid (app/services/league_paid.py
//      there). Finds the team by Email 1 or Email 2, else by Player 1 or Player 2 name,
//      and stamps the Paid column ("P1 paid 10/15"). The payment id is kept in the cell
//      so a repeated Square delivery changes nothing. Answers {matched, team, player, both}.
// Nothing else reads or writes the sheet.
//
// Install (once, about two minutes; the same as server/open-sheet.gs):
//   1. Open the sheet > Extensions > Apps Script. Replace the editor's contents with this file.
//   2. Project Settings (the cog) > Script Properties > add SECRET = a long random string.
//   3. Deploy > New deployment > type "Web app": Execute as "Me", Who has access "Anyone".
//      Authorize when asked. Copy the Web app URL (ends in /exec).
//   4. On Railway, set LEAGUE_SHEET_WEBHOOK = that URL and LEAGUE_SHEET_SECRET = the same string.
// Re-deploying after an edit: Deploy > Manage deployments > edit > Version: New. The URL
// stays the same.

var HEADERS = ["Submitted", "League", "Team", "Player 1", "Email 1", "Phone 1", "Texts OK",
               "Player 2", "Email 2", "Phone 2", "Level", "Rating", "Can play", "Notes",
               "Paid", "Status"];
var SCORES_TAB = "Scores";
var SCORE_HEADERS = ["Submitted", "Week", "Team", "Opponent", "Set 1", "Set 2", "Set 3",
                     "Sets won", "Sets lost", "Reported by", "Email", "Notes", "Checked"];

function tab(ss, name, headers) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold");
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function doPost(e) {
  var out = ContentService.createTextOutput().setMimeType(ContentService.MimeType.JSON);
  try {
    var body = JSON.parse(e.postData.contents || "{}");
    var secret = PropertiesService.getScriptProperties().getProperty("SECRET") || "";
    // Fails closed: a copy installed without the SECRET property refuses everyone,
    // rather than taking any POST from anyone who finds the /exec URL.
    if (!secret || body.secret !== secret) {
      return out.setContent(JSON.stringify({ ok: false, error: secret ? "bad secret" : "no SECRET set" }));
    }
    if (body.action !== "paid" && (!Array.isArray(body.row) || body.row.length === 0)) {
      return out.setContent(JSON.stringify({ ok: false, error: "no row" }));
    }
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    // Everything lands as text so a phone number keeps its leading + and a set score like
    // 6-4 never turns into a date.
    var row = (body.row || []).map(function (v) { return v == null ? "" : String(v); });
    if (body.action === "score") {
      tab(ss, SCORES_TAB, SCORE_HEADERS).appendRow(row);
      return out.setContent(JSON.stringify({ ok: true }));
    }
    if (body.action === "paid") {
      return out.setContent(JSON.stringify(markPaid(ss, body)));
    }
    var sheet = ss.getSheets()[0];
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(HEADERS);
      sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight("bold");
      sheet.setFrozenRows(1);
    }
    sheet.appendRow(row);
    return out.setContent(JSON.stringify({ ok: true }));
  } catch (err) {
    return out.setContent(JSON.stringify({ ok: false, error: String(err) }));
  }
}

function normEmail(v) { return String(v || "").trim().toLowerCase(); }
function normName(v) { return String(v || "").trim().toLowerCase().replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " "); }

// Stamp the Paid column of the team that a Square payment belongs to. Matched by email
// first (the form's Email 1 / Email 2), then by the cardholder name against Player 1 /
// Player 2, since a partner's email is optional on the form and a payer's card may be
// under a different address.
function markPaid(ss, body) {
  var sheet = ss.getSheets()[0];
  var last = sheet.getLastRow();
  if (last < 2) return { ok: true, matched: false };
  var TEAM = 2, P1 = 3, E1 = 4, P2 = 7, E2 = 8, PAID = 14;   // 0-based column indexes in HEADERS
  var vals = sheet.getRange(2, 1, last - 1, HEADERS.length).getValues();
  var email = normEmail(body.email), name = normName(body.name);
  var hit = -1, which = 0;
  if (email) {
    for (var i = 0; i < vals.length && hit < 0; i++) {
      if (normEmail(vals[i][E1]) === email) { hit = i; which = 1; }
      else if (normEmail(vals[i][E2]) === email) { hit = i; which = 2; }
    }
  }
  if (hit < 0 && name) {
    for (var j = 0; j < vals.length && hit < 0; j++) {
      if (normName(vals[j][P1]) === name) { hit = j; which = 1; }
      else if (normName(vals[j][P2]) === name) { hit = j; which = 2; }
    }
  }
  if (hit < 0) return { ok: true, matched: false };
  var cell = sheet.getRange(hit + 2, PAID + 1);
  var cur = String(cell.getValue() || "");
  var pid = String(body.paymentId || "");
  var team = String(vals[hit][TEAM] || "") || (String(vals[hit][P1] || "") + " and " + String(vals[hit][P2] || "")).replace(/ and $/, "");
  if (pid && cur.indexOf(pid) >= 0) return { ok: true, matched: true, already: true, team: team, player: which };
  var when = Utilities.formatDate(body.paidAt ? new Date(body.paidAt) : new Date(), "America/Los_Angeles", "M/d");
  var stamp = "P" + which + " paid " + when + (pid ? " [" + pid + "]" : "");
  cell.setValue(cur ? cur + "; " + stamp : stamp);
  var other = "P" + (which === 1 ? 2 : 1) + " paid";
  return { ok: true, matched: true, team: team, player: which, name: String(vals[hit][which === 1 ? P1 : P2] || ""), both: cur.indexOf(other) >= 0 };
}

// A browser visit to the URL says the script is alive without touching the sheet.
function doGet() {
  return ContentService.createTextOutput("Foundry League signups hook is up.");
}
