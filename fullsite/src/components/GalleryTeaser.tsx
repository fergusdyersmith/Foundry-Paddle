import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { PHOTO_BASE, PHOTOS } from "@/data/gallery";

// Four frames, one per gallery category, picked to show the range: the room,
// the sport, the people, the detail. Named rather than sliced off the top of
// PHOTOS so reordering the gallery data cannot quietly change the homepage.
const TEASER_FILES = ["night-serve-wide", "jumping-smash", "group-high-five", "ball-at-the-net"];

const teaserPhotos = TEASER_FILES.map((file) => {
  const photo = PHOTOS.find((p) => p.file === file);
  if (!photo) throw new Error(`GalleryTeaser: no gallery photo named "${file}"`);
  return photo;
});

/**
 * Homepage strip into /gallery. Most visitors never reach The Club, which is
 * where the gallery is linked in prose, so this is the one place the photos
 * meet the whole audience.
 */
const GalleryTeaser = () => (
  <section className="py-20 px-6">
    <div className="mx-auto max-w-5xl">
      <div className="section-divider mb-16" />
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
      >
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="font-body text-xs tracking-[0.2em] uppercase text-primary">Shot on court</span>
            <h2 className="font-display text-4xl sm:text-5xl text-foreground mt-2">INSIDE THE CLUB</h2>
          </div>
          <Link
            to="/gallery"
            className="font-body text-xs tracking-[0.2em] uppercase text-secondary-foreground transition-colors hover:text-primary"
          >
            See all {PHOTOS.length} photos →
          </Link>
        </div>

        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4" role="list">
          {teaserPhotos.map((p) => (
            <li key={p.file}>
              <Link
                to="/gallery"
                className="group block aspect-square overflow-hidden border border-border bg-secondary"
              >
                <picture>
                  <source type="image/webp" srcSet={`${PHOTO_BASE}/thumb/${p.file}.webp`} />
                  <img
                    src={`${PHOTO_BASE}/thumb/${p.file}.jpg`}
                    alt={p.alt}
                    width={p.w}
                    height={p.h}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </picture>
              </Link>
            </li>
          ))}
        </ul>
      </motion.div>
    </div>
  </section>
);

export default GalleryTeaser;
