import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import BookCTA from "@/components/BookCTA";
import PageHeader from "@/components/PageHeader";
import Seo from "@/components/Seo";
import {
  CATEGORIES,
  LIGHTBOX_DIR,
  PHOTO_BASE,
  PHOTOS,
  type FilterCategory,
  type GalleryPhoto,
} from "@/data/gallery";

const thumb = (p: GalleryPhoto, ext: "jpg" | "webp") => `${PHOTO_BASE}/thumb/${p.file}.${ext}`;
const large = (p: GalleryPhoto, ext: "jpg" | "webp") => `${PHOTO_BASE}/${LIGHTBOX_DIR}/${p.file}.${ext}`;

// The viewer fades in and out, and one photo crossfades into the next. Opacity only, so
// it stays put for visitors who asked for reduced motion (MotionConfig in Layout).
const FADE = { duration: 0.25, ease: [0.22, 1, 0.36, 1] } as const;

/**
 * /gallery — the tournament-shoot photo set, filterable by category with a
 * keyboard- and swipe-driven lightbox.
 *
 * Columns are CSS `columns`, not a grid, so portrait and landscape frames sit
 * together without letterboxing or cropping. Each tile carries its source
 * aspect ratio so the page settles before a single photo has loaded.
 */
const Gallery = () => {
  const [cat, setCat] = useState<FilterCategory>("All");
  // Index into `visible`, or null when the lightbox is closed.
  const [openAt, setOpenAt] = useState<number | null>(null);
  const lastFocus = useRef<HTMLElement | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  const visible = useMemo(
    () => PHOTOS.filter((p) => cat === "All" || p.category === cat),
    [cat],
  );

  const count = useCallback(
    (c: FilterCategory) => (c === "All" ? PHOTOS.length : PHOTOS.filter((p) => p.category === c).length),
    [],
  );

  const open = (i: number) => {
    lastFocus.current = document.activeElement as HTMLElement | null;
    setOpenAt(i);
  };

  const close = useCallback(() => {
    setOpenAt(null);
    lastFocus.current?.focus();
  }, []);

  const step = useCallback(
    (dir: number) =>
      setOpenAt((i) => (i === null ? i : (i + dir + visible.length) % visible.length)),
    [visible.length],
  );

  // Filtering while the viewer is open would leave openAt pointing past the end
  // of a shorter list, so close it with the filter change.
  const filter = (c: FilterCategory) => {
    setOpenAt(null);
    setCat(c);
  };

  // Keyboard nav + scroll lock, mounted only while the viewer is open.
  useEffect(() => {
    if (openAt === null) return;
    const onKey = (e: KeyboardEvent) => {
      // Tab stays inside the viewer: it is aria-modal, so the page behind is not there.
      if (e.key === "Tab" && dialogRef.current) {
        const stops = dialogRef.current.querySelectorAll<HTMLElement>("button, [href]");
        const first = stops[0];
        const last = stops[stops.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") { e.preventDefault(); step(1); }
      if (e.key === "ArrowLeft") { e.preventDefault(); step(-1); }
    };
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [openAt, close, step]);

  // Focus moves into the viewer when it OPENS, not every time the photo changes: that
  // put a keyboard user who pressed Enter on "next" onto Close, so the next Enter shut it.
  const isOpen = openAt !== null;
  useEffect(() => {
    if (isOpen) closeRef.current?.focus();
  }, [isOpen]);

  // Warm the neighbours so arrow-key browsing lands instantly.
  useEffect(() => {
    if (openAt === null) return;
    [1, -1].forEach((d) => {
      const n = visible[(openAt + d + visible.length) % visible.length];
      if (n) {
        const im = new Image();
        im.src = large(n, "webp");
      }
    });
  }, [openAt, visible]);

  const touchX = useRef<number | null>(null);
  const onTouchStart = (e: React.TouchEvent) => { touchX.current = e.changedTouches[0].clientX; };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    if (Math.abs(dx) > 55) step(dx < 0 ? 1 : -1);
    touchX.current = null;
  };

  const active = openAt === null ? null : visible[openAt];

  return (
    <main className="bg-background min-h-screen pt-24">
      <Seo
        title="Gallery — Photos From Inside the Club | Foundry Padel Portland"
        description="Real photos from tournament nights at Foundry Padel in St. Johns, Portland: the four glass courts, the rallies, and the members who fill the place."
        path="/gallery"
      />

      {/* Hero */}
      <section className="py-20 px-6">
        <div className="mx-auto max-w-4xl text-center">
          <PageHeader title="GALLERY" kicker="Shot on court">
            <p className="font-body text-base text-secondary-foreground max-w-xl mx-auto">
              Tournament nights at 8613 N Crawford — the courts, the rallies, and the people who fill the place. Every photo here was taken inside the club.
            </p>
          </PageHeader>
        </div>
      </section>

      {/* Filters + grid */}
      <section className="pb-20 px-6">
        <div className="mx-auto max-w-6xl">
          <div className="section-divider mb-12" />

          <div className="flex flex-wrap justify-center gap-3 mb-12" role="group" aria-label="Filter photos by category">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                aria-pressed={cat === c}
                onClick={() => filter(c)}
                className={`border px-5 py-2 font-body text-xs tracking-[0.15em] uppercase transition-colors ${
                  cat === c
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-secondary-foreground hover:border-primary hover:text-primary"
                }`}
              >
                {c} <span aria-hidden="true" className="opacity-60">({count(c)})</span>
              </button>
            ))}
          </div>

          <ul className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4 [column-fill:_balance]" role="list">
            {visible.map((p, i) => (
              <li key={p.file} className="mb-4 break-inside-avoid">
                <button
                  type="button"
                  onClick={() => open(i)}
                  aria-label={`Open photo: ${p.alt}`}
                  className="group relative block w-full overflow-hidden border border-border bg-secondary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="absolute left-0 top-0 z-10 bg-background/80 px-2 py-1 font-body text-[0.6rem] tracking-[0.15em] uppercase text-primary opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                    {p.category}
                  </span>
                  <picture>
                    <source type="image/webp" srcSet={thumb(p, "webp")} />
                    <img
                      src={thumb(p, "jpg")}
                      alt={p.alt}
                      width={p.w}
                      height={p.h}
                      loading="lazy"
                      decoding="async"
                      className="w-full transition-transform duration-500 group-hover:scale-[1.03]"
                      style={{ aspectRatio: `${p.w} / ${p.h}` }}
                    />
                  </picture>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <AnimatePresence>
        {active && (
          <motion.div
            key="viewer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={FADE}
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label="Photo viewer"
            onClick={(e) => { if (e.target === e.currentTarget) close(); }}
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
            className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-background/95 px-4 py-16"
          >
            <button
              ref={closeRef}
              type="button"
              onClick={close}
              aria-label="Close viewer"
              className="absolute right-4 top-4 border border-border px-4 py-2 font-display text-xl leading-none text-foreground transition-colors hover:border-primary hover:text-primary"
            >
              ×
            </button>
            <button
              type="button"
              onClick={() => step(-1)}
              aria-label="Previous photo"
              className="absolute left-2 top-1/2 -translate-y-1/2 border border-border bg-background/70 px-3 py-4 font-display text-2xl leading-none text-foreground transition-colors hover:border-primary hover:text-primary sm:left-6"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => step(1)}
              aria-label="Next photo"
              className="absolute right-2 top-1/2 -translate-y-1/2 border border-border bg-background/70 px-3 py-4 font-display text-2xl leading-none text-foreground transition-colors hover:border-primary hover:text-primary sm:right-6"
            >
              ›
            </button>

            <figure className="relative flex max-h-full min-h-0 flex-col items-center">
              {/* Keyed on the photo, so stepping to the next one is a new element: the old
                  frame is popped out of the flow and fades over the new one fading in. The
                  viewer's own fade covers opening, hence initial={false}. */}
              <AnimatePresence initial={false} mode="popLayout">
                <motion.picture
                  key={active.file}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={FADE}
                >
                  <source type="image/webp" srcSet={large(active, "webp")} />
                  <img
                    src={large(active, "jpg")}
                    alt={active.alt}
                    className="max-h-[72vh] w-auto max-w-full border border-border object-contain"
                  />
                </motion.picture>
              </AnimatePresence>
              <figcaption className="mt-4 max-w-xl text-center font-body text-sm text-secondary-foreground">
                <b className="mr-2 font-body text-xs tracking-[0.15em] uppercase text-primary">{active.category}</b>
                {active.alt}
              </figcaption>
            </figure>

            <p className="absolute bottom-5 font-body text-xs tracking-[0.2em] text-muted-foreground">
              {openAt + 1} / {visible.length}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <BookCTA />
    </main>
  );
};

export default Gallery;
