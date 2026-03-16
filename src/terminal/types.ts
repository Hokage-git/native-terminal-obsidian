import type { IPty } from "node-pty";
import type { ShellCommand } from "./shell";

export interface DisposableLike {
  dispose(): void;
}

export interface PtyInstance {
  pid: number;
  process: string;
  onData(callback: (data: string) => void): DisposableLike;
  write(data: string): void;
  resize(cols: number, rows: number): void;
  kill(): void;
}

export interface TerminalSessionOptions {
  shell: ShellCommand;
  cwd: string;
  spawn: (file: string, args: string[], options: Record<string, unknown>) => PtyInstance;
}

export type NodePtyInstance = IPty;

export interface TerminalUi {
  mount(element: HTMLElement): void;
  write(data: string): void;
  onInput(listener: (data: string) => void): void;
  fit(): { cols: number; rows: number };
  dispose(): void;
}

export type TerminalUiFactory = () => TerminalUi | Promise<TerminalUi>;
