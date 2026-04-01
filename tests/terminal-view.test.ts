import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_SETTINGS } from "../src/settings";
import { TerminalView, TERMINAL_VIEW_TYPE } from "../src/terminal/view";

vi.mock("obsidian", () => {
  class ItemView {
    leaf: unknown;
    containerEl: HTMLDivElement;

    constructor(leaf: unknown) {
      this.leaf = leaf;
      this.containerEl = document.createElement("div");
    }
  }

  return { ItemView };
});

interface FakeTerminalUi {
  mount: (element: HTMLElement) => void;
  write: (data: string) => void;
  onInput: (listener: (data: string) => void) => void;
  fit: () => { cols: number; rows: number };
  clear: () => void;
  focus: () => void;
  dispose: () => void;
}

interface FakeSession {
  start: () => void;
  onData: (listener: (data: string) => void) => { dispose(): void };
  onExit: (listener: (exitCode: number) => void) => { dispose(): void };
  onError: (listener: (message: string) => void) => { dispose(): void };
  write: (data: string) => void;
  resize: (cols: number, rows: number) => void;
  dispose: () => void;
}

function createTerminalUi() {
  let inputListener: ((data: string) => void) | undefined;

  const ui: FakeTerminalUi & {
    writes: string[];
    mountTarget: HTMLElement | null;
    clearCalls: number;
    focusCalls: number;
    emitInput: (data: string) => void;
  } = {
    writes: [],
    mountTarget: null,
    clearCalls: 0,
    focusCalls: 0,
    mount(element) {
      this.mountTarget = element;
    },
    write(data) {
      this.writes.push(data);
    },
    onInput(listener) {
      inputListener = listener;
    },
    fit() {
      return { cols: 100, rows: 28 };
    },
    clear() {
      this.clearCalls += 1;
    },
    focus() {
      this.focusCalls += 1;
    },
    emitInput(data) {
      inputListener?.(data);
    },
    dispose: vi.fn(),
  };

  return ui;
}

function createSession() {
  let dataListener: ((data: string) => void) | undefined;
  let exitListener: ((exitCode: number) => void) | undefined;
  let errorListener: ((message: string) => void) | undefined;

  const session: FakeSession & {
    started: boolean;
    writes: string[];
    resized: Array<{ cols: number; rows: number }>;
    exitCodes: number[];
    errors: string[];
    emitData: (data: string) => void;
    emitExit: (exitCode: number) => void;
    emitError: (message: string) => void;
  } = {
    started: false,
    writes: [],
    resized: [],
    exitCodes: [],
    errors: [],
    start() {
      this.started = true;
    },
    onData(listener) {
      dataListener = listener;
      return { dispose() {} };
    },
    onExit(listener) {
      exitListener = listener;
      return { dispose() {} };
    },
    onError(listener) {
      errorListener = listener;
      return { dispose() {} };
    },
    write(data) {
      this.writes.push(data);
    },
    resize(cols, rows) {
      this.resized.push({ cols, rows });
    },
    emitData(data) {
      dataListener?.(data);
    },
    emitExit(exitCode) {
      this.exitCodes.push(exitCode);
      exitListener?.(exitCode);
    },
    emitError(message) {
      this.errors.push(message);
      errorListener?.(message);
    },
    dispose: vi.fn(),
  };

  return session;
}

