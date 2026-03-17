import { describe, expect, it } from "vitest";
import manifest from "../manifest.json";

describe("manifest", () => {
  it("uses the plugin folder id expected for manual installation", () => {
    expect(manifest.id).toBe("native-terminal");
  });

  it("points authorUrl to the plugin repository", () => {
    expect(manifest.authorUrl).toBe("https://github.com/Hokage-git/native-terminal-obsidian");
  });
});
