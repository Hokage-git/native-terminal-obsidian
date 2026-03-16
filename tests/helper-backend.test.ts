import { describe, expect, it, vi } from "vitest";
import { createHelperPtyBackend } from "../src/terminal/session";

function createFakeChildProcess() {
  const listeners = new Map<string, Array<(...args: unknown[]) => void>>();
  const stdoutListeners: Array<(chunk: Buffer | string) => void> = [];
  const stderrListeners: Array<(chunk: Buffer | string) => void> = [];

  return {
    pid: 321,
    send: vi.fn(),
    kill: vi.fn(),
    stdout: {
      on(_event: string, listener: (chunk: Buffer | string) => void) {
        stdoutListeners.push(listener);
      },
    },
    stderr: {
      on(_event: string, listener: (chunk: Buffer | string) => void) {
        stderrListeners.push(listener);
      },
    },
    on(event: string, listener: (...args: unknown[]) => void) {
      const list = listeners.get(event) ?? [];
      list.push(listener);
      listeners.set(event, list);
      return this;
    },
    emit(event: string, ...args: unknown[]) {
      for (const listener of listeners.get(event) ?? []) {
        listener(...args);
      }
    },
    emitStdout(chunk: Buffer | string) {
      for (const listener of stdoutListeners) {
        listener(chunk);
      }
    },
    emitStderr(chunk: Buffer | string) {
      for (const listener of stderrListeners) {
        listener(chunk);
      }
    },
  };
}

describe("createHelperPtyBackend", () => {
  it("forks the helper script from the plugin directory and sends start metadata", () => {
    const child = createFakeChildProcess();
    const forkProcess = vi.fn(() => child as never);

    const backend = createHelperPtyBackend({
      baseDir: "/plugin",
      forkProcess,
      nodeExecPath: "C:/Program Files/nodejs/node.exe",
    });

    backend("powershell.exe", ["-NoLogo"], { cwd: "C:/vault" });

    expect(forkProcess).toHaveBeenCalledWith(
      expect.stringMatching(/terminal-helper\.js$/),
      [],
      expect.objectContaining({
        cwd: "/plugin",
        execPath: expect.stringMatching(/node\.exe$/),
        windowsHide: true,
        stdio: ["ignore", "pipe", "pipe", "ipc"],
        env: expect.objectContaining({
          ...process.env,
          ELECTRON_RUN_AS_NODE: "1",
        }),
      }),
    );
    expect(child.send).toHaveBeenCalledWith({
      type: "start",
      shell: {
        command: "powershell.exe",
        args: ["-NoLogo"],
      },
      cwd: "C:/vault",
      cols: 80,
      rows: 24,
      env: process.env,
    });
  });

  it("buffers writes and resizes until the helper reports ready", () => {
    const child = createFakeChildProcess();
    const forkProcess = vi.fn(() => child as never);
    const backend = createHelperPtyBackend({
      baseDir: "/plugin",
      forkProcess,
    });

    const pty = backend("powershell.exe", [], { cwd: "C:/vault" });
    pty.write("codex\r");
    pty.resize(120, 40);

    expect(child.send).toHaveBeenCalledTimes(1);

    child.emit("message", { type: "ready" });

    expect(child.send).toHaveBeenNthCalledWith(2, { type: "write", data: "codex\r" });
    expect(child.send).toHaveBeenNthCalledWith(3, { type: "resize", cols: 120, rows: 40 });
  });

  it("forwards helper output and lifecycle errors to terminal listeners", () => {
    const child = createFakeChildProcess();
    const forkProcess = vi.fn(() => child as never);
    const backend = createHelperPtyBackend({
      baseDir: "/plugin",
      forkProcess,
    });
    const pty = backend("powershell.exe", [], { cwd: "C:/vault" });
    const onData = vi.fn();

    pty.onData(onData);
    child.emit("message", { type: "data", data: "hello" });
    child.emit("message", { type: "error", message: "pty failed" });
    child.emitStderr(Buffer.from("debug info"));

    expect(onData).toHaveBeenCalledWith("hello");
    expect(onData).toHaveBeenCalledWith(expect.stringContaining("pty failed"));
    expect(onData).toHaveBeenCalledWith(expect.stringContaining("debug info"));
  });

  it("disposes the helper process", () => {
    const child = createFakeChildProcess();
    const forkProcess = vi.fn(() => child as never);
    const backend = createHelperPtyBackend({
      baseDir: "/plugin",
      forkProcess,
    });

    const pty = backend("powershell.exe", [], { cwd: "C:/vault" });
    pty.kill();

    expect(child.send).toHaveBeenCalledWith({ type: "dispose" });
    expect(child.kill).toHaveBeenCalled();
  });

  it("falls back to a node executable from env when running inside Electron", () => {
    const child = createFakeChildProcess();
    const forkProcess = vi.fn(() => child as never);

    createHelperPtyBackend({
      baseDir: "/plugin",
      forkProcess,
      env: { ...process.env, NODE: "C:/custom/node.exe" },
      processExecPath: "C:/Users/Maks/AppData/Local/Programs/Obsidian/Obsidian.exe",
    })("powershell.exe", [], { cwd: "C:/vault" });

    expect(forkProcess).toHaveBeenCalledWith(
      expect.any(String),
      [],
      expect.objectContaining({
        execPath: "C:/custom/node.exe",
      }),
    );
  });
});
