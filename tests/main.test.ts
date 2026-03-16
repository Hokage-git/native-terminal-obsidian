import { describe, expect, it, vi } from "vitest";
import { DEFAULT_SETTINGS } from "../src/settings";
import ObsidianTerminalPlugin, { resolvePluginBasePath } from "../src/main";
import { TERMINAL_VIEW_TYPE } from "../src/terminal/view";

function createApp() {
  const leaves: Array<{ view: { getViewType(): string } | null }> = [];

  return {
    workspace: {
      getLeavesOfType: vi.fn((type: string) =>
        leaves.filter((leaf) => leaf.view?.getViewType() === type),
      ),
      getRightLeaf: vi.fn(() => {
        const leaf = {
          view: null as { getViewType(): string } | null,
          async setViewState(state: { type: string; active: boolean }) {
            this.view = {
              getViewType: () => state.type,
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

    expect(app.workspace.getRightLeaf).toHaveBeenCalled();
    expect(app.workspace.revealLeaf).toHaveBeenCalled();
  });
});
