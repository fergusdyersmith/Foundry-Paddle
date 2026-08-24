import { Head } from "vite-react-ssg";

const SITE_URL = "https://www.foundrypadel.com";
// Real photo of the club, cropped to 1200x630 from photos/site/og-image-photo.jpg.
const OG_IMAGE = `${SITE_URL}/photos/site/og-image.jpg`;

type SeoProps = {
  /** Full <title> for the page. */
  title: string;
  /** Meta description (~150–160 chars). */
  description: string;
  /** Route path, e.g. "/the-sport" or "/" — used for canonical + og:url. */
  path: string;
};

/**
 * Per-route <head> tags. This component is the single owner of title,
 * description, canonical and social tags — they are intentionally NOT in
 * index.html, so each prerendered page emits exactly one of each.
 */
const Seo = ({ title, description, path }: SeoProps) => {
  const url = path === "/" ? SITE_URL : `${SITE_URL}${path}`;
  return (
    <Head>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />

      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content="website" />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={OG_IMAGE} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:site_name" content="Foundry Padel" />
      <meta property="og:locale" content="en_US" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={OG_IMAGE} />
    </Head>
  );
};

export default Seo;
