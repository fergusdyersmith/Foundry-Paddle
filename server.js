import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { existsSync } from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(__dirname, "dist");
const fullsiteDir = path.join(dist, "fullsite");
const fullsiteIndex = path.join(fullsiteDir, "index.html");

const app = express();

// Fullsite SPA: serve static assets under /fullsite first
app.use("/fullsite", express.static(fullsiteDir, { index: false }));
// Root app and root static assets
app.use(express.static(dist, { index: false }));

// SPA fallback: /fullsite and /fullsite/... -> fullsite index
app.get(/^\/fullsite\/?.*/, (_req, res) => {
  if (!existsSync(fullsiteIndex)) {
    console.error("fullsite not built: missing dist/fullsite/index.html (use build:railway)");
    return res.status(503).send("Full site not deployed. Ensure build command is: npm run build:railway");
  }
  res.sendFile(fullsiteIndex);
});
// Root SPA fallback
app.get("*", (_req, res) => {
  res.sendFile(path.join(dist, "index.html"));
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Serving at http://localhost:${port}`);
  console.log(`  /         -> landing`);
  console.log(`  /fullsite -> full site preview`);
});
