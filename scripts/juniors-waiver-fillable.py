"""Overlay AcroForm fields on the flat junior waiver so a parent can type into it in a
browser and print it. Field rows are the gaps between the form's drawn rules; a field
starts just right of its grey label and runs to the column edge."""
import pymupdf, sys
SRC, OUT = sys.argv[1], sys.argv[2]
doc = pymupdf.open(SRC)
LABELS = {
  0: ["Participant Full Name", "Date of Birth", "Age", "Program / Clinic", "Session Date(s)",
      "Parent/Guardian Name", "Relationship", "Mobile Phone", "Email", "Emergency Contact 1",
      "Emergency Contact 2", "Phone", "Allergies", "Medical Conditions (e.g. asthma, diabetes,",
      "seizures, prior concussion)", "Medications / Emergency Medication (e.g.", "inhaler, EpiPen)",
      "Health Insurance Provider", "Policy / Member No."],
  1: ["Authorized Adult 1", "Authorized Adult 2", "Phone"],
  3: ["Parent/Guardian", "Signature", "Date", "Printed Name", "Relationship to", "Participant",
      "Participant Signature"],
}
CHECKS = {1: ["☐"], 2: ["☐"], 3: []}   # page 4's office-use box stays for the desk
MID, RIGHT, H = 300, 554, 15
count = 0
for pno, page in enumerate(doc):
    rules = sorted({round(d["rect"].y0) for d in page.get_drawings() if d["rect"].width > 100 and d["rect"].height < 2})
    rules = [r for r in rules if 100 < r < 740]
    rects = []
    words = page.get_text("words")
    def whole_word(r):  # a hit that is a word of its own, not "Age" inside "Agreement"
        return any(abs(w[0] - r.x0) < 1 and abs(w[2] - r.x1) < 1 for w in words)
    for lab in LABELS.get(pno, []):
        for r in page.search_for(lab):
            if " " not in lab and "/" not in lab and not whole_word(r): continue
            if pno == 3 and r.y0 < 400: continue  # page 4: only the acknowledgment block, not the headings
            if lab in ("Participant", "Signature", "Date") and not (400 < r.y0 < 680): continue  # page 4: only the ack block
            if lab == "Participant" and r.x0 < MID: continue  # "Relationship to / Participant" is the col-2 label
            rects.append((lab, r))
    # group by row = the rule interval the label sits in
    rows = {}
    for lab, r in rects:
        above = max([x for x in rules if x < r.y0], default=None); below = min([x for x in rules if x > r.y1], default=None)
        if above is None or below is None: continue
        rows.setdefault((above, below), []).append((lab, r))
    for (above, below), labs in sorted(rows.items()):
        cols = {0: [l for l in labs if l[1].x0 < MID], 1: [l for l in labs if l[1].x0 >= MID]}
        for c, ls in cols.items():
            if not ls: continue
            x0 = max(r.x1 for _, r in ls) + 8
            x1 = (MID - 6 if cols[1] else RIGHT) if c == 0 else RIGHT
            y1 = below - 3; y0 = max(above + 3, y1 - H)
            name = f"p{pno+1}_{ls[0][0].split(' (')[0].replace('/', '_').replace(' ', '_')}_{int(above)}"
            w = pymupdf.Widget(); w.field_name = name; w.field_type = pymupdf.PDF_WIDGET_TYPE_TEXT
            w.rect = pymupdf.Rect(x0, y0, x1, y1); w.text_fontsize = 10; w.border_width = 0
            w.fill_color = (0.97, 0.96, 0.93)
            page.add_widget(w); count += 1
    for glyph in CHECKS.get(pno, []):
        for r in page.search_for(glyph):
            w = pymupdf.Widget(); w.field_name = f"p{pno+1}_check_{int(r.y0)}"; w.field_type = pymupdf.PDF_WIDGET_TYPE_CHECKBOX
            w.rect = pymupdf.Rect(r.x0 - 0.5, r.y0 + 0.5, r.x0 + 10.5, r.y0 + 11.5); w.border_width = 0.6; w.border_color = (0.4,0.4,0.4); w.fill_color = (1,1,1)
            page.add_widget(w); count += 1
    # the initials blank in the footer
    for r in page.search_for("Parent/Guardian Initials ________"):
        w = pymupdf.Widget(); w.field_name = f"p{pno+1}_initials"; w.field_type = pymupdf.PDF_WIDGET_TYPE_TEXT
        w.rect = pymupdf.Rect(r.x1 - 34, r.y0 - 3, r.x1 + 1, r.y1 + 1); w.text_fontsize = 8; w.border_width = 0; w.fill_color = (0.97, 0.96, 0.93)
        page.add_widget(w); count += 1
doc.save(OUT, garbage=3, deflate=True)
print("fields:", count)
