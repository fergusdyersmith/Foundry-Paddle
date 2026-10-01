// Apps Script bound to "The Foundry Open · registrations" (Google Sheet).
// Two callers, both POSTing JSON with the shared secret:
//   1. The site's server, one body per registration: {secret, row: [...]}. Appends the row.
//   2. Kumi's paid sync (padelclublist/scripts/open_paid_sync.py), every 15 minutes:
//      {secret, action: "paid", complete: true, paid: [{name, email, phone, level, seen}]}.
//      Marks the matching row PAID (column L) and writes the Playtomic level (column M); a
//      player who paid without ever filling in the form gets a row of their own. When the
//      list is complete (the sync read the whole tournament), a row marked PAID whose
//      player is no longer registered becomes CANCELLED; register again and it is PAID
//      again. Without `complete` nothing is ever cancelled, so a partial read cannot
//      cancel the whole sheet.
// Nothing else reads or writes the sheet.
//
// Install (once, about two minutes):
//   1. Open the sheet > Extensions > Apps Script. Replace the editor's contents with this file.
//   2. Project Settings (the cog) > Script Properties > add SECRET = a long random string.
//   3. Deploy > New deployment > type "Web app": Execute as "Me", Who has access "Anyone".
//      Authorize when asked. Copy the Web app URL (ends in /exec).
//   4. On Railway, set OPEN_SHEET_WEBHOOK = that URL and OPEN_SHEET_SECRET = the same string;
//      the same two go in Kumi's .env.service for the paid sync.
// Re-deploying after an edit: Deploy > Manage deployments > edit > Version: New. The URL
// stays the same.

var COL = { name: 1, playtomicEmail: 5, email: 6, paid: 11, level: 12 }; // 0-based

function doPost(e) {
  var out = ContentService.createTextOutput().setMimeType(ContentService.MimeType.JSON);
  try {
    var body = JSON.parse(e.postData.contents || "{}");
    var secret = PropertiesService.getScriptProperties().getProperty("SECRET") || "";
    if (secret && body.secret !== secret) {
      return out.setContent(JSON.stringify({ ok: false, error: "bad secret" }));
    }
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
    if (body.action === "paid") {
      return out.setContent(JSON.stringify(markPaid(sheet, body.paid, body.complete === true)));
    }
    if (!Array.isArray(body.row) || body.row.length === 0) {
      return out.setContent(JSON.stringify({ ok: false, error: "no row" }));
    }
    // Everything lands as text so a phone number keeps its leading + and a shirt size
    // never turns into a date.
    var row = body.row.map(function (v) { return v == null ? "" : String(v); });
    sheet.appendRow(row);
    return out.setContent(JSON.stringify({ ok: true }));
  } catch (err) {
    return out.setContent(JSON.stringify({ ok: false, error: String(err) }));
  }
}

function norm(v) { return String(v == null ? "" : v).trim().toLowerCase(); }

// Match each paid player to a form row by Playtomic email, then email, then name.
function markPaid(sheet, paid, complete) {
  if (!Array.isArray(paid)) return { ok: false, error: "no paid list" };
  if (norm(sheet.getRange(1, COL.level + 1).getValue()) === "") {
    sheet.getRange(1, COL.level + 1).setValue("Playtomic level").setFontWeight("bold");
  }
  var data = sheet.getDataRange().getValues();
  var marked = 0, appended = 0, already = 0, cancelled = 0;
  var matched = {};
  paid.forEach(function (p) {
    var em = norm(p.email), nm = norm(p.name), idx = -1;
    for (var i = 1; i < data.length && idx < 0; i++) {
      var r = data[i];
      if (em && (norm(r[COL.playtomicEmail]) === em || norm(r[COL.email]) === em)) idx = i;
      else if (nm && norm(r[COL.name]) === nm) idx = i;
    }
    var level = p.level == null ? "" : String(p.level);
    if (idx >= 0) {
      matched[idx] = true;
      if (norm(data[idx][COL.paid]).indexOf("paid") === 0) { already++; }
      else { sheet.getRange(idx + 1, COL.paid + 1).setValue("PAID"); marked++; }
      if (level && norm(data[idx][COL.level]) !== level) sheet.getRange(idx + 1, COL.level + 1).setValue(level);
    } else {
      var row = [p.seen || "", p.name || "", "", "", "", p.email || "", "", p.phone || "",
                 "(no form)", "", "Paid on Playtomic without the site form", "PAID", level];
      sheet.appendRow(row); data.push(row); matched[data.length - 1] = true; appended++;
    }
  });
  if (complete) {
    for (var j = 1; j < data.length; j++) {
      if (!matched[j] && norm(data[j][COL.paid]).indexOf("paid") === 0) {
        sheet.getRange(j + 1, COL.paid + 1).setValue("CANCELLED"); cancelled++;
      }
    }
  }
  return { ok: true, marked: marked, appended: appended, already: already, cancelled: cancelled };
}

// A browser visit to the URL says the script is alive without touching the sheet.
function doGet() {
  return ContentService.createTextOutput("Foundry Open registrations hook is up.");
}
