import { ItemView, type WorkspaceLeaf } from "obsidian";
import type { TerminalPluginSettings } from "../settings";
import { commandExistsOnPath, resolveShellCommand } from "./shell";
import { createNodePtyTerminalSession, type TerminalSession } from "./session";
import type { TerminalSessionOptions, TerminalUi, TerminalUiFactory } from "./types";
import { createXtermTerminalUi } from "./xterm-adapter";

export const TERMINAL_VIEW_TYPE = "integrated-terminal-view";

type TerminalSlotId = "A" | "B";
type TerminalSlotStatus = "starting" | "running" | "exited" | "error";

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

interface TerminalSlot {
  id: TerminalSlotId;
  ui: TerminalUi;
  session: TerminalSession;
  hostEl: HTMLDivElement;
  statusEl: HTMLSpanElement;
  state: {
    status: TerminalSlotStatus;
    detail: string;
  };
}

export class TerminalView extends ItemView {
  private readonly options: TerminalViewOptions;
  private readonly slots = new Map<TerminalSlotId, TerminalSlot>();
  private activeSlotId: TerminalSlotId = "A";
  private resizeObserver: ResizeObserver | null = null;
  private frameEl: HTMLDivElement | null = null;
  private switchButtons = new Map<TerminalSlotId, HTMLButtonElement>();
  private statusSummaryEl: HTMLSpanElement | null = null;

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

  runCommand(command: string): void {
    this.getActiveSlot()?.session.write(`${command}\r`);
  }

  async onOpen(): Promise<void> {
    this.containerEl.innerHTML = "";
    this.containerEl.classList.add("integrated-terminal");

    if (!this.options.isDesktop) {
      this.containerEl.textContent = "Integrated Terminal is available only on desktop.";
      return;
    }

    const toolbar = this.createToolbar();
    const frame = document.createElement("div");
    frame.className = "integrated-terminal__frame";
    this.frameEl = frame;

    this.containerEl.append(toolbar, frame);

    await Promise.all((["A", "B"] as TerminalSlotId[]).map((slotId) => this.createSlot(slotId)));
    this.setActiveSlot("A");
    this.setupResizeObserver();
  }

  async onClose(): Promise<void> {
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;

    for (const slot of this.slots.values()) {
      slot.session.dispose();
      slot.ui.dispose();
    }

    this.slots.clear();
    this.switchButtons.clear();
    this.frameEl = null;
    this.statusSummaryEl = null;
    this.containerEl.innerHTML = "";
  }

  private createToolbar(): HTMLDivElement {
    const toolbar = document.createElement("div");
    toolbar.className = "integrated-terminal__toolbar";

    const slotSwitcher = document.createElement("div");
    slotSwitcher.className = "integrated-terminal__switcher";
    for (const slotId of ["A", "B"] as TerminalSlotId[]) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "integrated-terminal__switch-button";
      button.dataset.slotSwitch = slotId;
      button.textContent = slotId;
      button.addEventListener("click", () => this.setActiveSlot(slotId));
      this.switchButtons.set(slotId, button);
      slotSwitcher.appendChild(button);
    }

    const summary = document.createElement("span");
    summary.className = "integrated-terminal__status-summary";
    this.statusSummaryEl = summary;

    const actions = document.createElement("div");
    actions.className = "integrated-terminal__actions";
    actions.append(
      this.createActionButton("Focus", "focus", () => this.getActiveSlot()?.ui.focus()),
      this.createActionButton("Clear", "clear", () => this.getActiveSlot()?.ui.clear()),
      this.createActionButton("Restart", "restart", () => {
        void this.restartSlot(this.activeSlotId);
      }),
      this.createActionButton("Codex", "codex", () => this.runCommand("npx codex")),
      this.createActionButton("Claude", "claude", () => this.runCommand("npx claude")),
    );

