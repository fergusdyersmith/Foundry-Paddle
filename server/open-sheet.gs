// Apps Script bound to "The Foundry Open · registrations" (Google Sheet).
// The site's server POSTs one JSON body per registration: {secret, row: [...]}.
// This appends the row to the first sheet. Nothing else reads or writes the sheet.
//
// Install (once, about two minutes):
//   1. Open the sheet > Extensions > Apps Script. Replace the editor's contents with this file.
//   2. Project Settings (the cog) > Script Properties > add SECRET = a long random string.
//   3. Deploy > New deployment > type "Web app": Execute as "Me", Who has access "Anyone".
//      Authorize when asked. Copy the Web app URL (ends in /exec).
//   4. On Railway, set OPEN_SHEET_WEBHOOK = that URL and OPEN_SHEET_SECRET = the same string.
// Re-deploying after an edit: Deploy > Manage deployments > edit > Version: New. The URL
// stays the same.

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
    // Everything lands as text so a phone number keeps its leading + and a shirt size
    // never turns into a date.
    var row = body.row.map(function (v) { return v == null ? "" : String(v); });
    sheet.appendRow(row);
    return out.setContent(JSON.stringify({ ok: true }));
  } catch (err) {
    return out.setContent(JSON.stringify({ ok: false, error: String(err) }));
  }
}

// A browser visit to the URL says the script is alive without touching the sheet.
function doGet() {
  return ContentService.createTextOutput("Foundry Open registrations hook is up.");
}
