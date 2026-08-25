/**
 * A photograph from public/photos/site/, served as WebP with a JPEG fallback.
 *
 * Every site photo ships as a matching `.webp`/`.jpg` pair at 1600px on the
 * long edge, so callers name the file once and get both. `className` styles the
 * <img> itself — usually `h-full w-full object-cover` inside a fixed-ratio box,
 * the pattern the section layouts already use.
 */
type PhotoProps = {
  /** Basename inside /photos/site, without extension — e.g. "club-courts". */
  name: string;
  alt: string;
  className?: string;
  /** Source dimensions, to reserve layout space. Defaults to the 3:2 landscape crop. */
  width?: number;
  height?: number;
  /** Set on above-the-fold heroes only: eager load, high fetch priority. */
  priority?: boolean;
  /** Load immediately without claiming high priority — for a frame needed in seconds. */
  eager?: boolean;
  /**
   * Directory under /photos/ holding the pair. Defaults to the site set; pass
   * GALLERY_IMAGE_DIR to pull a frame from the gallery instead.
   */
  dir?: string;
};

const Photo = ({
  name,
  alt,
  className,
  width = 1600,
  height = 1067,
  priority = false,
  eager = false,
  dir = "site",
}: PhotoProps) => (
  <picture>
    <source type="image/webp" srcSet={`/photos/${dir}/${name}.webp`} />
    <img
      src={`/photos/${dir}/${name}.jpg`}
      alt={alt}
      width={width}
      height={height}
      className={className}
      loading={priority || eager ? "eager" : "lazy"}
      decoding={priority ? "sync" : "async"}
      // React 18 does not know the camelCase `fetchPriority` prop and drops it
      // with a warning; the lowercase DOM attribute passes through untouched.
      {...(priority ? { fetchpriority: "high" } : {})}
    />
  </picture>
);

export default Photo;
