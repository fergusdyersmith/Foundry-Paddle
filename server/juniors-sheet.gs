// Apps Script bound to "Junior Clinic signups" (Google Sheet, owned by kelly@foundrypadel.com,
// shared with monica@). One caller, the site's server, POSTing JSON with the shared secret.
// Two jobs:
//   1. A signup: {secret, row: [...]}, one body per child. Appends the row to the first
//      sheet; writes the header row first if the sheet is empty.
//   2. A signed waiver: {secret, action: "waiver", parent, emergency, pickup, children: [{name,
//      dob, age, media, ..., filename, html}], stamp}. For each child: turns the HTML the
//      server laid out (the agreement with the answers in it) into a PDF, files it in the
//      Drive folder "Junior waivers", adds a row to the "Waivers" tab, and writes
//      "Waiver signed <date>" in the Status column of the child's signup row(s). Then one
//      email to the desk with every PDF attached, and a copy to the parent. Answers with
//      which children were found on the signup list and which were not.
// Nothing else reads or writes the sheet.
//
// Install (same two minutes as server/open-sheet.gs):
//   1. Open the sheet > Extensions > Apps Script. Replace the editor's contents with this file.
//   2. Project Settings (the cog) > Script Properties > add SECRET = a long random string.
//   3. Deploy > New deployment > type "Web app": Execute as "Me", Who has access "Anyone".
//      Authorize when asked. Copy the Web app URL (ends in /exec).
//   4. On Railway, set JUNIORS_SHEET_WEBHOOK = that URL and JUNIORS_SHEET_SECRET = the string.
// Re-deploying after an edit: Deploy > Manage deployments > edit > Version: New. The URL
// stays the same. The waiver branch uses Drive and Mail, so the first deploy after adding
// it asks for those permissions again.

var HEADERS = ["Submitted", "Parent name", "Email", "Phone", "Texts OK", "Child name", "Child age",
               "Day", "Session", "Notes", "Status"];
// 0-based columns of the signups sheet the waiver branch reads and writes.
var COL = { email: 2, child: 5, status: 10 };

var WAIVER_TAB = "Waivers";
var WAIVER_HEADERS = ["Signed", "Parent", "Email", "Phone", "Relationship", "Child", "Date of birth", "Age",
                      "Session date(s)", "Media consent", "May leave alone", "Allergies", "Conditions",
                      "Medications", "Emergency contact 1", "Emergency contact 2", "Pickup 1", "Pickup 2", "PDF"];
var FOLDER_NAME = "Junior waivers";
var DESK_EMAIL = "portland@foundrypadel.com";
// Who gets edit access to the folder when the script first creates it.
var FOLDER_EDITORS = ["monica@foundrypadel.com"];

function doPost(e) {
  var out = ContentService.createTextOutput().setMimeType(ContentService.MimeType.JSON);
  try {
    var body = JSON.parse(e.postData.contents || "{}");
    var secret = PropertiesService.getScriptProperties().getProperty("SECRET") || "";
    if (secret && body.secret !== secret) {
      return out.setContent(JSON.stringify({ ok: false, error: "bad secret" }));
    }
    // One write at a time. Two families submitting in the same second each get their own
    // execution; the lock keeps one's Status write from reading row numbers the other is
    // still changing. 30s is far longer than any single filing takes.
    var lock = LockService.getScriptLock();
    lock.waitLock(30000);
    try {
      return out.setContent(JSON.stringify(handle(body)));
    } finally {
      lock.releaseLock();
    }
  } catch (err) {
    return out.setContent(JSON.stringify({ ok: false, error: String(err) }));
  }
}

function handle(body) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (body.action === "waiver") {
    return fileWaiver(ss, body);
  }
  if (!Array.isArray(body.row) || body.row.length === 0) {
    return { ok: false, error: "no row" };
  }
  var sheet = ss.getSheets()[0];
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight("bold");
    sheet.setFrozenRows(1);
  }
  // Everything lands as text so a phone number keeps its leading + and an age never
  // turns into a date.
  var row = body.row.map(function (v) { return v == null ? "" : String(v); });
  sheet.appendRow(row);
  return { ok: true };
}

function norm(v) { return String(v == null ? "" : v).trim().toLowerCase().replace(/\s+/g, " "); }
function first(v) { return norm(v).split(" ")[0]; }

function fileWaiver(ss, body) {
  if (!body.parent || !Array.isArray(body.children) || body.children.length === 0) {
    return { ok: false, error: "no children" };
  }
  var folder = waiverFolder();
  var signups = ss.getSheets()[0];
  var data = signups.getLastRow() > 0 ? signups.getDataRange().getValues() : [];
  var tab = waiverTab(ss);
  var when = body.stamp || new Date().toLocaleString();
  var shortDate = when.split(",")[0];
  var files = [], blobs = [], matched = [], unmatched = [];

  body.children.forEach(function (c) {
    // The Drive converter does the HTML-to-PDF; the server already laid the page out.
    var pdf = Utilities.newBlob(c.html, "text/html", c.filename).getAs("application/pdf").setName(c.filename);
    var file = folder.createFile(pdf);
    blobs.push(pdf);
    files.push({ child: c.name, url: file.getUrl() });

    if (markSigned(signups, data, body.parent.email, c.name, shortDate)) matched.push(c.name);
    else unmatched.push(c.name);

    tab.appendRow([
      when, body.parent.name, body.parent.email, body.parent.phone, body.parent.relationship,
      c.name, c.dob, String(c.age), c.sessionDates || "", c.media === "yes" ? "yes" : "no", c.leaveAlone ? "yes" : "",
      c.allergies || "", c.conditions || "", c.medications || "",
      contact(body.emergency[0]), contact(body.emergency[1]), contact(body.pickup[0]), contact(body.pickup[1]),
      file.getUrl(),
    ]);
  });

  // The emails are the part most likely to hit a quota, and they are a copy of what is
  // already filed, so a failure here is reported, not fatal.
  var emailed = true, emailError = "";
  try {
    sendDeskEmail(body, files, blobs, matched, unmatched, when);
    sendParentCopy(body, blobs);
  } catch (err) {
    emailed = false; emailError = String(err);
  }
  return { ok: true, files: files, matched: matched, unmatched: unmatched, emailed: emailed, emailError: emailError };
}

