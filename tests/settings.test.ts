import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, normalizeSettings } from "../src/settings";

describe("settings", () => {
  it("exposes the default settings", () => {
    expect(DEFAULT_SETTINGS.shellPath).toBe("");
    expect(DEFAULT_SETTINGS.fontSize).toBe(14);
    expect(DEFAULT_SETTINGS.theme).toBe("auto");
    expect(DEFAULT_SETTINGS.cwdMode).toBe("vault-root");
  });

  it("merges saved settings over defaults", () => {
    const settings = normalizeSettings({
      fontSize: 18,
      theme: "light",
    });

    expect(settings.fontSize).toBe(18);
    expect(settings.theme).toBe("light");
    expect(settings.cwdMode).toBe("vault-root");
  });

  it("forces desktop only behavior to remain enabled", () => {
    const settings = normalizeSettings({
      desktopOnlyNotice: false,
    });

    expect(settings.desktopOnlyNotice).toBe(true);
  });
});
