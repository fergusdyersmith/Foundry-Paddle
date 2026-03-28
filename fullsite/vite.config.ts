import fs from "fs";
import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

const VIRTUAL_PARTNER_LOGOS = "virtual:partner-logos";
const RESOLVED_VIRTUAL_PARTNER_LOGOS = "\0" + VIRTUAL_PARTNER_LOGOS;

const IMAGE_EXT = new Set([".png", ".jpg", ".jpeg", ".webp", ".svg", ".gif", ".avif"]);

function partnerLogosVirtualModule(root: string) {
  const logosDir = path.resolve(root, "public/partner-logos");

  const readFilenames = (): string[] => {
    try {
      if (!fs.existsSync(logosDir)) return [];
      return fs
        .readdirSync(logosDir)
        .filter((name) => IMAGE_EXT.has(path.extname(name).toLowerCase()))
        .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
    } catch {
      return [];
    }
  };

  const invalidate = (server: import("vite").ViteDevServer) => {
    const mod = server.moduleGraph.getModuleById(RESOLVED_VIRTUAL_PARTNER_LOGOS);
    if (mod) server.moduleGraph.invalidateModule(mod);
  };

  return {
    name: "partner-logos-virtual",
    resolveId(id) {
      if (id === VIRTUAL_PARTNER_LOGOS) return RESOLVED_VIRTUAL_PARTNER_LOGOS;
    },
    load(id) {
      if (id !== RESOLVED_VIRTUAL_PARTNER_LOGOS) return null;
      return `export const partnerLogoFiles = ${JSON.stringify(readFilenames())};`;
    },
    configureServer(server) {
      server.watcher.add(logosDir);
      const onFs = (file: string) => {
        if (file.startsWith(logosDir)) invalidate(server);
      };
      server.watcher.on("add", onFs);
      server.watcher.on("unlink", onFs);
      server.watcher.on("change", onFs);
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  base: "/fullsite/",
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), partnerLogosVirtualModule(__dirname)],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
