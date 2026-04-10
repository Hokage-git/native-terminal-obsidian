import { describe, expect, it, vi } from "vitest";
import { createHelperPtyBackend, createTerminalProcessEnv } from "../src/terminal/session";

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

function createExpectedTerminalEnv(platform: NodeJS.Platform, env: NodeJS.ProcessEnv = process.env) {
  return createTerminalProcessEnv(env, { platform });
}

describe("createHelperPtyBackend", () => {
  it("forks the helper script from the plugin directory and sends start metadata", () => {
    const child = createFakeChildProcess();
    const forkProcess = vi.fn(() => child as never);

    const backend = createHelperPtyBackend({
      baseDir: "/plugin",
      forkProcess,
      platform: "win32",
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
      env: createExpectedTerminalEnv("win32"),
    });
  });

  it("buffers writes and resizes until the helper reports ready", () => {
    const child = createFakeChildProcess();
    const forkProcess = vi.fn(() => child as never);
    const backend = createHelperPtyBackend({
      baseDir: "/plugin",
      forkProcess,
      platform: "win32",
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
      platform: "win32",
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
      platform: "win32",
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
      platform: "win32",
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

  it("reuses the current Electron executable when no standalone node path is provided", () => {
    const child = createFakeChildProcess();
    const forkProcess = vi.fn(() => child as never);

    createHelperPtyBackend({
      baseDir: "/plugin",
      forkProcess,
      env: { PATH: "" },
      platform: "linux",
      processExecPath: "/usr/lib/obsidian/obsidian",
      fileExists: () => false,
    })("bash", [], { cwd: "/vault" });

    expect(forkProcess).toHaveBeenCalledWith(
      expect.any(String),
      [],
      expect.objectContaining({
        execPath: "/usr/lib/obsidian/obsidian",
        execArgv: ["--no-sandbox"],
        env: expect.objectContaining({
          ELECTRON_DISABLE_SANDBOX: "1",
        }),
      }),
    );
  });

  it("prefers a discovered absolute node binary over the Electron executable", () => {
    const child = createFakeChildProcess();
    const forkProcess = vi.fn(() => child as never);

    createHelperPtyBackend({
      baseDir: "/plugin",
      forkProcess,
      env: { PATH: "" },
      platform: "linux",
      processExecPath: "/usr/lib/obsidian/obsidian",
      fileExists: (filePath) => filePath === "/usr/bin/node",
    })("bash", [], { cwd: "/vault" });

    expect(forkProcess).toHaveBeenCalledWith(
      expect.any(String),
      [],
      expect.objectContaining({
        execPath: "/usr/bin/node",
        env: expect.not.objectContaining({
          ELECTRON_DISABLE_SANDBOX: "1",
        }),
      }),
    );
  });

  it("ignores EPIPE when writing to a helper process that already crashed", () => {
    const child = createFakeChildProcess();
    const forkProcess = vi.fn(() => child as never);
    child.send.mockImplementationOnce(() => undefined);
    child.send.mockImplementation(() => {
      const error = new Error("write EPIPE") as Error & { code?: string };
      error.code = "EPIPE";
      throw error;
    });

    const backend = createHelperPtyBackend({
      baseDir: "/plugin",
      forkProcess,
      platform: "linux",
    });
    const pty = backend("bash", [], { cwd: "/vault" });
    const onData = vi.fn();

    pty.onData(onData);

    expect(() => pty.write("pwd\r")).not.toThrow();
    expect(() => pty.kill()).not.toThrow();
    expect(onData).not.toHaveBeenCalledWith(expect.stringContaining("EPIPE"));
  });
});