function contact(p) {
  if (!p || !p.name) return "";
  return p.phone ? p.name + " " + p.phone : p.name;
}

// Every signup row for this child gets the status (a child may be signed up for more than
// one day). A row is the child's when the child's name matches, or when the parent's email
// matches and the first name does: "Josie Rivera" on the waiver, "Josie" on the signup.
function markSigned(sheet, data, email, childName, shortDate) {
  var em = norm(email), nm = norm(childName), fn = first(childName), hit = false;
  for (var i = 1; i < data.length; i++) {
    var r = data[i];
    var rowName = norm(r[COL.child]);
    var mine = rowName === nm || (em && norm(r[COL.email]) === em && (first(rowName) === fn || rowName === fn));
    if (!mine) continue;
    hit = true;
    if (norm(r[COL.status]).indexOf("waiver signed") !== 0) {
      sheet.getRange(i + 1, COL.status + 1).setValue("Waiver signed " + shortDate);
    }
  }
  return hit;
}

function waiverTab(ss) {
  var tab = ss.getSheetByName(WAIVER_TAB);
  if (!tab) {
    tab = ss.insertSheet(WAIVER_TAB);
    tab.appendRow(WAIVER_HEADERS);
    tab.getRange(1, 1, 1, WAIVER_HEADERS.length).setFontWeight("bold");
    tab.setFrozenRows(1);
  }
  return tab;
}

// The folder is found once and remembered by id, so a rename in Drive does not make a
// second one.
function waiverFolder() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty("WAIVER_FOLDER_ID");
  if (id) {
    try { return DriveApp.getFolderById(id); } catch (err) { /* trashed or gone: make another */ }
  }
  var existing = DriveApp.getFoldersByName(FOLDER_NAME);
  var folder = existing.hasNext() ? existing.next() : DriveApp.createFolder(FOLDER_NAME);
  if (!existing.hasNext() && folder) {
    FOLDER_EDITORS.forEach(function (who) {
      try { folder.addEditor(who); } catch (err) { /* a bad address must not stop the filing */ }
    });
  }
  props.setProperty("WAIVER_FOLDER_ID", folder.getId());
  return folder;
}

function sendDeskEmail(body, files, blobs, matched, unmatched, when) {
  var kids = body.children.map(function (c) { return c.name + " (" + c.age + ")"; }).join(", ");
  var lines = [
    body.parent.name + " (" + body.parent.relationship + ") signed the junior waiver online on " + when + " for " + kids + ".",
    "",
    "Parent: " + body.parent.email + ", " + body.parent.phone,
    "Media consent: " + body.children.map(function (c) { return c.name + " " + (c.media === "yes" ? "YES" : "NO"); }).join(", "),
  ];
  var alone = body.children.filter(function (c) { return c.leaveAlone; }).map(function (c) { return c.name; });
  if (alone.length) lines.push("May leave on their own: " + alone.join(", "));
  lines.push("");
  if (matched.length) lines.push("Signup rows marked \"Waiver signed\": " + matched.join(", "));
  if (unmatched.length) lines.push("NOT found on the signup list (walk-up, or spelled differently): " + unmatched.join(", "));
  lines.push("", "The PDFs are attached and filed in Drive > " + FOLDER_NAME + ":");
  files.forEach(function (f) { lines.push("  " + f.child + ": " + f.url); });
  lines.push("", "Medical answers are in the PDF and on the Waivers tab of the signups sheet.");
  MailApp.sendEmail({
    to: DESK_EMAIL,
    replyTo: body.parent.email,
    name: "Foundry Padel waivers",
    subject: "Junior waiver signed: " + body.parent.name + " for " + body.children.map(function (c) { return c.name; }).join(", "),
    body: lines.join("\n"),
    attachments: blobs,
  });
}

function sendParentCopy(body, blobs) {
  var names = body.children.map(function (c) { return c.name; });
  var who = names.length === 1 ? names[0] : names.slice(0, -1).join(", ") + " and " + names[names.length - 1];
  var firstName = String(body.parent.name).split(" ")[0];
  var lines = [
    "Hi " + firstName + ",",
    "",
    "Thanks, the junior waiver for " + who + " is signed and on file. A copy is attached for your records.",
    "",
    "Nothing else to fill in at the club. At the clinic, come to the front desk to check in, and bring court shoes and water. Rackets and balls are here.",
    "",
    "If anything on the form changes, such as a medical detail or who can pick up, reply to this email and we will update it.",
    "",
    "See you on court,",
    "Foundry Padel",
    "8613 N Crawford St, Portland",
    "(971) 378-7499",
  ];
  MailApp.sendEmail({
    to: body.parent.email,
    replyTo: DESK_EMAIL,
    name: "Foundry Padel",
    subject: "Your signed junior waiver for " + who,
    body: lines.join("\n"),
    attachments: blobs,
  });
}

// So the web app also answers a browser GET with something readable.
function doGet() {
  return ContentService.createTextOutput("Junior Clinic signups hook: POST only.");
}
