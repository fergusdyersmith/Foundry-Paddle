import type { DetailedHTMLProps, HTMLAttributes } from "react";

declare global {
  interface Window {
    /** Read by Wistia's player.js: true skips its Mux video analytics. */
    wistiaDisableMux?: boolean;
  }
  namespace JSX {
    interface IntrinsicElements {
      "wistia-player": DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & {
        "media-id"?: string;
        aspect?: string;
      };
    }
  }
}

export {};
