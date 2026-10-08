// The junior waiver, signed online.
//
// The paper form (Foundry_Padel_Junior_Waiver.pdf) takes a parent ten minutes at the desk
// and leaves Monica with a stack to type up. /juniors/waiver asks for the same things,
// once per family with one block per child, and on accept the server:
//   1. Lays each child's answers into the agreement text (shared/juniorWaiver.js, the same
//      words the parent just read) as HTML, one document per child, like the paper.
//   2. Hands the lot to the signups sheet's Apps Script (juniors-sheet.gs, action "waiver"),
//      which turns each document into a PDF, files it in the Drive folder "Junior waivers",
//      emails the set to portland@ with a copy to the parent, adds a row per child to the
//      sheet's Waivers tab, and writes "Waiver signed <date>" in the Status column of the
//      child's signup row, so the desk list says who is good to go.
//   3. Posts to Slack: who signed, for which children, and whether every child was found
//      on the signup list. Nothing medical goes to Slack.
// The script is the record. If it does not take the waiver, the parent is told to try
// again or bring the paper copy; nothing is half-filed.
import { z } from "zod";
import {
  LEAVE_ALONE_LABEL, MEDIA_CHOICES, MEDICAL_INTRO, PARENT_ACK, PARENT_ACK_LINE, PARTICIPANT_ACK,
  PARTICIPANT_ACK_HEADING, PICKUP_INTRO, WAIVER_NOTICE, WAIVER_PREAMBLE, WAIVER_SECTIONS, WAIVER_SUBTITLE,
  WAIVER_TITLE,
} from "../shared/juniorWaiver.js";
import { escapeSlack, sanitize } from "./notify.js";

export const MEDIA_VALUES = MEDIA_CHOICES.map((c) => c.value);

const text = (max) => z.string().trim().max(max).optional().or(z.literal(""));
const person = z.object({ name: text(80), phone: text(30) });

export const waiverSchema = z.object({
  parent: z.object({
    name: z.string().trim().min(2).max(80),
    relationship: z.string().trim().min(2).max(40),
    phone: z.string().trim().min(7).max(30),
    email: z.string().trim().email().max(255),
  }),
  // The first emergency contact is required on paper too; the second is optional.
  emergency: z.tuple([z.object({ name: z.string().trim().min(2).max(80), phone: z.string().trim().min(7).max(30) }), person]),
  pickup: z.tuple([person, person]),
  children: z
    .array(
      z.object({
        name: z.string().trim().min(2).max(80),
        dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        program: text(80),
        sessionDates: text(120),
        allergies: text(300),
        conditions: text(300),
        medications: text(300),
        insurer: text(80),
        policy: text(60),
        leaveAlone: z.boolean().optional(),
        media: z.enum(MEDIA_VALUES),
        // The participant acknowledgment: the child's name, typed by them. Optional.
        participantSigned: text(80),
      }),
    )
    .min(1)
    .max(6),
  // The typed signature, and the two boxes above it.
  signature: z.string().trim().min(2).max(80),
  agree: z.literal(true),
  guardian: z.literal(true),
  website: z.string().max(0).optional(),
});

/** Whole years between a YYYY-MM-DD birth date and a date, or null for a date that is not one. */
export function ageOn(dob, on) {
  const [y, m, d] = dob.split("-").map(Number);
  if (!y || !m || !d || m > 12 || d > 31) return null;
  const birth = new Date(Date.UTC(y, m - 1, d));
  if (birth.getUTCMonth() !== m - 1 || birth.getUTCDate() !== d) return null;
  const Y = on.getUTCFullYear(), M = on.getUTCMonth(), D = on.getUTCDate();
  let age = Y - y;
  if (M < m - 1 || (M === m - 1 && D < d)) age -= 1;
  return age;
}

/** Long date in Portland, e.g. "October 8, 2026". */
export function longDate(date) {
  return new Intl.DateTimeFormat("en-US", { timeZone: "America/Los_Angeles", dateStyle: "long" }).format(date);
}

/** What the parent actually typed, cut to the sheet's and the PDF's size, every field. */
export function cleanWaiver(w) {
  const p = (x) => ({ name: sanitize(x?.name || "", 80), phone: sanitize(x?.phone || "", 30) });
  return {
    parent: {
      name: sanitize(w.parent.name, 80),
      relationship: sanitize(w.parent.relationship, 40),
      phone: sanitize(w.parent.phone, 30),
      email: w.parent.email,
    },
    emergency: [p(w.emergency[0]), p(w.emergency[1])],
    pickup: [p(w.pickup[0]), p(w.pickup[1])],
    children: w.children.map((c) => ({
      name: sanitize(c.name, 80),
      dob: c.dob,
      program: sanitize(c.program || "", 80) || "Junior Padel Clinic",
      sessionDates: sanitize(c.sessionDates || "", 120),
      allergies: sanitize(c.allergies || "", 300) || "None",
      conditions: sanitize(c.conditions || "", 300) || "None",
      medications: sanitize(c.medications || "", 300) || "None",
      insurer: sanitize(c.insurer || "", 80),
      policy: sanitize(c.policy || "", 60),
      leaveAlone: c.leaveAlone === true,
      media: c.media,
      participantSigned: sanitize(c.participantSigned || "", 80),
    })),
    signature: sanitize(w.signature, 80),
  };
}

