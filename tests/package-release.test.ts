import path from "node:path";
import { describe, expect, it } from "vitest";
import { getReleaseEntries } from "../scripts/package-release-lib.mjs";

describe("getReleaseEntries", () => {
  it("includes the runtime subset required by the terminal helper", () => {
    const rootDir = "C:/vault/.obsidian/plugins/obsidian-terminal";

    expect(getReleaseEntries(rootDir)).toEqual(
      expect.arrayContaining([
        {
          source: path.join(rootDir, "manifest.json"),
          target: "manifest.json",
          type: "file",
        },
        {
          source: path.join(rootDir, "dist", "main.js"),
          target: "main.js",
          type: "file",
        },
        {
          source: path.join(rootDir, "dist", "terminal-helper.js"),
          target: "terminal-helper.js",
          type: "file",
        },
        {
          source: path.join(rootDir, "styles.css"),
          target: "styles.css",
          type: "file",
        },
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
      ]),
    );
  });
});
