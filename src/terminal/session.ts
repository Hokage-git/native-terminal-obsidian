import fs from "node:fs";
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

export function createTerminalProcessEnv(
  env: NodeJS.ProcessEnv,
  options: { platform?: NodeJS.Platform } = {},
): NodeJS.ProcessEnv {
  const platform = options.platform ?? process.platform;
  const pathApi = platform === "win32" ? path.win32 : path.posix;
  const pathDelimiter = platform === "win32" ? ";" : ":";
  const home = env.HOME;
  const currentPathEntries = (env.PATH ?? "").split(pathDelimiter).filter(Boolean);
  const preferredPathEntries = [
    home ? pathApi.join(home, ".local", "bin") : "",
    home ? pathApi.join(home, "bin") : "",
    "/usr/local/bin",
    "/usr/bin",
    "/usr/local/sbin",
    "/usr/sbin",
  ].filter(Boolean);
  const mergedPathEntries = [...preferredPathEntries, ...currentPathEntries].filter(
    (entry, index, entries) => entries.indexOf(entry) === index,
  );

  return {
    ...env,
    TERM: !env.TERM || env.TERM.toLowerCase() === "dumb" ? "xterm-256color" : env.TERM,
    COLORTERM: env.COLORTERM ?? "truecolor",
    PATH: mergedPathEntries.join(pathDelimiter),
  };
}

function isClosedIpcError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const code = (error as Error & { code?: string }).code;
  return code === "EPIPE" || code === "ERR_IPC_CHANNEL_CLOSED";
}

