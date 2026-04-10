import { describe, expect, it, vi } from "vitest";
import { createNodePtyTerminalSession, createTerminalProcessEnv, TerminalSession } from "../src/terminal/session";
import type { PtyInstance } from "../src/terminal/types";

function createFakePty(): PtyInstance & {
  emitData: (chunk: string) => void;
  emitExit: (exitCode: number) => void;
  emitError: (message: string) => void;
  written: string[];
  resized: Array<{ cols: number; rows: number }>;
  killed: boolean;
} {
  const dataListeners = new Set<(chunk: string) => void>();
  const exitListeners = new Set<(exitCode: number) => void>();
  const errorListeners = new Set<(message: string) => void>();

  return {
    pid: 1,
    process: "shell",
    written: [],
    resized: [],
    killed: false,
    onData(listener) {
      dataListeners.add(listener);
      return {
        dispose() {
          dataListeners.delete(listener);
        },
      };
    },
    onExit(listener) {
      exitListeners.add(listener);
      return {
        dispose() {
          exitListeners.delete(listener);
        },
      };
    },
    onError(listener) {
      errorListeners.add(listener);
      return {
        dispose() {
          errorListeners.delete(listener);
        },
      };
    },
    write(data) {
      this.written.push(data);
    },
    resize(cols, rows) {
      this.resized.push({ cols, rows });
    },
    kill() {
      this.killed = true;
    },
    emitData(chunk) {
      for (const listener of dataListeners) {
        listener(chunk);
      }
    },
    emitExit(exitCode) {
      for (const listener of exitListeners) {
        listener(exitCode);
      }
    },
    emitError(message) {
      for (const listener of errorListeners) {
        listener(message);
      }
    },
  };
}

describe("TerminalSession", () => {
  it("enriches Unix terminal env with common executable paths", () => {
    const env = createTerminalProcessEnv({
      HOME: "/home/mgladkov",
      PATH: "/usr/bin",
      TERM: "dumb",
    }, { platform: "linux" });

    expect(env.TERM).toBe("xterm-256color");
    expect(env.PATH).toContain("/usr/local/bin");
    expect(env.PATH).toContain("/home/mgladkov/.local/bin");
    expect(env.PATH).toContain("/home/mgladkov/bin");
  });

  it("starts a PTY with the requested shell and cwd", () => {
    const spawn = vi.fn(() => createFakePty());

    const session = new TerminalSession({
      shell: { command: "bash", args: ["-l"] },
      cwd: "/vault",
      spawn,
    });

    session.start();

    expect(spawn).toHaveBeenCalledWith("bash", ["-l"], expect.objectContaining({ cwd: "/vault" }));
  });

  it("forwards PTY output to listeners", () => {
    const pty = createFakePty();
    const session = new TerminalSession({
      shell: { command: "bash", args: [] },
      cwd: "/vault",
      spawn: () => pty,
    });
    const onData = vi.fn();

    session.onData(onData);
    session.start();
    pty.emitData("hello");

    expect(onData).toHaveBeenCalledWith("hello");
  });

  it("writes user input to the PTY", () => {
    const pty = createFakePty();
    const session = new TerminalSession({
      shell: { command: "bash", args: [] },
      cwd: "/vault",
      spawn: () => pty,
    });

    session.start();
    session.write("codex\n");

    expect(pty.written).toEqual(["codex\n"]);
  });

  it("resizes the PTY", () => {
    const pty = createFakePty();
    const session = new TerminalSession({
      shell: { command: "bash", args: [] },
      cwd: "/vault",
      spawn: () => pty,
    });

    session.start();
    session.resize(120, 30);

    expect(pty.resized).toEqual([{ cols: 120, rows: 30 }]);
  });

  it("kills the PTY on dispose", () => {
    const pty = createFakePty();
    const session = new TerminalSession({
      shell: { command: "bash", args: [] },
      cwd: "/vault",
      spawn: () => pty,
    });

    session.start();
    session.dispose();

    expect(pty.killed).toBe(true);
  });

  it("forwards PTY exit events to listeners", () => {
    const pty = createFakePty();
    const session = new TerminalSession({
      shell: { command: "bash", args: [] },
      cwd: "/vault",
      spawn: () => pty,
    });
    const onExit = vi.fn();

    session.onExit(onExit);
    session.start();
    pty.emitExit(7);

    expect(onExit).toHaveBeenCalledWith(7);
  });

  it("forwards PTY error events to listeners", () => {
    const pty = createFakePty();
    const session = new TerminalSession({
      shell: { command: "bash", args: [] },
      cwd: "/vault",
      spawn: () => pty,
    });
    const onError = vi.fn();

    session.onError(onError);
    session.start();
    pty.emitError("spawn failed");

    expect(onError).toHaveBeenCalledWith("spawn failed");
  });

  it("uses the direct PTY backend on non-Windows platforms", () => {
    const pty = createFakePty();
    const directSpawn = vi.fn(() => pty);
    const helperSpawn = vi.fn(() => createFakePty());
    const createDirectSpawn = vi.fn(() => directSpawn);
    const createHelperSpawn = vi.fn(() => helperSpawn);

    const session = createNodePtyTerminalSession({
      shell: { command: "bash", args: [] },
      cwd: "/vault",
      platform: "linux",
      createDirectSpawn,
      createHelperSpawn,
    });

    session.start();

    expect(createDirectSpawn).toHaveBeenCalledTimes(1);
    expect(createHelperSpawn).not.toHaveBeenCalled();
    expect(directSpawn).toHaveBeenCalledWith(
      "bash",
      ["-il"],
      expect.objectContaining({
        cwd: "/vault",
      }),
    );
  });

  it("uses the helper PTY backend on Windows", () => {
    const pty = createFakePty();
    const directSpawn = vi.fn(() => createFakePty());
    const helperSpawn = vi.fn(() => pty);
    const createDirectSpawn = vi.fn(() => directSpawn);
    const createHelperSpawn = vi.fn(() => helperSpawn);

    const session = createNodePtyTerminalSession({
      shell: { command: "powershell.exe", args: [] },
      cwd: "C:/vault",
      platform: "win32",
      env: { SystemRoot: "C:\\Windows" },
      createDirectSpawn,
      createHelperSpawn,
    });

    session.start();

    expect(createHelperSpawn).toHaveBeenCalledTimes(1);
    expect(createDirectSpawn).not.toHaveBeenCalled();
    expect(helperSpawn).toHaveBeenCalled();
  });
});
