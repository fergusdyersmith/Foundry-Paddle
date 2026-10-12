import { GOOGLE_MAPS_EMBED_SRC, GOOGLE_MAPS_URL } from "@/constants/location";

/**
 * The club on a map, opening Google Maps when clicked. The embed is only a picture of
 * where we are: it takes no clicks or focus, and a link laid over it does the opening.
 * The iframe used to sit inside the link, which is invalid markup and put the embed's
 * own links in the tab order behind an element that swallowed their clicks.
 */
const MapEmbed = ({ className = "" }: { className?: string }) => (
  <div className={`relative overflow-hidden border border-border ${className}`}>
    <iframe
      title="Map of Foundry Padel's location"
      src={GOOGLE_MAPS_EMBED_SRC}
      className="pointer-events-none h-full w-full"
      style={{ filter: "grayscale(1) invert(1) contrast(1.2) brightness(0.6)" }}
      loading="lazy"
      tabIndex={-1}
      aria-hidden="true"
      referrerPolicy="no-referrer-when-downgrade"
    />
    <a
      href={GOOGLE_MAPS_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="absolute inset-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
      aria-label="View on Google Maps"
    />
  </div>
);

export default MapEmbed;
