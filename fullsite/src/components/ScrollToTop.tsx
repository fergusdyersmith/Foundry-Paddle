import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/** A new page starts at the top, unless the link named a spot on it (/juniors#signup,
 *  which the waiver page links to): then it starts there. */
const ScrollToTop = () => {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    const target = hash ? document.getElementById(decodeURIComponent(hash.slice(1))) : null;
    if (target) target.scrollIntoView();
    else window.scrollTo(0, 0);
  }, [pathname, hash]);
  return null;
};

export default ScrollToTop;
