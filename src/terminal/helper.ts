import path from "node:path";
import type { IPty } from "node-pty";

interface HelperStartMessage {
  type: "start";
  shell: {
    command: string;
    args: string[];
  };
  cwd: string;
  cols: number;
  rows: number;
  env: NodeJS.ProcessEnv;
}

type HelperMessage =
  | HelperStartMessage
  | { type: "write"; data: string }
  | { type: "resize"; cols: number; rows: number }
  | { type: "dispose" };

function loadNodePtyModule(): typeof import("node-pty") {
  const localModulePath = path.join(__dirname, "node_modules", "node-pty");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require(localModulePath) as typeof import("node-pty");
}

let pty: IPty | null = null;

function send(message: Record<string, unknown>): void {
  process.send?.(message);
}

function dispose(): void {
  pty?.kill();
  pty = null;
}

function startSession(message: HelperStartMessage): void {
  const nodePty = loadNodePtyModule();

  pty = nodePty.spawn(message.shell.command, message.shell.args, {
    cols: message.cols,
    rows: message.rows,
    cwd: message.cwd,
    env: message.env,
    name: "xterm-color",
    useConpty: process.platform === "win32" ? false : undefined,
  });

  pty.onData((data) => {
    send({ type: "data", data });
  });
  pty.onExit?.(({ exitCode }) => {
    send({ type: "exit", exitCode });
  });

  send({ type: "ready" });
}

process.on("message", (message: HelperMessage) => {
  try {
    switch (message.type) {
      case "start":
        startSession(message);
        return;
      case "write":
        pty?.write(message.data);
        return;
      case "resize":
        pty?.resize(message.cols, message.rows);
        return;
      case "dispose":
        dispose();
        process.exit(0);
    }
  } catch (error) {
    const messageText = error instanceof Error ? error.message : String(error);
    send({ type: "error", message: messageText });
  }
});

process.on("uncaughtException", (error) => {
  send({ type: "error", message: error.message });
});
