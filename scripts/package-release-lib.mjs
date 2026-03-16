import fs from "node:fs";
import path from "node:path";

export function getReleaseEntries(rootDir) {
  return [
    { source: path.join(rootDir, "manifest.json"), target: "manifest.json", type: "file" },
    { source: path.join(rootDir, "dist", "main.js"), target: "main.js", type: "file" },
    { source: path.join(rootDir, "dist", "terminal-helper.js"), target: "terminal-helper.js", type: "file" },
    { source: path.join(rootDir, "styles.css"), target: "styles.css", type: "file" },
    {
      source: path.join(rootDir, "node_modules", "node-pty", "package.json"),
      target: path.join("node_modules", "node-pty", "package.json"),
      type: "file",
    },
    {
      source: path.join(rootDir, "node_modules", "node-pty", "lib"),
      target: path.join("node_modules", "node-pty", "lib"),
      type: "directory",
    },
    {
      source: path.join(rootDir, "node_modules", "node-pty", "prebuilds"),
      target: path.join("node_modules", "node-pty", "prebuilds"),
      type: "directory",
    },
  ];
}

export function copyReleaseEntries(entries, pluginDir) {
  for (const entry of entries) {
    if (!fs.existsSync(entry.source)) {
      throw new Error(`Missing release entry: ${entry.source}`);
    }

    const destination = path.join(pluginDir, entry.target);
    fs.mkdirSync(path.dirname(destination), { recursive: true });

    if (entry.type === "directory") {
      fs.cpSync(entry.source, destination, {
        recursive: true,
        filter(source) {
          return !source.toLowerCase().endsWith(".pdb");
        },
      });
      continue;
    }

    fs.copyFileSync(entry.source, destination);
  }
}
