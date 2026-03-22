import type { DetailedHTMLProps, HTMLAttributes } from "react";

declare global {
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
