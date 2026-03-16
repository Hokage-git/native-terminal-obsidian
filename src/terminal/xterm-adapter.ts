import type { TerminalPluginSettings } from "../settings";
import type { TerminalUi } from "./types";

export function sanitizeTerminalOutput(data: string): string {
  return data.replace(/\u0007\\/g, "\u0007");
}

export function mapTerminalKeyEvent(
  event: KeyboardEvent,
  platform: NodeJS.Platform = process.platform,
): { action: "copy" | "paste" | "pass" } | { action: "send"; data: string } {
  const key = event.key.toLowerCase();
  const isAccel = event.ctrlKey || event.metaKey;

  if (isAccel && event.shiftKey && key === "c") {
    return { action: "copy" };
  }

  if (isAccel && event.shiftKey && key === "v") {
    return { action: "paste" };
  }

  if (event.altKey && key === "backspace") {
    return {
      action: "send",
      data: platform === "win32" ? "\u001b\b" : "\u001b\u007f",
    };
  }

  return { action: "pass" };
}

export function getWheelScrollAmount(deltaY: number): number {
  if (deltaY === 0) {
    return 0;
  }

  return Math.sign(deltaY) * 3;
}

function getCssColor(variableName: string, fallback: string): string {
  if (typeof document === "undefined") {
    return fallback;
  }

  const styles = getComputedStyle(document.documentElement);
  const value = styles.getPropertyValue(variableName).trim();
  return value || fallback;
}

export function getTerminalTheme(theme: TerminalPluginSettings["theme"]) {
  if (theme === "dark") {
    return {
      background: "#111827",
      foreground: "#e5e7eb",
      cursor: "#e5e7eb",
      cursorAccent: "#111827",
      selectionBackground: "rgba(96, 165, 250, 0.28)",
      selectionInactiveBackground: "rgba(71, 85, 105, 0.35)",
    };
  }

  if (theme === "light") {
    return {
      background: "#f5f5f5",
      foreground: "#1f2933",
      cursor: "#2563eb",
      cursorAccent: "#f5f5f5",
      selectionBackground: "rgba(37, 99, 235, 0.22)",
      selectionInactiveBackground: "rgba(148, 163, 184, 0.28)",
    };
  }

  return {
    background: getCssColor("--background-primary", "#111827"),
    foreground: getCssColor("--text-normal", "#e5e7eb"),
    cursor: getCssColor("--interactive-accent", "#e5e7eb"),
    cursorAccent: getCssColor("--background-primary", "#111827"),
    selectionBackground: getCssColor("--text-selection", "rgba(96, 165, 250, 0.28)"),
    selectionInactiveBackground: getCssColor("--background-modifier-hover", "rgba(71, 85, 105, 0.35)"),
  };
}

interface ClipboardAccess {
  readText?: () => Promise<string> | string;
  writeText?: (text: string) => Promise<void> | void;
}

export function getElectronClipboard(
  requireFn: (id: string) => unknown = require,
): ClipboardAccess | undefined {
  try {
    const electronModule = requireFn("electron") as {
      clipboard?: ClipboardAccess;
    };
    return electronModule.clipboard;
  } catch {
    return undefined;
  }
}

export async function writeClipboardText(
  text: string,
  options: {
    electronClipboard?: ClipboardAccess;
    navigatorClipboard?: ClipboardAccess;
  } = {},
): Promise<void> {
  const electronClipboard = options.electronClipboard ?? getElectronClipboard();
  if (electronClipboard?.writeText) {
    await electronClipboard.writeText(text);
    return;
  }

  const navigatorClipboard =
    options.navigatorClipboard ??
    (typeof navigator !== "undefined" ? (navigator.clipboard as ClipboardAccess | undefined) : undefined);
  if (navigatorClipboard?.writeText) {
    await navigatorClipboard.writeText(text);
  }
}