describe("TerminalView", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("renders an unsupported message on mobile", async () => {
    const view = new TerminalView(
      {} as never,
      {
        isDesktop: false,
        settings: DEFAULT_SETTINGS,
        getVaultPath: () => "/vault",
        createTerminalUi: () => createTerminalUi(),
        createSession: () => createSession(),
      },
    );

    await view.onOpen();

    expect(view.containerEl.textContent).toContain("desktop");
  });

  it("initializes A and B terminal slots on desktop", async () => {
    const terminalUis = [createTerminalUi(), createTerminalUi()];
    const sessions = [createSession(), createSession()];
    const createSessionFactory = vi
      .fn()
      .mockReturnValueOnce(sessions[0])
      .mockReturnValueOnce(sessions[1]);
    const createTerminalUiFactory = vi
      .fn()
      .mockResolvedValueOnce(terminalUis[0])
      .mockResolvedValueOnce(terminalUis[1]);

    const view = new TerminalView(
      {} as never,
      {
        isDesktop: true,
        settings: DEFAULT_SETTINGS,
        getVaultPath: () => "/vault",
        createTerminalUi: createTerminalUiFactory,
        createSession: createSessionFactory,
      },
    );

    await view.onOpen();

    expect(createSessionFactory).toHaveBeenCalledTimes(2);
    expect(createSessionFactory).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        cwd: "/vault",
      }),
    );
    expect(createSessionFactory).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        cwd: "/vault",
      }),
    );
    expect(sessions[0].started).toBe(true);
    expect(sessions[1].started).toBe(true);
    expect(sessions[0].resized).toEqual([{ cols: 100, rows: 28 }]);
    expect(sessions[1].resized).toEqual([{ cols: 100, rows: 28 }]);
    expect(terminalUis[0].mountTarget).not.toBeNull();
    expect(terminalUis[1].mountTarget).not.toBeNull();
    expect(view.containerEl.querySelector(".integrated-terminal__frame")).not.toBeNull();
    expect(view.containerEl.querySelectorAll(".integrated-terminal__slot")).toHaveLength(2);
    expect(view.containerEl.querySelector('[data-slot-id="A"]')?.classList.contains("is-active")).toBe(true);
    expect(view.containerEl.querySelector('[data-slot-id="B"]')?.classList.contains("is-active")).toBe(false);
    expect(view.containerEl.classList.contains("integrated-terminal")).toBe(true);
  });

  it("forwards PTY output into the active slot terminal", async () => {
    const terminalUi = createTerminalUi();
    const inactiveUi = createTerminalUi();
    const session = createSession();
    const inactiveSession = createSession();
    const view = new TerminalView(
      {} as never,
      {
        isDesktop: true,
        settings: DEFAULT_SETTINGS,
        getVaultPath: () => "/vault",
        createTerminalUi: vi.fn().mockResolvedValueOnce(terminalUi).mockResolvedValueOnce(inactiveUi),
        createSession: vi.fn().mockReturnValueOnce(session).mockReturnValueOnce(inactiveSession),
      },
    );

    await view.onOpen();
    session.emitData("claude ready");

    expect(terminalUi.writes).toEqual(["claude ready"]);
    expect(inactiveUi.writes).toEqual([]);
  });

  it("forwards terminal input into the session", async () => {
    const terminalUi = createTerminalUi();
    const inactiveUi = createTerminalUi();
    const session = createSession();
    const inactiveSession = createSession();
    const view = new TerminalView(
      {} as never,
      {
        isDesktop: true,
        settings: DEFAULT_SETTINGS,
        getVaultPath: () => "/vault",
        createTerminalUi: vi.fn().mockResolvedValueOnce(terminalUi).mockResolvedValueOnce(inactiveUi),
        createSession: vi.fn().mockReturnValueOnce(session).mockReturnValueOnce(inactiveSession),
      },
    );

    await view.onOpen();
    terminalUi.emitInput("codex\n");

    expect(session.writes).toEqual(["codex\n"]);
  });

  it("can run a command in the active terminal session", async () => {
    const terminalUi = createTerminalUi();
    const otherUi = createTerminalUi();
    const sessionA = createSession();
    const sessionB = createSession();
    const view = new TerminalView(
      {} as never,
      {
        isDesktop: true,
        settings: DEFAULT_SETTINGS,
        getVaultPath: () => "/vault",
        createTerminalUi: vi.fn().mockResolvedValueOnce(terminalUi).mockResolvedValueOnce(otherUi),
        createSession: vi.fn().mockReturnValueOnce(sessionA).mockReturnValueOnce(sessionB),
      },
    );

    await view.onOpen();
    view.runCommand("npx codex");
    const slotBButton = view.containerEl.querySelector('button[data-slot-switch="B"]') as HTMLButtonElement;
    slotBButton.click();
    view.runCommand("npx claude");

    expect(sessionA.writes).toEqual(["npx codex\r"]);
    expect(sessionB.writes).toEqual(["npx claude\r"]);
  });

  it("restarts and clears the active slot from the toolbar", async () => {
    const terminalUis = [createTerminalUi(), createTerminalUi(), createTerminalUi()];
    const sessions = [createSession(), createSession(), createSession()];
    const createTerminalUiFactory = vi
      .fn()
      .mockResolvedValueOnce(terminalUis[0])
      .mockResolvedValueOnce(terminalUis[1])
      .mockResolvedValueOnce(terminalUis[2]);
    const createSessionFactory = vi
      .fn()
      .mockReturnValueOnce(sessions[0])
      .mockReturnValueOnce(sessions[1])
      .mockReturnValueOnce(sessions[2]);

    const view = new TerminalView(
      {} as never,
      {
        isDesktop: true,
        settings: DEFAULT_SETTINGS,
        getVaultPath: () => "/vault",
        createTerminalUi: createTerminalUiFactory,
        createSession: createSessionFactory,
      },
    );

    await view.onOpen();

    const clearButton = view.containerEl.querySelector('button[data-terminal-action="clear"]') as HTMLButtonElement;
    const restartButton = view.containerEl.querySelector('button[data-terminal-action="restart"]') as HTMLButtonElement;

    clearButton.click();
    expect(terminalUis[0].clearCalls).toBe(1);

    restartButton.click();
    await Promise.resolve();

    expect(sessions[0].dispose).toHaveBeenCalledTimes(1);
    expect(terminalUis[0].dispose).toHaveBeenCalledTimes(1);
    expect(sessions[2].started).toBe(true);
  });

  it("shows slot status when the shell exits or errors", async () => {
    const terminalUis = [createTerminalUi(), createTerminalUi()];
    const sessions = [createSession(), createSession()];
    const view = new TerminalView(
      {} as never,
      {
        isDesktop: true,
        settings: DEFAULT_SETTINGS,
        getVaultPath: () => "/vault",
        createTerminalUi: vi.fn().mockResolvedValueOnce(terminalUis[0]).mockResolvedValueOnce(terminalUis[1]),
        createSession: vi.fn().mockReturnValueOnce(sessions[0]).mockReturnValueOnce(sessions[1]),
      },
    );

    await view.onOpen();
    sessions[0].emitExit(2);
    expect(view.containerEl.textContent).toContain("Exited with code 2");

    const slotBButton = view.containerEl.querySelector('button[data-slot-switch="B"]') as HTMLButtonElement;
    slotBButton.click();
    sessions[1].emitError("spawn failed");
    expect(view.containerEl.textContent).toContain("spawn failed");
  });

  it("disposes both slot sessions when the view closes", async () => {
    const terminalUis = [createTerminalUi(), createTerminalUi()];
    const sessions = [createSession(), createSession()];
    const view = new TerminalView(
      {} as never,
      {
        isDesktop: true,
        settings: DEFAULT_SETTINGS,
        getVaultPath: () => "/vault",
        createTerminalUi: vi.fn().mockResolvedValueOnce(terminalUis[0]).mockResolvedValueOnce(terminalUis[1]),
        createSession: vi.fn().mockReturnValueOnce(sessions[0]).mockReturnValueOnce(sessions[1]),
      },
    );

    await view.onOpen();
    await view.onClose();

    expect(sessions[0].dispose).toHaveBeenCalledTimes(1);
    expect(sessions[1].dispose).toHaveBeenCalledTimes(1);
    expect(terminalUis[0].dispose).toHaveBeenCalledTimes(1);
    expect(terminalUis[1].dispose).toHaveBeenCalledTimes(1);
  });

  it("exposes the expected view type", () => {
    expect(TERMINAL_VIEW_TYPE).toBe("integrated-terminal-view");
  });
});
