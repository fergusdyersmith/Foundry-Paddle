import { Link } from "react-router-dom";
import { BOOK_PAGE_PATH } from "@/constants/booking";
import Reveal from "@/components/motion/Reveal";
import BallFlight from "@/components/motion/BallFlight";

// One rally over the net and back: the ball crosses on a high arc, lands at the far end,
// and comes back the same way. Decorative, so it carries no label.
const RALLY_PATH = "M20 56 Q100 -10 180 56 Q100 -10 20 56";

const BookCTA = () => (
  <section className="py-20 px-6">
    {/* The dividers sit outside the Reveal: each reveals itself, and wrapping one would
        animate it twice. */}
    <div className="mx-auto max-w-2xl text-center">
      <div className="section-divider mb-12" />
      <Reveal>
        <BallFlight
          viewBox="0 0 200 60"
          path={RALLY_PATH}
          rest={[20, 56]}
          radius={3}
          ballFill="hsl(var(--foreground))"
          trail={3}
          periodMs={2600}
          className="mx-auto mb-8 h-10 w-auto text-foreground"
        >
          <path d="M0 58.5H200" stroke="currentColor" strokeOpacity={0.25} />
          <path d="M100 58.5V40" stroke="hsl(var(--primary))" strokeWidth={1.5} />
        </BallFlight>
        <h2 className="font-display text-5xl sm:text-6xl text-foreground mb-4">
          READY TO PLAY?
        </h2>
        <p className="font-body text-sm tracking-[0.15em] uppercase text-muted-foreground mb-10">
          Reserve your court and experience Portland's first padel club
        </p>
        <Link
          to={BOOK_PAGE_PATH}
          className="inline-block bg-primary px-12 py-4 font-display text-xl tracking-widest text-primary-foreground transition-all hover:brightness-110 active:scale-[0.98]"
        >
          BOOK A COURT
        </Link>
      </Reveal>
      <div className="section-divider mt-12" />
    </div>
  </section>
);

export default BookCTA;
