import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("release workflow", () => {
  it("publishes only the packaged zip asset", () => {
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

    expect(assets).toEqual(["release/obsidian-terminal-*.zip"]);
  });
});
