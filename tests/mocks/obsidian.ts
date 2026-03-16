export class ItemView {
  leaf: unknown;
  containerEl: HTMLDivElement;

  constructor(leaf: unknown) {
    this.leaf = leaf;
    this.containerEl = document.createElement("div");
  }
}

export class Plugin {
  app: unknown;
  manifest: unknown;

  constructor(app: unknown, manifest?: unknown) {
    this.app = app;
    this.manifest = manifest;
  }

  addCommand(): void {}
  addRibbonIcon(): HTMLElement {
    return document.createElement("div");
  }
  registerView(): void {}
  registerExtensions(): void {}
  addSettingTab(): void {}
  async loadData(): Promise<unknown> {
    return {};
  }
  async saveData(): Promise<void> {}
}

export class PluginSettingTab {
  app: unknown;
  plugin: unknown;
  containerEl: HTMLDivElement;

  constructor(app: unknown, plugin: unknown) {
    this.app = app;
    this.plugin = plugin;
    this.containerEl = document.createElement("div");
  }
}

export class Setting {
  settingEl: HTMLDivElement;

  constructor(containerEl: HTMLElement) {
    this.settingEl = document.createElement("div");
    containerEl.appendChild(this.settingEl);
  }

  setName(): this {
    return this;
  }

  setDesc(): this {
    return this;
  }

  addText(callback: (component: { setPlaceholder: (value: string) => unknown; setValue: (value: string) => unknown; onChange: (handler: (value: string) => unknown) => unknown; inputEl: HTMLInputElement }) => unknown): this {
    const inputEl = document.createElement("input");
    this.settingEl.appendChild(inputEl);
    callback({
      inputEl,
      setPlaceholder: (value: string) => {
        inputEl.placeholder = value;
        return undefined;
      },
      setValue: (value: string) => {
        inputEl.value = value;
        return undefined;
      },
      onChange: (handler: (value: string) => unknown) => {
        inputEl.addEventListener("input", () => {
          handler(inputEl.value);
        });
        return undefined;
      },
    });
    return this;
  }

  addSlider(callback: (component: { setLimits: (min: number, max: number, step: number) => unknown; setValue: (value: number) => unknown; setDynamicTooltip: () => unknown; onChange: (handler: (value: number) => unknown) => unknown; sliderEl: HTMLInputElement }) => unknown): this {
    const sliderEl = document.createElement("input");
    sliderEl.type = "range";
    this.settingEl.appendChild(sliderEl);
    callback({
      sliderEl,
      setLimits: (min: number, max: number, step: number) => {
        sliderEl.min = String(min);
        sliderEl.max = String(max);
        sliderEl.step = String(step);
        return undefined;
      },
      setValue: (value: number) => {
        sliderEl.value = String(value);
        return undefined;
      },
      setDynamicTooltip: () => undefined,
      onChange: (handler: (value: number) => unknown) => {
        sliderEl.addEventListener("input", () => {
          handler(Number(sliderEl.value));
        });
        return undefined;
      },
    });
    return this;
  }
}

export interface WorkspaceLeaf {}
