import { describe, expect, it, vi } from "vitest";
import {
  readClipboardText,
  writeClipboardText,
} from "../src/terminal/xterm-adapter";

describe("xterm clipboard helpers", () => {
  it("prefers Electron clipboard for writes", async () => {
    const electronClipboard = {
      writeText: vi.fn(),
    };
    const navigatorClipboard = {
      writeText: vi.fn(),
    };

    await writeClipboardText("codex", {
      electronClipboard,
      navigatorClipboard,
    });

    expect(electronClipboard.writeText).toHaveBeenCalledWith("codex");
    expect(navigatorClipboard.writeText).not.toHaveBeenCalled();
  });

  it("falls back to navigator clipboard for writes", async () => {
    const navigatorClipboard = {
      writeText: vi.fn().mockResolvedValue(undefined),
    };

    await writeClipboardText("claude", {
      navigatorClipboard,
    });

    expect(navigatorClipboard.writeText).toHaveBeenCalledWith("claude");
  });

  it("prefers Electron clipboard for reads", async () => {
    const electronClipboard = {
      readText: vi.fn(() => "from-electron"),
    };
    const navigatorClipboard = {
      readText: vi.fn().mockResolvedValue("from-browser"),
    };

    await expect(
      readClipboardText({
        electronClipboard,
        navigatorClipboard,
      }),
    ).resolves.toBe("from-electron");
    expect(navigatorClipboard.readText).not.toHaveBeenCalled();
  });

  it("falls back to navigator clipboard for reads", async () => {
    const navigatorClipboard = {
      readText: vi.fn().mockResolvedValue("from-browser"),
    };

    await expect(
      readClipboardText({
        navigatorClipboard,
      }),
    ).resolves.toBe("from-browser");
  });
});
