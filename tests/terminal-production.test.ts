import { describe, expect, it, vi } from "vitest";
import { DEFAULT_SETTINGS } from "../src/settings";

describe("production terminal wiring", () => {
  it("uses the default xterm and PTY factories when custom ones are not provided", async () => {
    const terminalUi = {
      mount: vi.fn(),
      write: vi.fn(),
      onInput: vi.fn(),
      fit: vi.fn(() => ({ cols: 90, rows: 25 })),
      dispose: vi.fn(),
    };
    const session = {
      start: vi.fn(),
      onData: vi.fn(() => ({ dispose() {} })),
      write: vi.fn(),
      resize: vi.fn(),
      dispose: vi.fn(),
    };

    vi.doMock("../src/terminal/xterm-adapter", () => ({
      createXtermTerminalUi: vi.fn(() => terminalUi),
    }));
    vi.doMock("../src/terminal/session", async () => {
      const actual = await vi.importActual<typeof import("../src/terminal/session")>("../src/terminal/session");
      return {
        ...actual,
        createNodePtyTerminalSession: vi.fn(() => session),
      };
    });

    const { TerminalView } = await import("../src/terminal/view");
    const { createXtermTerminalUi } = await import("../src/terminal/xterm-adapter");
    const { createNodePtyTerminalSession } = await import("../src/terminal/session");

    const view = new TerminalView({} as never, {
      isDesktop: true,
      settings: DEFAULT_SETTINGS,
      getVaultPath: () => "/vault",
      getPluginBasePath: () => "/plugin",
    });

    await view.onOpen();

    expect(createXtermTerminalUi).toHaveBeenCalledWith(DEFAULT_SETTINGS);
    expect(createNodePtyTerminalSession).toHaveBeenCalledWith(
      expect.objectContaining({
        cwd: "/vault",
        baseDir: "/plugin",
      }),
    );
    expect(session.start).toHaveBeenCalled();

    vi.resetModules();
  });
});
