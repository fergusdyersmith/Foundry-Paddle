import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { existsSync } from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(__dirname, "dist");
const launchDir = path.join(dist, "launch");
const indexHtml = path.join(dist, "index.html");
const launchIndex = path.join(launchDir, "index.html");

const app = express();

// Legacy URLs: /fullsite and /fullsite/* -> / and /*
app.use((req, res, next) => {
  const p = req.path;
  if (!p.startsWith("/fullsite")) return next();
  const after = p === "/fullsite" ? "" : p.slice("/fullsite".length);
  const pathOnly =
    after === "" || after === "/" ? "/" : after.startsWith("/") ? after : `/${after}`;
  const qs = req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : "";
  res.redirect(301, pathOnly + qs);
});

// Serves fullsite at / (e.g. /assets/...) and holding files under /launch/...
app.use(express.static(dist, { index: false }));

function sendLaunchSpa(res) {
  if (!existsSync(launchIndex)) {
    console.error("Holding page not built: missing dist/launch/index.html (run npm run build:railway)");
    return res
      .status(503)
      .type("text/plain")
      .send("Holding page not deployed. Ensure build command is: npm run build:railway");
  }
  res.sendFile(launchIndex);
}

// Holding SPA: /launch and client routes under /launch/*
app.get(/^\/launch(\/.*)?$/, (req, res, next) => {
  if (path.extname(req.path)) {
    return res.status(404).type("text/plain").send("Not found");
  }
  sendLaunchSpa(res);
});

// Main site SPA fallback
app.get("*", (req, res) => {
  if (path.extname(req.path)) {
    return res.status(404).type("text/plain").send("Not found");
  }
  if (!existsSync(indexHtml)) {
    console.error("Main site not built: missing dist/index.html (run npm run build:railway)");
    return res
      .status(503)
      .type("text/plain")
      .send("Main site not deployed. Ensure build command is: npm run build:railway");
  }
  res.sendFile(indexHtml);
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Serving at http://localhost:${port}`);
  console.log(`  /         -> full marketing site`);
  console.log(`  /launch   -> holding / launch page`);
});
