import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const rootDir = process.cwd();
const manifestPath = path.join(rootDir, "manifest.json");
const distDir = path.join(rootDir, "dist");
const releaseRoot = path.join(rootDir, "release");
const pluginDir = path.join(releaseRoot, "obsidian-terminal");

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const version = String(manifest.version);
const zipPath = path.join(releaseRoot, `obsidian-terminal-${version}.zip`);

const releaseFiles = [
  { source: manifestPath, target: "manifest.json" },
  { source: path.join(distDir, "main.js"), target: "main.js" },
  { source: path.join(distDir, "terminal-helper.js"), target: "terminal-helper.js" },
  { source: path.join(rootDir, "styles.css"), target: "styles.css" },
];

fs.rmSync(pluginDir, { recursive: true, force: true });
fs.mkdirSync(pluginDir, { recursive: true });

for (const file of releaseFiles) {
  if (!fs.existsSync(file.source)) {
    throw new Error(`Missing release file: ${file.source}`);
  }

  fs.copyFileSync(file.source, path.join(pluginDir, file.target));
}

fs.rmSync(zipPath, { force: true });
execFileSync(
  "powershell",
  [
    "-NoProfile",
    "-Command",
    `Compress-Archive -Path '${pluginDir.replace(/'/g, "''")}\\*' -DestinationPath '${zipPath.replace(/'/g, "''")}' -Force`,
  ],
  {
    stdio: "inherit",
  },
);

console.log(`Release package created: ${zipPath}`);
