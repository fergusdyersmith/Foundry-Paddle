/// <reference types="vite/client" />

/** Portland date of the build, YYYY-MM-DD (vite.config.ts `define`). */
declare const __BUILD_DAY__: string;

declare module "virtual:partner-logos" {
  export const partnerLogoFiles: string[];
}
