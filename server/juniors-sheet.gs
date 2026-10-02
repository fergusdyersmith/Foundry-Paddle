// Apps Script bound to "Junior Clinic signups" (Google Sheet, owned by kelly@foundrypadel.com,
// shared with monica@). One caller: the site's server, one body per child signed up,
// POSTing JSON with the shared secret: {secret, row: [...]}. Appends the row; writes the
// header row first if the sheet is empty. Nothing else reads or writes the sheet.
//
// Install (same two minutes as server/open-sheet.gs):
//   1. Open the sheet > Extensions > Apps Script. Replace the editor's contents with this file.
//   2. Project Settings (the cog) > Script Properties > add SECRET = a long random string.
//   3. Deploy > New deployment > type "Web app": Execute as "Me", Who has access "Anyone".
//      Authorize when asked. Copy the Web app URL (ends in /exec).
//   4. On Railway, set JUNIORS_SHEET_WEBHOOK = that URL and JUNIORS_SHEET_SECRET = the string.
// Re-deploying after an edit: Deploy > Manage deployments > edit > Version: New. The URL
// stays the same.

var HEADERS = ["Submitted", "Parent name", "Email", "Phone", "Texts OK", "Child name", "Child age",
               "Day", "Session", "Notes", "Status"];

function doPost(e) {
  var out = ContentService.createTextOutput().setMimeType(ContentService.MimeType.JSON);
  try {
    var body = JSON.parse(e.postData.contents || "{}");
    var secret = PropertiesService.getScriptProperties().getProperty("SECRET") || "";
    if (secret && body.secret !== secret) {
      return out.setContent(JSON.stringify({ ok: false, error: "bad secret" }));
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
    // Everything lands as text so a phone number keeps its leading + and an age never
    // turns into a date.
    var row = body.row.map(function (v) { return v == null ? "" : String(v); });
    sheet.appendRow(row);
    return out.setContent(JSON.stringify({ ok: true }));
  } catch (err) {
    return out.setContent(JSON.stringify({ ok: false, error: String(err) }));
  }
}

// So the web app also answers a browser GET with something readable.
function doGet() {
  return ContentService.createTextOutput("Junior Clinic signups hook: POST only.");
}