export class TerminalSession {
  private readonly options: TerminalSessionOptions;
  private pty: PtyInstance | null = null;
  private readonly dataListeners = new Set<(data: string) => void>();
  private readonly exitListeners = new Set<(exitCode: number) => void>();
  private readonly errorListeners = new Set<(message: string) => void>();
  private dataSubscription: DisposableLike | null = null;
  private exitSubscription: DisposableLike | null = null;
  private errorSubscription: DisposableLike | null = null;

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
      for (const listener of this.dataListeners) {
        listener(data);
      }
    });
    this.exitSubscription = this.pty.onExit?.((exitCode) => {
      for (const listener of this.exitListeners) {
        listener(exitCode);
      }
    }) ?? null;
    this.errorSubscription = this.pty.onError?.((message) => {
      for (const listener of this.errorListeners) {
        listener(message);
      }
    }) ?? null;
  }

  onData(listener: (data: string) => void): DisposableLike {
    this.dataListeners.add(listener);

    return {
      dispose: () => {
        this.dataListeners.delete(listener);
      },
    };
  }

  onExit(listener: (exitCode: number) => void): DisposableLike {
    this.exitListeners.add(listener);

    return {
      dispose: () => {
        this.exitListeners.delete(listener);
      },
    };
  }

  onError(listener: (message: string) => void): DisposableLike {
    this.errorListeners.add(listener);

    return {
      dispose: () => {
        this.errorListeners.delete(listener);
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
    this.exitSubscription?.dispose();
    this.errorSubscription?.dispose();
    this.dataSubscription = null;
    this.exitSubscription = null;
    this.errorSubscription = null;
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
  fileExists?: (filePath: string) => boolean;
} = {}): string {
  const env = options.env ?? process.env;
  const processExecPath = options.processExecPath ?? process.execPath;
  const fileExists = options.fileExists ?? fs.existsSync;
  const lowerExecPath = processExecPath.toLowerCase();

  if (path.basename(lowerExecPath).startsWith("node")) {
    return processExecPath;
  }

  if (env.NODE) {
    return env.NODE;
  }

  for (const candidate of ["/usr/bin/node", "/usr/local/bin/node", "/app/bin/node"]) {
    if (fileExists(candidate)) {
      return candidate;
    }
  }

  if (processExecPath) {
    return processExecPath;
  }

  return process.platform === "win32" ? "node.exe" : "node";
}

export function createHelperPtyBackend(options: {
  baseDir?: string;
  forkProcess?: typeof fork;
  env?: NodeJS.ProcessEnv;
  platform?: NodeJS.Platform;
  processExecPath?: string;
  nodeExecPath?: string;
  fileExists?: (filePath: string) => boolean;
} = {}): TerminalSessionOptions["spawn"] {
  const baseDir = options.baseDir ?? __dirname;
  const helperScriptPath = resolveHelperScriptPath(baseDir);
  const forkProcess = options.forkProcess ?? fork;
  const platform = options.platform ?? process.platform;
  const processExecPath = options.processExecPath ?? process.execPath;
  const nodeExecPath =
    options.nodeExecPath ??
    resolveNodeExecPath({
      env: options.env,
      processExecPath,
      fileExists: options.fileExists,
    });
  const usesElectronExecPath =
    platform === "linux" &&
    nodeExecPath === processExecPath &&
    !path.basename(processExecPath).toLowerCase().startsWith("node");
  const helperEnv: NodeJS.ProcessEnv = {
    ...(options.env ?? process.env),
    ELECTRON_RUN_AS_NODE: "1",
    ...(usesElectronExecPath ? { ELECTRON_DISABLE_SANDBOX: "1" } : {}),
  };
  const terminalEnv = createTerminalProcessEnv(options.env ?? process.env, { platform });

  return (file, args, spawnOptions) => {
    const child = forkProcess(helperScriptPath, [], {
      cwd: baseDir,
      env: helperEnv,
      execPath: nodeExecPath,
      ...(usesElectronExecPath ? { execArgv: ["--no-sandbox"] } : {}),
      stdio: ["ignore", "pipe", "pipe", "ipc"],
      windowsHide: true,
    });
    const listeners = new Set<(data: string) => void>();
    const exitListeners = new Set<(exitCode: number) => void>();
    const errorListeners = new Set<(message: string) => void>();
    const pendingMessages: HelperCommand[] = [];
    let isReady = false;

    const emit = (data: string) => {
      for (const listener of listeners) {
        listener(data);
      }
    };

    const safeSend = (message: HelperCommand) => {
      try {
        child.send?.(message);
      } catch (error) {
        if (!isClosedIpcError(error)) {
          throw error;
        }
      }
    };

    const send = (message: HelperCommand) => {
      if (message.type === "start" || message.type === "dispose" || isReady) {
        safeSend(message);
        return;
      }

      pendingMessages.push(message);
    };

    const flushPending = () => {
      for (const message of pendingMessages.splice(0)) {
        safeSend(message);
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
          for (const listener of errorListeners) {
            listener(message.message);
          }
          emit(`[obsidian-terminal] ${message.message}\r\n`);
          return;
        case "exit":
          for (const listener of exitListeners) {
            listener(message.exitCode);
          }
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
      for (const listener of errorListeners) {
        listener(error.message);
      }
      emit(`[obsidian-terminal] ${error.message}\r\n`);
    });

    send({
      type: "start",
      shell: { command: file, args },
      cwd: String(spawnOptions.cwd ?? process.cwd()),
      cols: 80,
      rows: 24,
      env: terminalEnv,
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
      onExit(callback) {
        exitListeners.add(callback);
        return {
          dispose() {
            exitListeners.delete(callback);
          },
        };
      },
      onError(callback) {
        errorListeners.add(callback);
        return {
          dispose() {
            errorListeners.delete(callback);
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

function loadNodePtyModule(baseDir: string): typeof import("node-pty") {
  const localModulePath = path.join(baseDir, "node_modules", "node-pty");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require(localModulePath) as typeof import("node-pty");
}

export function createDirectPtyBackend(options: {
  baseDir?: string;
  loadNodePty?: (baseDir: string) => typeof import("node-pty");
} = {}): TerminalSessionOptions["spawn"] {
  const baseDir = options.baseDir ?? __dirname;
  const loadNodePty = options.loadNodePty ?? loadNodePtyModule;
  const terminalEnv = createTerminalProcessEnv(process.env);

  return (file, args, spawnOptions) => {
    const nodePty = loadNodePty(baseDir);
    const pty = nodePty.spawn(file, args, {
      ...spawnOptions,
      env: terminalEnv,
    });

    return {
      pid: pty.pid,
      process: pty.process,
      onData(callback) {
        return pty.onData(callback);
      },
      onExit(callback) {
        return pty.onExit?.(({ exitCode }) => callback(exitCode)) ?? { dispose() {} };
      },
      write(data) {
        pty.write(data);
      },
      resize(cols, rows) {
        pty.resize(cols, rows);
      },
      kill() {
        pty.kill();
      },
    };
  };
}

export function createNodePtyTerminalSession(options: {
  shell: ShellCommand;
  cwd: string;
  baseDir?: string;
  platform?: NodeJS.Platform;
  env?: NodeJS.ProcessEnv;
  createDirectSpawn?: typeof createDirectPtyBackend;
  createHelperSpawn?: typeof createHelperPtyBackend;
}): TerminalSession {
  const platform = options.platform ?? process.platform;
  const env = options.env ?? process.env;
  const launch = prepareShellLaunch({
    shell: options.shell,
    cwd: options.cwd,
    platform,
    env,
  });
  const createSpawn =
    platform === "win32"
      ? (options.createHelperSpawn ?? createHelperPtyBackend)
      : (options.createDirectSpawn ?? createDirectPtyBackend);

  return new TerminalSession({
    ...options,
    shell: launch.shell,
    cwd: launch.cwd,
    spawn: createSpawn({
      baseDir: options.baseDir,
    }),
  });
}
