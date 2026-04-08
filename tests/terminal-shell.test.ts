import { describe, expect, it } from "vitest";
import { commandExistsOnPath, prepareShellLaunch, resolveShellCommand } from "../src/terminal/shell";

describe("resolveShellCommand", () => {
  it("prefers PowerShell variants on Windows", () => {
    const shell = resolveShellCommand({
      platform: "win32",
      env: {},
      commandExists: (command) => command === "cmd.exe" || command === "powershell.exe",
    });

    expect(shell.command).toBe("powershell.exe");
  });

  it("uses SHELL on Unix when available", () => {
    const shell = resolveShellCommand({
      platform: "linux",
      env: { SHELL: "/bin/zsh" },
      commandExists: () => true,
    });

    expect(shell.command).toBe("/bin/zsh");
  });

  it("prefers bash over SHELL when SHELL points to sh on Unix", () => {
    const shell = resolveShellCommand({
      platform: "linux",
      env: { SHELL: "/bin/sh" },
      commandExists: (command) => command === "bash" || command === "sh",
    });

    expect(shell.command).toBe("bash");
  });

  it("falls back to absolute bash when PATH lookup is unavailable on Unix", () => {
    const shell = resolveShellCommand({
      platform: "linux",
      env: { SHELL: "/bin/sh" },
      commandExists: () => false,
      fileExists: (filePath) => filePath === "/usr/bin/bash",
    });

    expect(shell.command).toBe("/usr/bin/bash");
  });

  it("falls back to sh on Unix when preferred shells are missing", () => {
    const shell = resolveShellCommand({
      platform: "linux",
      env: {},
      commandExists: (command) => command === "sh",
      fileExists: () => false,
    });

    expect(shell.command).toBe("sh");
  });

  it("checks executable existence against PATH entries", () => {
    const exists = commandExistsOnPath({
      command: "powershell.exe",
      env: {
        PATH: "C:\\Windows\\System32\\WindowsPowerShell\\v1.0",
        PATHEXT: ".EXE;.CMD",
      },
      fileExists: (filePath) =>
        filePath === "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe",
      platform: "win32",
    });

    expect(exists).toBe(true);
  });

  it("launches bash as an interactive login shell on Unix", () => {
    const launch = prepareShellLaunch({
      shell: { command: "/bin/bash", args: [] },
      cwd: "/vault",
      platform: "linux",
      env: {},
    });

    expect(launch).toEqual({
      cwd: "/vault",
      shell: {
        command: "/bin/bash",
        args: ["-il"],
      },
    });
  });

  it("keeps sh interactive without forcing login mode on Unix", () => {
    const launch = prepareShellLaunch({
      shell: { command: "sh", args: [] },
      cwd: "/vault",
      platform: "linux",
      env: {},
    });

    expect(launch).toEqual({
      cwd: "/vault",
      shell: {
        command: "sh",
        args: ["-i"],
      },
    });
  });
});
