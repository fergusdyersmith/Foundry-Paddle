import type { CSSProperties } from "react";
import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Head } from "vite-react-ssg";
import BallFlight from "@/components/motion/BallFlight";
import { BOOK_PAGE_PATH } from "@/constants/booking";

const step = (s: string) => ({ "--enter-delay": s }) as CSSProperties;
const lineDelay = (d: number) => ({ "--d": d }) as CSSProperties;

// A court side-on: the serve clears the net, bounces once, hits the back glass and
// goes up and out over it. The ball's centre runs 3.5 above the floor and short of
// the glass, so at the bounce and the wall it touches them rather than sinking in.
const OUT_FLIGHT = "M20 80 Q85 5 165 89 Q200 60 229 52 Q214 0 262 -34";

/** Not-found page, reached two ways:
 *
 *  1. Client-side, via the "*" route, when an in-app navigation misses.
 *  2. Server-side: the "404" route prerenders this to dist/404.html, which
 *     server.js sends with a real 404 status for any unknown path. Without
 *     that file the server fell back to index.html at status 200, which Google
 *     reports as a soft 404 (homepage content living at a dead URL).
 *
 *  noindex because /404 is a real prerendered URL and must never be indexed on
 *  its own; it is also absent from scripts/generate-sitemap.mjs. */
const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <main className="bg-background min-h-screen pt-24">
      <Head>
        <title>Page Not Found | Foundry Padel</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <section className="px-6 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <BallFlight
            viewBox="0 0 240 100"
            path={OUT_FLIGHT}
            rest={[20, 80]}
            radius={3.5}
            ballFill="hsl(var(--primary))"
            trail={4}
            periodMs={2800}
            className="mx-auto mb-10 h-28 w-auto text-foreground overflow-visible"
            svgProps={{ "data-enter": "draw" }}
          >
            <path className="draw" pathLength={1} d="M0 92.5H240" stroke="currentColor" strokeOpacity={0.35} style={lineDelay(0)} />
            <path className="draw" pathLength={1} d="M120 92.5V70" stroke="hsl(var(--primary))" strokeWidth={1.5} style={lineDelay(4)} />
            <path className="draw" pathLength={1} d="M232.5 92.5V40" stroke="currentColor" strokeOpacity={0.5} style={lineDelay(6)} />
          </BallFlight>
          <h1 data-enter style={step("0.1s")} className="font-display text-8xl leading-none text-foreground sm:text-9xl">
            OUT.
          </h1>
          <div className="mt-6 mb-6 flex items-center justify-center gap-4">
            <div data-enter="rule-l" style={step("0.35s")} className="h-px w-16 bg-primary" />
            <span data-enter="fade" style={step("0.2s")} className="font-body text-sm uppercase tracking-[0.2em] text-primary">
              Page not found
            </span>
            <div data-enter="rule-r" style={step("0.35s")} className="h-px w-16 bg-primary" />
          </div>
          <p data-enter style={step("0.3s")} className="font-body text-base text-muted-foreground">
            That page went long. The ball's gone over the glass.
          </p>
          <div data-enter style={step("0.45s")} className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              to="/"
              className="bg-primary px-10 py-4 font-display text-lg tracking-widest text-primary-foreground transition-all hover:brightness-110 active:scale-[0.98]"
            >
              BACK TO COURT
            </Link>
            <Link
              to={BOOK_PAGE_PATH}
              className="border border-border px-10 py-4 font-display text-lg tracking-widest text-foreground transition-colors hover:border-primary"
            >
              BOOK A COURT
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
};

export default NotFound;
