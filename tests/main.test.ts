import { describe, expect, it, vi } from "vitest";
import { DEFAULT_SETTINGS } from "../src/settings";
import ObsidianTerminalPlugin, { resolvePluginBasePath } from "../src/main";
import { TERMINAL_VIEW_TYPE } from "../src/terminal/view";

function createApp() {
  const leaves: Array<{ view: { getViewType(): string; runCommand?: ReturnType<typeof vi.fn> } | null }> = [];
  const rootLeaf = {
    view: {
      getViewType: () => "markdown",
    },
  };

  return {
    rootLeaf,
    workspace: {
      getLeavesOfType: vi.fn((type: string) =>
        leaves.filter((leaf) => leaf.view?.getViewType() === type),
      ),
      rootSplit: {},
      getMostRecentLeaf: vi.fn(() => rootLeaf),
      createLeafBySplit: vi.fn(() => {
        const leaf = {
          view: null as { getViewType(): string } | null,
          async setViewState(state: { type: string; active: boolean }) {
            this.view = {
              getViewType: () => state.type,
              runCommand: vi.fn(),
            };
          },
        };
        leaves.push(leaf);
        return leaf;
      }),
      revealLeaf: vi.fn(),
    },
    vault: {
      adapter: {
        getBasePath: () => "/vault",
      },
    },
  };
}

describe("ObsidianTerminalPlugin", () => {
  it("resolves the plugin base path from a relative manifest dir", () => {
    expect(
      resolvePluginBasePath({
        manifestDir: ".obsidian/plugins/obsidian-terminal",
        vaultBasePath: "C:/Users/Макс/Documents/UMKA",
      }),
    ).toMatch(/UMKA[\\/]+\.obsidian[\\/]+plugins[\\/]+obsidian-terminal$/);
  });

  it("loads settings and registers the terminal view on startup", async () => {
    const app = createApp();
    const plugin = new ObsidianTerminalPlugin(app as never, { dir: "/plugin" } as never);
    const registerView = vi.spyOn(plugin, "registerView");
    vi.spyOn(plugin, "loadData").mockResolvedValue({ fontSize: 18 });

    await plugin.onload();

    expect(plugin.settings).toEqual(
      expect.objectContaining({
        ...DEFAULT_SETTINGS,
        fontSize: 18,
      }),
    );
    expect(registerView).toHaveBeenCalledWith(TERMINAL_VIEW_TYPE, expect.any(Function));
  });

  it("adds a command and ribbon action that open the terminal view", async () => {
    const app = createApp();
    const plugin = new ObsidianTerminalPlugin(app as never, { dir: "/plugin" } as never);
    const addCommand = vi.spyOn(plugin, "addCommand");
    const addRibbonIcon = vi.spyOn(plugin, "addRibbonIcon");
    vi.spyOn(plugin, "loadData").mockResolvedValue({});

    await plugin.onload();

    expect(addCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "open-integrated-terminal",
      }),
    );
    expect(addRibbonIcon).toHaveBeenCalled();

    const command = addCommand.mock.calls[0]?.[0];
    await command.callback();

    expect(app.workspace.createLeafBySplit).toHaveBeenCalledWith(app.rootLeaf, "horizontal");
    expect(app.workspace.revealLeaf).toHaveBeenCalled();
  });

  it("adds commands that run codex and claude in the terminal", async () => {
    const app = createApp();
    const plugin = new ObsidianTerminalPlugin(app as never, { dir: "/plugin" } as never);
    const addCommand = vi.spyOn(plugin, "addCommand");
    vi.spyOn(plugin, "loadData").mockResolvedValue({});

    await plugin.onload();

    const codexCommand = addCommand.mock.calls.find((call) => call[0].id === "run-codex")?.[0];
    const claudeCommand = addCommand.mock.calls.find((call) => call[0].id === "run-claude")?.[0];

    expect(codexCommand).toBeDefined();
    expect(claudeCommand).toBeDefined();

    await codexCommand?.callback();
    const terminalLeaf = app.workspace.getLeavesOfType(TERMINAL_VIEW_TYPE)[0] as {
      view: { runCommand: ReturnType<typeof vi.fn> };
    };
    expect(terminalLeaf.view.runCommand).toHaveBeenCalledWith("npx codex");

    await claudeCommand?.callback();
    expect(terminalLeaf.view.runCommand).toHaveBeenCalledWith("npx claude");
  });
});
