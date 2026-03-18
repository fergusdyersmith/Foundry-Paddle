import { cpSync, mkdirSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const fullsiteDist = join(root, "fullsite", "dist");
const target = join(root, "dist", "fullsite");

if (!existsSync(fullsiteDist)) {
  console.error("fullsite/dist not found. Run: cd fullsite && npm run build");
  process.exit(1);
}
mkdirSync(target, { recursive: true });
cpSync(fullsiteDist, target, { recursive: true });
console.log("Copied fullsite/dist -> dist/fullsite");
