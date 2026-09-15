# Sell sheet source

The six targeted sell sheets were built elsewhere (a claude.ai conversation) and only the finished
PDFs ever reached this machine. That source is gone: no `sheets_content.py`, no per-sheet `.html`,
no brand folder. This directory exists so that does not happen again.

## What is here

`small-teams.html` plus `assets/`, which together rebuild
`fullsite/public/sheets/small-teams.pdf` exactly.

The assets were recovered from the existing PDFs with `pdfimages`, so they are the real brand
files, not lookalikes:

| File | What it is |
|---|---|
| `assets/logo-mid.png` | FP mark, cream on `#303F39`. For the hero, on mid-dark. |
| `assets/logo-dark.png` | FP mark, cream on `#1F2A26`. For the footer bar. |
| `assets/hero.jpg` | Wide court shot, 1700x820, gradient already baked in. |
| `assets/cta.jpg` | Darker court shot, 1700x540, for the closing block. |
| `assets/s1-s3.jpg` | The three-photo strip, 700x560 each. |

All are RGB with no alpha. That is deliberate: the original notes describe a "transparency-free
PDF pipeline" so the sheets cannot show a magenta bug. Do not add alpha channels.

## Brand system, measured off the originals

**Type** (both on Google Fonts)
- Display: **Archivo**, 600 and 700, uppercase, tight tracking
- Body: **Schibsted Grotesk**, 400/500/600/700

**Colour**
| Hex | Use |
|---|---|
| `#303F39` | Deep green. Stat band, footer, body headlines. |
| `#1D2824` | Darkest. Hero and CTA photo overlay. |
| `#22302B` | Body text. |
| `#AD6D56` | Rust accent. Eyebrows, offer subtitles, contact labels. |
| `#C08E77` | Lighter rust, for accent text on dark. |
| `#EDEAE0` | Warm off-white. The "who this is for" band. |
| `#EDECE6` / `#F2F1EB` | Light text on dark. |
| `#93A096` | Muted. Stat labels, and the second half of a headline. |

**Page**: US Letter, 8.5 x 11in, zero margin, single page.

**Structure**, top to bottom: hero photo with overlay, four-column stat band, white body with
eyebrow + rule + headline + lede, four offer rows separated by hairlines, "who this is for" band,
three-photo strip, CTA block on a dark photo with four contact columns, footer bar.

## Rebuilding

```sh
google-chrome --headless --disable-gpu --no-sandbox --no-pdf-header-footer \
  --print-to-pdf=small-teams.pdf --virtual-time-budget=12000 small-teams.html
cp small-teams.pdf ../fullsite/public/sheets/small-teams.pdf
```

Keep photos as JPEG. Rendering with PNGs produces a ~3.3MB file; JPEG brings it to ~660KB, in
line with the other seven sheets (515KB to 1.1MB).

## Deliberately no prices

None of the sheets price anything, and this one follows that. For small teams it is also the
point: "what does it cost" is the reply we want.
