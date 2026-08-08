import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Head } from "vite-react-ssg";

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
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <Head>
        <title>Page Not Found | Foundry Padel</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">404</h1>
        <p className="mb-4 text-xl text-muted-foreground">Oops! Page not found</p>
        <a href="/" className="text-primary underline hover:text-primary/90">
          Return to Home
        </a>
      </div>
    </div>
  );
};

export default NotFound;
