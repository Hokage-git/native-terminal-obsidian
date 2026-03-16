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
  dispose: () => void;
}

interface FakeSession {
  start: () => void;
  onData: (listener: (data: string) => void) => { dispose(): void };
  write: (data: string) => void;
  resize: (cols: number, rows: number) => void;
  dispose: () => void;
}

function createTerminalUi() {
  let inputListener: ((data: string) => void) | undefined;

  const ui: FakeTerminalUi & {
    writes: string[];
    mountTarget: HTMLElement | null;
    emitInput: (data: string) => void;
  } = {
    writes: [],
    mountTarget: null,
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
    emitInput(data) {
      inputListener?.(data);
    },
    dispose: vi.fn(),
  };

  return ui;
}

function createSession() {
  let dataListener: ((data: string) => void) | undefined;

  const session: FakeSession & {
    started: boolean;
    writes: string[];
    resized: Array<{ cols: number; rows: number }>;
    emitData: (data: string) => void;
  } = {
    started: false,
    writes: [],
    resized: [],
    start() {
      this.started = true;
    },
    onData(listener) {
      dataListener = listener;
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

  it("initializes the terminal and session on desktop", async () => {
    const terminalUi = createTerminalUi();
    const session = createSession();
    const createSessionFactory = vi.fn(() => session);

    const view = new TerminalView(
      {} as never,
      {
        isDesktop: true,
        settings: DEFAULT_SETTINGS,
        getVaultPath: () => "/vault",
        createTerminalUi: () => terminalUi,
        createSession: createSessionFactory,
      },
    );

    await view.onOpen();

    expect(createSessionFactory).toHaveBeenCalledWith(
      expect.objectContaining({
        cwd: "/vault",
      }),
    );
    expect(session.started).toBe(true);
    expect(session.resized).toEqual([{ cols: 100, rows: 28 }]);
    expect(terminalUi.mountTarget).not.toBeNull();
    expect(view.containerEl.querySelector(".integrated-terminal__frame")).not.toBeNull();
    expect(view.containerEl.classList.contains("integrated-terminal")).toBe(true);
  });

  it("forwards PTY output into the terminal", async () => {
    const terminalUi = createTerminalUi();
    const session = createSession();
    const view = new TerminalView(
      {} as never,
      {
        isDesktop: true,
        settings: DEFAULT_SETTINGS,
        getVaultPath: () => "/vault",
        createTerminalUi: () => terminalUi,
        createSession: () => session,
      },
    );

    await view.onOpen();
    session.emitData("claude ready");

    expect(terminalUi.writes).toEqual(["claude ready"]);
  });

  it("forwards terminal input into the session", async () => {
    const terminalUi = createTerminalUi();
    const session = createSession();
    const view = new TerminalView(
      {} as never,
      {
        isDesktop: true,
        settings: DEFAULT_SETTINGS,
        getVaultPath: () => "/vault",
        createTerminalUi: () => terminalUi,
        createSession: () => session,
      },
    );

    await view.onOpen();
    terminalUi.emitInput("codex\n");

    expect(session.writes).toEqual(["codex\n"]);
  });

  it("exposes the expected view type", () => {
    expect(TERMINAL_VIEW_TYPE).toBe("integrated-terminal-view");
  });
});
