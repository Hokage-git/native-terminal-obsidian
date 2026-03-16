import path from "node:path";
import { Plugin } from "obsidian";
import { DEFAULT_SETTINGS, normalizeSettings, type TerminalPluginSettings } from "./settings";
import { TerminalSettingTab } from "./settings-tab";
import { TerminalView, TERMINAL_VIEW_TYPE } from "./terminal/view";

export function resolvePluginBasePath(options: {
  manifestDir?: string;
  vaultBasePath?: string;
}): string {
  if (!options.manifestDir) {
    return "";
  }

  if (path.isAbsolute(options.manifestDir)) {
    return options.manifestDir;
  }

  if (!options.vaultBasePath) {
    return options.manifestDir;
  }

  return path.resolve(options.vaultBasePath, options.manifestDir);
}

export default class ObsidianTerminalPlugin extends Plugin {
  settings: TerminalPluginSettings = DEFAULT_SETTINGS;

  async onload(): Promise<void> {
    this.settings = normalizeSettings((await this.loadData()) as Partial<TerminalPluginSettings>);

    this.registerView(
      TERMINAL_VIEW_TYPE,
      (leaf) =>
        new TerminalView(leaf, {
          isDesktop: true,
          settings: this.settings,
          getVaultPath: () => {
            const adapter = (this.app as { vault?: { adapter?: { getBasePath?: () => string } } }).vault?.adapter;
            return adapter?.getBasePath?.() ?? "";
          },
          getPluginBasePath: () => {
            const adapter = (this.app as { vault?: { adapter?: { getBasePath?: () => string } } }).vault?.adapter;
            return resolvePluginBasePath({
              manifestDir: this.manifest.dir,
              vaultBasePath: adapter?.getBasePath?.(),
            });
          },
        }),
    );

    this.addCommand({
      id: "open-integrated-terminal",
      name: "Open integrated terminal",
      callback: async () => {
        await this.activateView();
      },
    });

    this.addCommand({
      id: "run-codex",
      name: "Run Codex",
      callback: async () => {
        const view = await this.activateView();
        view?.runCommand("npx codex");
      },
    });

    this.addCommand({
      id: "run-claude",
      name: "Run Claude",
      callback: async () => {
        const view = await this.activateView();
        view?.runCommand("npx claude");
      },
    });

    this.addRibbonIcon("terminal-square", "Open integrated terminal", async () => {
      await this.activateView();
    });

    this.addSettingTab(
      new TerminalSettingTab(this.app, this, {
        settings: this.settings,
        saveSettings: async (settings) => {
          await this.saveSettings(settings);
        },
      }),
    );
  }

  async saveSettings(settings: TerminalPluginSettings = this.settings): Promise<void> {
    this.settings = normalizeSettings(settings);
    await this.saveData(this.settings);
  }

  async activateView(): Promise<TerminalView | null> {
    const workspace = (this.app as {
      workspace: {
        getLeavesOfType: (type: string) => unknown[];
        rootSplit?: unknown;
        getMostRecentLeaf?: (root?: unknown) => unknown | null;
        createLeafBySplit?: (leaf: unknown, direction?: "vertical" | "horizontal", before?: boolean) => { setViewState: (state: { type: string; active: boolean }) => Promise<void> } | Promise<{ setViewState: (state: { type: string; active: boolean }) => Promise<void> }>;
        getLeaf?: (newLeaf?: "split" | boolean, direction?: "vertical" | "horizontal") => { setViewState: (state: { type: string; active: boolean }) => Promise<void> } | Promise<{ setViewState: (state: { type: string; active: boolean }) => Promise<void> }>;
        revealLeaf: (leaf: unknown) => Promise<void> | void;
      };
    }).workspace;

    const leaves = workspace.getLeavesOfType(TERMINAL_VIEW_TYPE);
    const leaf = leaves[0] ?? (await this.createBottomLeaf(workspace));

    await leaf.setViewState({
      type: TERMINAL_VIEW_TYPE,
      active: true,
    });

    await workspace.revealLeaf(leaf);
    return (leaf as { view?: TerminalView | null }).view ?? null;
  }

  private async createBottomLeaf(workspace: {
    rootSplit?: unknown;
    getMostRecentLeaf?: (root?: unknown) => unknown | null;
    createLeafBySplit?: (leaf: unknown, direction?: "vertical" | "horizontal", before?: boolean) => { setViewState: (state: { type: string; active: boolean }) => Promise<void> } | Promise<{ setViewState: (state: { type: string; active: boolean }) => Promise<void> }>;
    getLeaf?: (newLeaf?: "split" | boolean, direction?: "vertical" | "horizontal") => { setViewState: (state: { type: string; active: boolean }) => Promise<void> } | Promise<{ setViewState: (state: { type: string; active: boolean }) => Promise<void> }>;
  }): Promise<{ setViewState: (state: { type: string; active: boolean }) => Promise<void> }> {
    const rootLeaf = workspace.getMostRecentLeaf?.(workspace.rootSplit);
    if (rootLeaf && workspace.createLeafBySplit) {
      return await workspace.createLeafBySplit(rootLeaf, "horizontal");
    }

    if (workspace.getLeaf) {
      return await workspace.getLeaf("split", "horizontal");
    }

    throw new Error("Obsidian workspace API does not support bottom terminal placement.");
  }
}
