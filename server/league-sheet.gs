// Apps Script bound to "The Foundry League · signups" (Google Sheet, owned by
// kelly@foundrypadel.com, shared with Ryan and Monica). One caller, the site's server,
// POSTing JSON with the shared secret: {secret, row: [...]}, one body per team. Appends the
// row to the first sheet; writes the header row first if the sheet is empty. The last two
// columns (Paid, Status) are for the organisers to fill in by hand.
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

var HEADERS = ["Submitted", "Team", "Player 1", "Email 1", "Phone 1", "Texts OK",
               "Player 2", "Email 2", "Phone 2", "Level", "Rating", "Can play", "Notes",
               "Paid", "Status"];

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
    if (!Array.isArray(body.row) || body.row.length === 0) {
      return out.setContent(JSON.stringify({ ok: false, error: "no row" }));
    }
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(HEADERS);
      sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight("bold");
      sheet.setFrozenRows(1);
    }
    // Everything lands as text so a phone number keeps its leading + and a rating never
    // turns into a date.
    var row = body.row.map(function (v) { return v == null ? "" : String(v); });
    sheet.appendRow(row);
    return out.setContent(JSON.stringify({ ok: true }));
  } catch (err) {
    return out.setContent(JSON.stringify({ ok: false, error: String(err) }));
  }
}

// A browser visit to the URL says the script is alive without touching the sheet.
function doGet() {
  return ContentService.createTextOutput("Foundry League signups hook is up.");
}
