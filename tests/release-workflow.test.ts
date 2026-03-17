import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("release workflow", () => {
  it("publishes the release assets required by the current packaging flow", () => {
    const workflow = fs.readFileSync(
      path.join(process.cwd(), ".github", "workflows", "release.yml"),
      "utf8",
    );

    const filesBlock =
      workflow.match(/^\s+files:\s*\|\r?\n((?:\s{12}.+\r?\n?)*)/m)?.[1] ?? "";
    const assets = filesBlock
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    expect(assets).toEqual([
      "release/native-terminal/manifest.json",
      "release/native-terminal/main.js",
      "release/native-terminal/styles.css",
      "release/native-terminal/terminal-helper.js",
    ]);
  });
});
