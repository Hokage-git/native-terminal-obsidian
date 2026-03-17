import { describe, expect, it } from "vitest";
import { resolvePluginBasePath } from "../src/main";

describe("resolvePluginBasePath", () => {
  it("resolves a relative manifest dir against the vault base path", () => {
    const result = resolvePluginBasePath({
      manifestDir: ".obsidian/plugins/native-terminal",
      vaultBasePath: "C:/Users/Макс/Documents/UMKA",
    });

    expect(result).toMatch(/UMKA[\\/]+\.obsidian[\\/]+plugins[\\/]+native-terminal$/);
  });

  it("returns an absolute manifest dir unchanged", () => {
    const result = resolvePluginBasePath({
      manifestDir: "C:/Users/Макс/Documents/UMKA/.obsidian/plugins/native-terminal",
      vaultBasePath: "C:/Users/Макс/Documents/UMKA",
    });

    expect(result).toBe("C:/Users/Макс/Documents/UMKA/.obsidian/plugins/native-terminal");
  });
});
