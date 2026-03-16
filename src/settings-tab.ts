import { PluginSettingTab, Setting } from "obsidian";
import type { TerminalPluginSettings } from "./settings";

export interface TerminalSettingTabOptions {
  settings: TerminalPluginSettings;
  saveSettings: (settings: TerminalPluginSettings) => Promise<void>;
}

export class TerminalSettingTab extends PluginSettingTab {
  private readonly options: TerminalSettingTabOptions;

  constructor(app: unknown, plugin: unknown, options: TerminalSettingTabOptions) {
    super(app, plugin);
    this.options = options;
  }

  display(): void {
    this.containerEl.innerHTML = "";

    new Setting(this.containerEl)
      .setName("Shell path")
      .setDesc("Optional explicit shell executable.")
      .addText((text) => {
        text.setPlaceholder("Use detected shell");
        text.setValue(this.options.settings.shellPath);
        text.onChange(async (value) => {
          this.options.settings.shellPath = value;
          await this.options.saveSettings(this.options.settings);
        });
      });

    const themeSetting = document.createElement("div");
    themeSetting.className = "setting-item";
    const themeInfo = document.createElement("div");
    themeInfo.className = "setting-item-info";
    const themeName = document.createElement("div");
    themeName.className = "setting-item-name";
    themeName.textContent = "Theme";
    const themeDesc = document.createElement("div");
    themeDesc.className = "setting-item-description";
    themeDesc.textContent = "Use the current Obsidian theme automatically or force a terminal palette.";
    themeInfo.append(themeName, themeDesc);
    const themeControl = document.createElement("div");
    themeControl.className = "setting-item-control";
    const themeSelect = document.createElement("select");
    themeSelect.add(new Option("Auto", "auto"));
    themeSelect.add(new Option("Dark", "dark"));
    themeSelect.add(new Option("Light", "light"));
    themeSelect.value = this.options.settings.theme;
    themeSelect.addEventListener("change", async () => {
      this.options.settings.theme = themeSelect.value as TerminalPluginSettings["theme"];
      await this.options.saveSettings(this.options.settings);
    });
    themeControl.appendChild(themeSelect);
    themeSetting.append(themeInfo, themeControl);
    this.containerEl.appendChild(themeSetting);

    new Setting(this.containerEl)
      .setName("Font size")
      .setDesc("Terminal font size in pixels.")
      .addSlider((slider) => {
        slider.setLimits(10, 24, 1);
        slider.setValue(this.options.settings.fontSize);
        slider.setDynamicTooltip();
        slider.onChange(async (value) => {
          this.options.settings.fontSize = value;
          await this.options.saveSettings(this.options.settings);
        });
      });
  }
}
