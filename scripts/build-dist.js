import { cpSync, existsSync, mkdirSync, rmSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const dist = join(root, "dist");
const fullsiteRoot = join(root, "fullsite");
const fullsiteDist = join(fullsiteRoot, "dist");
const holdingTemp = join(root, ".temp-holding-build");
const launchTarget = join(dist, "launch");

function run(cmd, args, cwd = root) {
  const result = spawnSync(cmd, args, { cwd, stdio: "inherit", shell: false });
  const code = result.status ?? 1;
  if (code !== 0) {
    console.error(`Command failed: ${cmd} ${args.join(" ")} (exit ${code})`);
    process.exit(code);
  }
}

console.log("Installing fullsite dependencies (npm ci)…");
run("npm", ["ci"], fullsiteRoot);

console.log("Building fullsite…");
run("npm", ["run", "build"], fullsiteRoot);

if (existsSync(dist)) rmSync(dist, { recursive: true });
mkdirSync(dist, { recursive: true });

if (!existsSync(fullsiteDist)) {
  console.error("fullsite/dist missing after build.");
  process.exit(1);
}
cpSync(fullsiteDist, dist, { recursive: true });
console.log("Copied fullsite/dist -> dist/");

if (existsSync(holdingTemp)) rmSync(holdingTemp, { recursive: true });

console.log("Building holding page for /launch…");
run("npx", ["vite", "build", "--base", "/launch/", "--outDir", holdingTemp], root);

const holdingIndex = join(holdingTemp, "index.html");
if (!existsSync(holdingIndex)) {
  console.error(`${holdingTemp}/index.html missing after vite build.`);
  process.exit(1);
}
mkdirSync(launchTarget, { recursive: true });
cpSync(holdingTemp, launchTarget, { recursive: true });
rmSync(holdingTemp, { recursive: true });
console.log("Copied holding build -> dist/launch/");

console.log("dist/ ready for production.");