export async function readClipboardText(
  options: {
    electronClipboard?: ClipboardAccess;
    navigatorClipboard?: ClipboardAccess;
  } = {},
): Promise<string> {
  const electronClipboard = options.electronClipboard ?? getElectronClipboard();
  if (electronClipboard?.readText) {
    return String(await electronClipboard.readText());
  }

  const navigatorClipboard =
    options.navigatorClipboard ??
    (typeof navigator !== "undefined" ? (navigator.clipboard as ClipboardAccess | undefined) : undefined);
  if (navigatorClipboard?.readText) {
    return String(await navigatorClipboard.readText());
  }

  return "";
}

export async function createXtermTerminalUi(settings: TerminalPluginSettings): Promise<TerminalUi> {
  const [{ Terminal }, { FitAddon }] = await Promise.all([
    import("xterm"),
    import("@xterm/addon-fit"),
  ]);
  let inputListener: ((data: string) => void) | null = null;
  let themeObserver: MutationObserver | null = null;
  const terminal = new Terminal({
    fontSize: settings.fontSize,
    fontFamily: '"Cascadia Code", Consolas, "Courier New", monospace',
    theme: getTerminalTheme(settings.theme),
    altClickMovesCursor: false,
    cursorBlink: true,
    convertEol: true,
    logLevel: "off",
    allowTransparency: false,
    rightClickSelectsWord: true,
    scrollback: 5000,
  });
  const fitAddon = new FitAddon();
  terminal.loadAddon(fitAddon);

  return {
    mount(element) {
      terminal.open(element);
      if (settings.theme === "auto" && typeof MutationObserver !== "undefined") {
        const refreshTheme = () => {
          terminal.options.theme = getTerminalTheme("auto");
          terminal.refresh(0, terminal.rows - 1);
        };
        themeObserver = new MutationObserver(refreshTheme);
        themeObserver.observe(document.documentElement, {
          attributes: true,
          attributeFilter: ["class", "style", "data-theme"],
        });
      }
      terminal.attachCustomKeyEventHandler((event) => {
        if (event.type === "keydown") {
          const mappedEvent = mapTerminalKeyEvent(event);

          if (mappedEvent.action === "copy" && terminal.hasSelection()) {
            void writeClipboardText(terminal.getSelection());
            event.preventDefault();
            return false;
          }

          if (mappedEvent.action === "paste") {
            void readClipboardText().then((text) => {
              if (text) {
                terminal.paste(text);
              }
            });
            event.preventDefault();
            return false;
          }

          if (mappedEvent.action === "send") {
            inputListener?.(mappedEvent.data);
            event.preventDefault();
            return false;
          }
        }

        return true;
      });
      element.addEventListener("copy", (event) => {
        if (!terminal.hasSelection()) {
          return;
        }

        event.preventDefault();
        event.clipboardData?.setData("text/plain", terminal.getSelection());
        void writeClipboardText(terminal.getSelection());
      });
      element.addEventListener("paste", (event) => {
        const text = event.clipboardData?.getData("text/plain");
        if (!text) {
          event.preventDefault();
          void readClipboardText().then((clipboardText) => {
            if (clipboardText) {
              terminal.paste(clipboardText);
            }
          });
          return;
        }

        event.preventDefault();
        terminal.paste(text);
      });
      element.addEventListener(
        "wheel",
        (event) => {
          const amount = getWheelScrollAmount(event.deltaY);
          if (amount === 0) {
            return;
          }

          terminal.scrollLines(amount);
          event.preventDefault();
          event.stopPropagation();
        },
        { passive: false },
      );
      fitAddon.fit();
      requestAnimationFrame(() => {
        fitAddon.fit();
        terminal.refresh(0, terminal.rows - 1);
      });
      terminal.focus();
    },
    write(data) {
      terminal.write(sanitizeTerminalOutput(data));
    },
    onInput(listener) {
      inputListener = listener;
      terminal.onData(listener);
    },
    fit() {
      fitAddon.fit();
      return {
        cols: terminal.cols,
        rows: terminal.rows,
      };
    },
    dispose() {
      themeObserver?.disconnect();
      themeObserver = null;
      terminal.dispose();
    },
  };
}
