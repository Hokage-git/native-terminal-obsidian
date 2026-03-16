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
