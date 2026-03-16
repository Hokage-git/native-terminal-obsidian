import path from "node:path";
import { fork, type ChildProcess } from "node:child_process";
import { prepareShellLaunch, type ShellCommand } from "./shell";
import type { DisposableLike, PtyInstance, TerminalSessionOptions } from "./types";

interface HelperStartMessage {
  type: "start";
  shell: ShellCommand;
  cwd: string;
  cols: number;
  rows: number;
  env: NodeJS.ProcessEnv;
}

interface HelperWriteMessage {
  type: "write";
  data: string;
}

interface HelperResizeMessage {
  type: "resize";
  cols: number;
  rows: number;
}

interface HelperDisposeMessage {
  type: "dispose";
}

type HelperCommand = HelperStartMessage | HelperWriteMessage | HelperResizeMessage | HelperDisposeMessage;

type HelperEvent =
  | { type: "ready" }
  | { type: "data"; data: string }
  | { type: "error"; message: string }
  | { type: "exit"; exitCode: number };

export class TerminalSession {
  private readonly options: TerminalSessionOptions;
  private pty: PtyInstance | null = null;
  private readonly listeners = new Set<(data: string) => void>();
  private dataSubscription: DisposableLike | null = null;

  constructor(options: TerminalSessionOptions) {
    this.options = options;
  }

  start(): void {
    if (this.pty) {
      return;
    }

    this.pty = this.options.spawn(this.options.shell.command, this.options.shell.args, {
      cwd: this.options.cwd,
    });

    this.dataSubscription = this.pty.onData((data) => {
      for (const listener of this.listeners) {
        listener(data);
      }
    });
  }

  onData(listener: (data: string) => void): DisposableLike {
    this.listeners.add(listener);

    return {
      dispose: () => {
        this.listeners.delete(listener);
      },
    };
  }

  write(data: string): void {
    this.pty?.write(data);
  }

  resize(cols: number, rows: number): void {
    this.pty?.resize(cols, rows);
  }

  dispose(): void {
    this.dataSubscription?.dispose();
    this.dataSubscription = null;
    this.pty?.kill();
    this.pty = null;
  }
}

export function resolveHelperScriptPath(baseDir: string): string {
  return path.join(baseDir, "terminal-helper.js");
}

function resolveNodeExecPath(options: {
  env?: NodeJS.ProcessEnv;
  processExecPath?: string;
} = {}): string {
  const env = options.env ?? process.env;
  const processExecPath = options.processExecPath ?? process.execPath;
  const lowerExecPath = processExecPath.toLowerCase();

  if (path.basename(lowerExecPath).startsWith("node")) {
    return processExecPath;
  }

  if (env.NODE) {
    return env.NODE;
  }

  return process.platform === "win32" ? "node.exe" : "node";
}

export function createHelperPtyBackend(options: {
  baseDir?: string;
  forkProcess?: typeof fork;
  env?: NodeJS.ProcessEnv;
  processExecPath?: string;
  nodeExecPath?: string;
} = {}): TerminalSessionOptions["spawn"] {
  const baseDir = options.baseDir ?? __dirname;
  const helperScriptPath = resolveHelperScriptPath(baseDir);
  const forkProcess = options.forkProcess ?? fork;
  const nodeExecPath =
    options.nodeExecPath ??
    resolveNodeExecPath({
      env: options.env,
      processExecPath: options.processExecPath,
    });
  const helperEnv: NodeJS.ProcessEnv = {
    ...(options.env ?? process.env),
    ELECTRON_RUN_AS_NODE: "1",
  };

  return (file, args, spawnOptions) => {
    const child = forkProcess(helperScriptPath, [], {
      cwd: baseDir,
      env: helperEnv,
      execPath: nodeExecPath,
      stdio: ["ignore", "pipe", "pipe", "ipc"],
      windowsHide: true,
    });
    const listeners = new Set<(data: string) => void>();
    const pendingMessages: HelperCommand[] = [];
    let isReady = false;

    const emit = (data: string) => {
      for (const listener of listeners) {
        listener(data);
      }
    };

    const send = (message: HelperCommand) => {
      if (message.type === "start" || message.type === "dispose" || isReady) {
        child.send?.(message);
        return;
      }

      pendingMessages.push(message);
    };

    const flushPending = () => {
      for (const message of pendingMessages.splice(0)) {
        child.send?.(message);
      }
    };

    child.on("message", (message: HelperEvent) => {
      switch (message?.type) {
        case "ready":
          isReady = true;
          flushPending();
          return;
        case "data":
          emit(message.data);
          return;
        case "error":
          emit(`[obsidian-terminal] ${message.message}\r\n`);
          return;
        case "exit":
          emit(`[obsidian-terminal] Shell exited with code ${message.exitCode}.\r\n`);
          return;
      }
    });

    child.stdout?.on("data", (data: Buffer | string) => {
      emit(typeof data === "string" ? data : data.toString("utf8"));
    });
    child.stderr?.on("data", (data: Buffer | string) => {
      const chunk = typeof data === "string" ? data : data.toString("utf8");
      emit(`[obsidian-terminal] ${chunk}`);
    });
    child.on("error", (error) => {
      emit(`[obsidian-terminal] ${error.message}\r\n`);
    });

    send({
      type: "start",
      shell: { command: file, args },
      cwd: String(spawnOptions.cwd ?? process.cwd()),
      cols: 80,
      rows: 24,
      env: process.env,
    });

    return {
      pid: child.pid ?? 0,
      process: file,
      onData(callback) {
        listeners.add(callback);
        return {
          dispose() {
            listeners.delete(callback);
          },
        };
      },
      write(data) {
        send({ type: "write", data });
      },
      resize(cols, rows) {
        send({ type: "resize", cols, rows });
      },
      kill() {
        send({ type: "dispose" });
        child.kill();
      },
    };
  };
}

export function createNodePtyTerminalSession(options: {
  shell: ShellCommand;
  cwd: string;
  baseDir?: string;
}): TerminalSession {
  const launch = prepareShellLaunch({
    shell: options.shell,
    cwd: options.cwd,
    platform: process.platform,
    env: process.env,
  });

  return new TerminalSession({
    ...options,
    shell: launch.shell,
    cwd: launch.cwd,
    spawn: createHelperPtyBackend({
      baseDir: options.baseDir,
    }),
  });
}
