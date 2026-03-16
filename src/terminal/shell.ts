import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

export interface ResolveShellOptions {
  platform: NodeJS.Platform;
  env: NodeJS.ProcessEnv;
  commandExists: (command: string) => boolean;
}

export interface ShellCommand {
  command: string;
  args: string[];
}

export interface PreparedShellLaunch {
  shell: ShellCommand;
  cwd: string;
}

export function resolveWindowsShortPath(options: {
  targetPath: string;
  execFileSyncFn?: typeof execFileSync;
}): string | undefined {
  try {
    const execImpl = options.execFileSyncFn ?? execFileSync;
    const script = `$fso = New-Object -ComObject Scripting.FileSystemObject; $fso.GetFolder('${options.targetPath.replace(/'/g, "''")}').ShortPath`;
    const output = execImpl("powershell.exe", ["-NoProfile", "-Command", script], {
      encoding: "utf8",
      windowsHide: true,
    }).trim();

    return output || undefined;
  } catch {
    return undefined;
  }
}

export function commandExistsOnPath(options: {
  command: string;
  env: NodeJS.ProcessEnv;
  platform: NodeJS.Platform;
  fileExists?: (filePath: string) => boolean;
}): boolean {
  const exists = options.fileExists ?? fs.existsSync;
  const command = options.command;

  if (path.isAbsolute(command)) {
    return exists(command);
  }

  const pathEntries = (options.env.PATH ?? "").split(path.delimiter).filter(Boolean);
  const extensions =
    options.platform === "win32"
      ? (options.env.PATHEXT ?? ".EXE;.CMD;.BAT;.COM")
          .split(";")
          .filter(Boolean)
          .map((value) => value.toLowerCase())
      : [""];

  const hasExtension = path.extname(command) !== "";

  for (const entry of pathEntries) {
    if (options.platform === "win32") {
      const candidates = hasExtension
        ? [path.join(entry, command)]
        : extensions.map((extension) => path.join(entry, `${command}${extension.toLowerCase()}`));

      if (candidates.some((candidate) => exists(candidate))) {
        return true;
      }
      continue;
    }

    if (exists(path.join(entry, command))) {
      return true;
    }
  }

  return false;
}

export function resolveShellCommand(options: ResolveShellOptions): ShellCommand {
  if (options.platform === "win32") {
    for (const command of ["pwsh.exe", "powershell.exe", "cmd.exe"]) {
      if (options.commandExists(command)) {
        return { command, args: [] };
      }
    }

    return { command: "cmd.exe", args: [] };
  }

  const envShell = options.env.SHELL;
  if (envShell) {
    return { command: envShell, args: [] };
  }

  for (const command of ["zsh", "bash", "sh"]) {
    if (options.commandExists(command)) {
      return { command, args: [] };
    }
  }

  return { command: "sh", args: [] };
}

export function prepareShellLaunch(options: {
  shell: ShellCommand;
  cwd: string;
  platform: NodeJS.Platform;
  env: NodeJS.ProcessEnv;
  resolveWindowsPath?: (targetPath: string) => string | undefined;
}): PreparedShellLaunch {
  if (options.platform !== "win32") {
    return {
      shell: options.shell,
      cwd: options.cwd,
    };
  }

  const resolveWindowsPath = options.resolveWindowsPath ?? ((targetPath: string) => resolveWindowsShortPath({ targetPath }));
  const resolvedCwd =
    /[^\x00-\x7F]/.test(options.cwd) ? resolveWindowsPath(options.cwd) : options.cwd;
  if (resolvedCwd && !/[^\x00-\x7F]/.test(resolvedCwd)) {
    return {
      shell: options.shell,
      cwd: resolvedCwd,
    };
  }

  const systemRoot = options.env.SystemRoot ?? "C:\\Windows";
  const safeCwd = `${systemRoot.replace(/[\\/]+$/, "")}\\Temp`;

  const command = options.shell.command.toLowerCase();
  if (command.includes("pwsh") || command.includes("powershell")) {
    return {
      cwd: safeCwd,
      shell: {
        command: options.shell.command,
        args: [
          "-NoExit",
          "-Command",
          `Set-Location -LiteralPath '${options.cwd.replace(/'/g, "''")}'`,
        ],
      },
    };
  }

  if (command.includes("cmd.exe")) {
    return {
      cwd: safeCwd,
      shell: {
        command: options.shell.command,
        args: ["/K", `cd /d "${options.cwd.replace(/"/g, '""')}"`],
      },
    };
  }

  return {
    cwd: safeCwd,
    shell: options.shell,
  };
}
