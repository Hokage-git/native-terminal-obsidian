import { describe, expect, it } from "vitest";
import { commandExistsOnPath, resolveShellCommand } from "../src/terminal/shell";

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

  it("falls back to sh on Unix when preferred shells are missing", () => {
    const shell = resolveShellCommand({
      platform: "linux",
      env: {},
      commandExists: (command) => command === "sh",
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
});
