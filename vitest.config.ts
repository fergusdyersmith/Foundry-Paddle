import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    // server/** holds the Express-side tests (the chatbot trust boundary); they opt into the
    // node environment with a `@vitest-environment node` docblock.
    include: [
      "src/**/*.{test,spec}.{ts,tsx}",
      "server/**/*.{test,spec}.{js,ts}",
      // Sync scripts carry real logic (what the phone agent is allowed to say),
      // so their tests have to run with everything else rather than by hand.
      "scripts/**/*.{test,spec}.{js,mjs}",
    ],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@shared": path.resolve(__dirname, "./shared"),
    },
  },
});
