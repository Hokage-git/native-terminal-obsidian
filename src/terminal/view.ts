import { ItemView, type WorkspaceLeaf } from "obsidian";
import type { TerminalPluginSettings } from "../settings";
import { commandExistsOnPath, resolveShellCommand } from "./shell";
import { createNodePtyTerminalSession, type TerminalSession } from "./session";
import type { TerminalSessionOptions, TerminalUi, TerminalUiFactory } from "./types";
import { createXtermTerminalUi } from "./xterm-adapter";

export const TERMINAL_VIEW_TYPE = "integrated-terminal-view";

export interface TerminalViewOptions {
  isDesktop: boolean;
  settings: TerminalPluginSettings;
  getVaultPath: () => string;
  getPluginBasePath?: () => string;
  createTerminalUi?: TerminalUiFactory;
  createSession?: (options: Omit<TerminalSessionOptions, "spawn"> & { spawn?: TerminalSessionOptions["spawn"] }) => TerminalSession;
  commandExists?: (command: string) => boolean;
  env?: NodeJS.ProcessEnv;
  platform?: NodeJS.Platform;
}

export class TerminalView extends ItemView {
  private readonly options: TerminalViewOptions;
  private terminalUi: TerminalUi | null = null;
  private session: TerminalSession | null = null;
  private resizeObserver: ResizeObserver | null = null;

  constructor(leaf: WorkspaceLeaf, options: TerminalViewOptions) {
    super(leaf);
    this.options = options;
  }

  getViewType(): string {
    return TERMINAL_VIEW_TYPE;
  }

  getDisplayText(): string {
    return "Integrated Terminal";
  }

  async onOpen(): Promise<void> {
    this.containerEl.innerHTML = "";
    this.containerEl.classList.add("integrated-terminal");

    if (!this.options.isDesktop) {
      this.containerEl.textContent = "Integrated Terminal is available only on desktop.";
      return;
    }

    const frame = document.createElement("div");
    frame.className = "integrated-terminal__frame";
    const host = document.createElement("div");
    host.className = "integrated-terminal__host";
    frame.appendChild(host);
    this.containerEl.appendChild(frame);
    const terminalUi = await (this.options.createTerminalUi ?? (() => createXtermTerminalUi(this.options.settings)))();
    terminalUi.mount(host);

    const shell = this.options.settings.shellPath
      ? { command: this.options.settings.shellPath, args: [] }
      : resolveShellCommand({
          platform: this.options.platform ?? process.platform,
          env: this.options.env ?? process.env,
          commandExists:
            this.options.commandExists ??
            ((command) =>
              commandExistsOnPath({
                command,
                env: this.options.env ?? process.env,
                platform: this.options.platform ?? process.platform,
              })),
        });

    const session = (this.options.createSession ?? createNodePtyTerminalSession)({
      shell,
      cwd: this.options.getVaultPath(),
      baseDir: this.options.getPluginBasePath?.(),
    });

    session.onData((data) => terminalUi.write(data));
    terminalUi.onInput((data) => session.write(data));
    session.start();

    const size = terminalUi.fit();
    session.resize(size.cols, size.rows);
    if (typeof ResizeObserver !== "undefined") {
      this.resizeObserver = new ResizeObserver(() => {
        if (!this.terminalUi || !this.session) {
          return;
        }

        const nextSize = this.terminalUi.fit();
        this.session.resize(nextSize.cols, nextSize.rows);
      });
      this.resizeObserver.observe(host);
    }

    this.terminalUi = terminalUi;
    this.session = session;
  }

  async onClose(): Promise<void> {
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.session?.dispose();
    this.terminalUi?.dispose();
    this.session = null;
    this.terminalUi = null;
    this.containerEl.innerHTML = "";
  }
}