function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

const box = (on) => (on ? "&#9746;" : "&#9744;");

/**
 * One child's signed waiver as a self-contained HTML document: the paper form with the
 * blanks filled, plus the electronic-acceptance record in place of the ink. The Apps
 * Script converts it to PDF unchanged, so the CSS stays to what that converter honours:
 * tables, borders, page breaks, no web fonts.
 */
export function buildWaiverHtml(w, child, { age, signedAt, stamp, ip, userAgent }) {
  const date = longDate(signedAt);
  const field = (label, value) => `<td><div class="lbl">${esc(label)}</div><div class="val">${esc(value) || "&nbsp;"}</div></td>`;
  const row2 = (a, b) => `<tr>${a}${b}</tr>`;
  const section = (n, heading) => `<h2>${n}&nbsp; ${esc(heading)}</h2>`;
  const terms = WAIVER_SECTIONS.map((s) => {
    let html = section(s.n, s.heading) + s.paras.map((p) => `<p>${esc(p)}</p>`).join("");
    if (s.bullets) html += `<ul>${s.bullets.map((b) => `<li>${esc(b)}</li>`).join("")}</ul>`;
    if (s.n === 11) {
      html += MEDIA_CHOICES.map((c) => `<p class="choice">${box(child.media === c.value)} ${esc(c.label)}</p>`).join("");
    }
    return html;
  }).join("");

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(WAIVER_TITLE)}: ${esc(child.name)}</title>
<style>
  body { font-family: Helvetica, Arial, sans-serif; font-size: 10.5pt; color: #1a1a1a; margin: 36pt 42pt; line-height: 1.4; }
  .head { border-bottom: 2px solid #313f3a; padding-bottom: 6pt; margin-bottom: 12pt; }
  .head .club { font-size: 9pt; letter-spacing: 2px; text-transform: uppercase; color: #8a5a3c; }
  h1 { font-size: 20pt; margin: 2pt 0 0; color: #313f3a; }
  .sub { font-size: 11pt; color: #444; margin: 0; }
  .notice { border: 1.5pt solid #8a5a3c; padding: 8pt 10pt; margin: 10pt 0 12pt; font-size: 10pt; }
  h2 { font-size: 11.5pt; color: #313f3a; margin: 14pt 0 4pt; border-bottom: 1px solid #ccc; padding-bottom: 2pt; }
  p { margin: 0 0 6pt; }
  ul { margin: 0 0 6pt 16pt; padding: 0; }
  li { margin-bottom: 4pt; }
  table.f { width: 100%; border-collapse: collapse; margin: 4pt 0 6pt; }
  table.f td { width: 50%; vertical-align: top; padding: 4pt 8pt 4pt 0; }
  .lbl { font-size: 8pt; text-transform: uppercase; letter-spacing: 1px; color: #666; }
  .val { border-bottom: 1px solid #999; padding: 2pt 0; min-height: 13pt; }
  .choice { padding-left: 4pt; }
  .ack { font-weight: bold; font-size: 9.5pt; margin-top: 12pt; }
  .sig { border: 1px solid #999; padding: 8pt 10pt; margin: 8pt 0; }
  .sig .name { font-family: "Times New Roman", Times, serif; font-style: italic; font-size: 18pt; color: #313f3a; }
  .esig { font-size: 8.5pt; color: #555; }
  .office { margin-top: 14pt; font-size: 9pt; color: #555; border-top: 1px solid #ccc; padding-top: 6pt; }
  .pb { page-break-before: always; }
</style></head><body>
<div class="head">
  <div class="club">Foundry Padel &middot; Portland, Oregon</div>
  <h1>${esc(WAIVER_TITLE)}</h1>
  <p class="sub">${esc(WAIVER_SUBTITLE)}. Signed online.</p>
</div>
<div class="notice">${esc(WAIVER_NOTICE)}</div>
${WAIVER_PREAMBLE.map((p) => `<p>${esc(p)}</p>`).join("")}

${section(1, "Participant Information")}
<table class="f">
${row2(field("Participant full name", child.name), field("Date of birth", child.dob) )}
${row2(field("Age", String(age)), field("Program / clinic", child.program))}
${row2(field("Session date(s)", child.sessionDates), "<td></td>")}
</table>

${section(2, "Parent/Guardian and Emergency Contacts")}
<table class="f">
${row2(field("Parent/guardian name", w.parent.name), field("Relationship", w.parent.relationship))}
${row2(field("Mobile phone", w.parent.phone), field("Email", w.parent.email))}
${row2(field("Emergency contact 1", w.emergency[0].name), field("Phone", w.emergency[0].phone))}
${row2(field("Emergency contact 2", w.emergency[1].name), field("Phone", w.emergency[1].phone))}
</table>

${section(3, "Medical Information")}
<p>${esc(MEDICAL_INTRO)}</p>
<table class="f">
${row2(field("Allergies", child.allergies), field("Medical conditions (e.g. asthma, diabetes, seizures, prior concussion)", child.conditions))}
${row2(field("Medications / emergency medication (e.g. inhaler, EpiPen)", child.medications), field("Health insurance provider", child.insurer))}
${row2(field("Policy / member no.", child.policy), "<td></td>")}
</table>

${section(4, "Authorized Pickup")}
<p>${esc(PICKUP_INTRO)}</p>
<table class="f">
${row2(field("Authorized adult 1", w.pickup[0].name), field("Phone", w.pickup[0].phone))}
${row2(field("Authorized adult 2", w.pickup[1].name), field("Phone", w.pickup[1].phone))}
</table>
<p class="choice"><b>Participants age 14 and older only:</b> ${box(child.leaveAlone)} ${esc(LEAVE_ALONE_LABEL)}</p>

${terms}

<div class="pb"></div>
<h2>Parent/Guardian Acknowledgment</h2>
<p class="ack">${esc(PARENT_ACK)}</p>
<p>${esc(PARENT_ACK_LINE)}</p>
<div class="sig">
  <div class="lbl">Parent/guardian signature (typed, electronic acceptance)</div>
  <div class="name">${esc(w.signature)}</div>
  <table class="f">
  ${row2(field("Date", date), field("Printed name", w.parent.name))}
  ${row2(field("Relationship to participant", w.parent.relationship), field("Email", w.parent.email))}
  </table>
  <p class="esig">Accepted electronically at ${esc(stamp)} (Portland time) from ${esc(ip || "an unrecorded address")}. ${esc(userAgent || "")}</p>
</div>

<h2>${esc(PARTICIPANT_ACK_HEADING)}</h2>
<p>${esc(PARTICIPANT_ACK)}</p>
<table class="f">
${row2(field("Participant signature (typed)", child.participantSigned || "Not signed by the participant"), field("Date", child.participantSigned ? date : ""))}
</table>

<p class="office">Office use: received online via foundrypadel.com/juniors/waiver on ${esc(date)}. Filed automatically in Drive, "Junior waivers".</p>
</body></html>`;
}

/** A filename the Drive folder sorts by child, then date: "Rivera, Josie 2026-10-08.pdf". */
export function waiverFilename(child, signedAt) {
  const parts = child.name.trim().split(/\s+/);
  const last = parts.length > 1 ? parts[parts.length - 1] : "";
  const first = parts.length > 1 ? parts.slice(0, -1).join(" ") : parts[0];
  const who = (last ? `${last}, ${first}` : first).replace(/[^\w ,.'-]/g, "");
  return `${who} ${signedAt.toISOString().slice(0, 10)}.pdf`;
}

/** The Slack line. Names and ages only; the medical answers stay in the PDF and the sheet. */
export function buildWaiverSlackText(w, ages, filed) {
  const kids = w.children.map((c, i) => `${escapeSlack(c.name)} (${ages[i]}, media ${c.media})`).join(", ");
  const bits = [
    `*Junior waiver signed*  ${escapeSlack(w.parent.name)}, ${escapeSlack(w.parent.relationship)}  ·  ${escapeSlack(w.parent.email)}  ·  ${escapeSlack(w.parent.phone)}`,
    `Kids: ${kids}`,
  ];
  if (filed) {
    if (filed.matched?.length) bits.push(`Signup rows marked: ${filed.matched.map(escapeSlack).join(", ")}`);
    if (filed.unmatched?.length) bits.push(`:warning: No signup row found for: ${filed.unmatched.map(escapeSlack).join(", ")} (walk-up, or a different spelling; check the sheet)`);
    if (filed.files?.length) bits.push(filed.files.map((f) => `<${f.url}|${escapeSlack(f.child)} PDF>`).join("  ·  "));
  }
  return bits.join("\n");
}
