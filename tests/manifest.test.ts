import { describe, expect, it } from "vitest";
import manifest from "../manifest.json";

describe("manifest", () => {
  it("uses the plugin folder id expected for manual installation", () => {
    expect(manifest.id).toBe("obsidian-terminal");
  });
});
