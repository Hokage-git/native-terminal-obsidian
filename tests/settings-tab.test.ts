import { describe, expect, it, vi } from "vitest";
import { DEFAULT_SETTINGS } from "../src/settings";
import { TerminalSettingTab } from "../src/settings-tab";
import { Plugin } from "obsidian";

describe("TerminalSettingTab", () => {
  it("renders controls for shell path, theme, and font size", () => {
    const plugin = new Plugin({} as never, {} as never);
    const tab = new TerminalSettingTab(
      {} as never,
      plugin,
      {
        settings: DEFAULT_SETTINGS,
        saveSettings: vi.fn(),
      },
    );

    tab.display();

    const inputs = tab.containerEl.querySelectorAll("input");
    const selects = tab.containerEl.querySelectorAll("select");
    expect(inputs).toHaveLength(2);
    expect(selects).toHaveLength(1);
    expect((inputs[0] as HTMLInputElement).value).toBe("");
    expect((selects[0] as HTMLSelectElement).value).toBe("auto");
    expect((inputs[1] as HTMLInputElement).value).toBe("14");
  });

  it("updates settings when controls change", async () => {
    const plugin = new Plugin({} as never, {} as never);
    const saveSettings = vi.fn(async () => {});
    const tab = new TerminalSettingTab(
      {} as never,
      plugin,
      {
        settings: DEFAULT_SETTINGS,
        saveSettings,
      },
    );

    tab.display();

    const [shellInput, fontSizeInput] = Array.from(tab.containerEl.querySelectorAll("input")) as HTMLInputElement[];
    const themeSelect = tab.containerEl.querySelector("select") as HTMLSelectElement;
    shellInput.value = "/bin/zsh";
    shellInput.dispatchEvent(new Event("input"));
    themeSelect.value = "light";
    themeSelect.dispatchEvent(new Event("change"));
    fontSizeInput.value = "18";
    fontSizeInput.dispatchEvent(new Event("input"));

    expect(saveSettings).toHaveBeenCalledWith(
      expect.objectContaining({
        shellPath: "/bin/zsh",
      }),
    );
    expect(saveSettings).toHaveBeenCalledWith(
      expect.objectContaining({
        theme: "light",
      }),
    );
    expect(saveSettings).toHaveBeenCalledWith(
      expect.objectContaining({
        fontSize: 18,
      }),
    );
  });

  it("keeps a real plugin instance as the base PluginSettingTab owner", () => {
    const plugin = new Plugin({} as never, {} as never);
    const tab = new TerminalSettingTab(
      {} as never,
      plugin,
      {
        settings: DEFAULT_SETTINGS,
        saveSettings: vi.fn(),
      },
    );

    expect(tab.plugin).toBe(plugin);
  });
});
