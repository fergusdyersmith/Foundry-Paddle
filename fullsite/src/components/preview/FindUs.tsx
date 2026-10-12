import { MapPin, Phone } from "lucide-react";
import { GOOGLE_MAPS_URL } from "@/constants/location";

export const PHONE_DISPLAY = "(971) 378-7499";
export const PHONE_TEL = "+19713787499";

/** Address, directions and the phone number, for the bottom of /preview (both before and
 *  after the evening). */
const FindUs = () => (
  <section className="px-6 pb-20">
    <div className="mx-auto max-w-3xl border border-border p-10 text-center">
      <h2 className="font-display text-3xl text-foreground">FIND US</h2>
      <p className="mt-4 font-body text-base text-secondary-foreground">
        8613 N Crawford St, Portland, OR 97203
        <br />
        In St. Johns, next to Cathedral Park
      </p>
      <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
        <a
          href={GOOGLE_MAPS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 border border-primary px-8 py-3 font-display tracking-widest text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
        >
          <MapPin size={18} /> GET DIRECTIONS
        </a>
        <a
          href={`tel:${PHONE_TEL}`}
          className="inline-flex items-center gap-2 border border-border px-8 py-3 font-display tracking-widest text-foreground transition-colors hover:border-primary"
        >
          <Phone size={18} /> {PHONE_DISPLAY}
        </a>
      </div>
    </div>
  </section>
);

export default FindUs;