    toolbar.append(slotSwitcher, summary, actions);
    return toolbar;
  }

  private createActionButton(label: string, action: string, onClick: () => void): HTMLButtonElement {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "integrated-terminal__action";
    button.dataset.terminalAction = action;
    button.textContent = label;
    button.addEventListener("click", onClick);
    return button;
  }

  private async createSlot(slotId: TerminalSlotId): Promise<void> {
    const frameEl = this.frameEl;
    if (!frameEl) {
      return;
    }

    const slotEl = document.createElement("section");
    slotEl.className = "integrated-terminal__slot";
    slotEl.dataset.slotId = slotId;

    const headerEl = document.createElement("div");
    headerEl.className = "integrated-terminal__slot-header";
    const titleEl = document.createElement("span");
    titleEl.className = "integrated-terminal__slot-title";
    titleEl.textContent = `Terminal ${slotId}`;
    const statusEl = document.createElement("span");
    statusEl.className = "integrated-terminal__slot-status";
    headerEl.append(titleEl, statusEl);

    const hostEl = document.createElement("div");
    hostEl.className = "integrated-terminal__host";
    slotEl.append(headerEl, hostEl);
    frameEl.appendChild(slotEl);

    const ui = await (this.options.createTerminalUi ?? (() => createXtermTerminalUi(this.options.settings)))();
    ui.mount(hostEl);
    const session = this.createSession();

    const slot: TerminalSlot = {
      id: slotId,
      ui,
      session,
      hostEl: slotEl,
      statusEl,
      state: {
        status: "starting",
        detail: "Starting shell",
      },
    };

    session.onData((data) => ui.write(data));
    session.onExit((exitCode) => {
      this.updateSlotState(slotId, "exited", `Exited with code ${exitCode}`);
    });
    session.onError((message) => {
      this.updateSlotState(slotId, "error", message);
    });
    ui.onInput((data) => session.write(data));

    session.start();
    const size = ui.fit();
    session.resize(size.cols, size.rows);

    this.slots.set(slotId, slot);
    this.updateSlotState(slotId, "running", "Ready");
  }

  private createSession(): TerminalSession {
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

    return (this.options.createSession ?? createNodePtyTerminalSession)({
      shell,
      cwd: this.options.getVaultPath(),
      baseDir: this.options.getPluginBasePath?.(),
    });
  }

  private setActiveSlot(slotId: TerminalSlotId): void {
    this.activeSlotId = slotId;

    for (const [id, slot] of this.slots.entries()) {
      slot.hostEl.classList.toggle("is-active", id === slotId);
    }

    for (const [id, button] of this.switchButtons.entries()) {
      button.classList.toggle("is-active", id === slotId);
      button.setAttribute("aria-pressed", id === slotId ? "true" : "false");
    }

    this.refreshSummary();
    this.getActiveSlot()?.ui.focus();
  }

  private updateSlotState(slotId: TerminalSlotId, status: TerminalSlotStatus, detail: string): void {
    const slot = this.slots.get(slotId);
    if (!slot) {
      return;
    }

    slot.state = { status, detail };
    slot.hostEl.dataset.slotStatus = status;
    slot.statusEl.textContent = detail;
    this.refreshSummary();
  }

  private refreshSummary(): void {
    if (!this.statusSummaryEl) {
      return;
    }

    const activeSlot = this.getActiveSlot();
    if (!activeSlot) {
      this.statusSummaryEl.textContent = "";
      return;
    }

    this.statusSummaryEl.textContent = `Slot ${activeSlot.id}: ${activeSlot.state.detail}`;
  }

  private getActiveSlot(): TerminalSlot | null {
    return this.slots.get(this.activeSlotId) ?? null;
  }

  private async restartSlot(slotId: TerminalSlotId): Promise<void> {
    const slot = this.slots.get(slotId);
    if (!slot) {
      return;
    }

    slot.session.dispose();
    slot.ui.dispose();
    slot.hostEl.remove();
    this.slots.delete(slotId);

    await this.createSlot(slotId);
    this.setActiveSlot(slotId);
    this.fitSlot(slotId);
  }

  private setupResizeObserver(): void {
    if (!this.frameEl || typeof ResizeObserver === "undefined") {
      return;
    }

    this.resizeObserver = new ResizeObserver(() => {
      this.fitSlot(this.activeSlotId);
    });
    this.resizeObserver.observe(this.frameEl);
  }

  private fitSlot(slotId: TerminalSlotId): void {
    const slot = this.slots.get(slotId);
    if (!slot) {
      return;
    }

    const size = slot.ui.fit();
    slot.session.resize(size.cols, size.rows);
  }
}
