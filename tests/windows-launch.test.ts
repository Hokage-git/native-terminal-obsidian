import { describe, expect, it } from "vitest";
import { prepareShellLaunch } from "../src/terminal/shell";

describe("prepareShellLaunch", () => {
  it("uses a safe startup cwd and cd command for PowerShell on Windows", () => {
    const result = prepareShellLaunch({
      shell: { command: "powershell.exe", args: [] },
      cwd: "C:/Users/Макс/Documents/UMKA",
      platform: "win32",
      env: {
        USERPROFILE: "C:/Users/Макс",
        SystemRoot: "C:/Windows",
      },
      resolveWindowsPath: () => "C:/Users/4D88~1/DOCUME~1/UMKA",
    });

    expect(result.cwd).toMatch(/4D88~1[\\/]+DOCUME~1[\\/]+UMKA$/);
    expect(result.shell.command).toBe("powershell.exe");
    expect(result.shell.args).toEqual([]);
  });

  it("keeps the original cwd on non-Windows platforms", () => {
    const result = prepareShellLaunch({
      shell: { command: "bash", args: [] },
      cwd: "/vault",
      platform: "linux",
      env: {},
    });

    expect(result.cwd).toBe("/vault");
    expect(result.shell).toEqual({ command: "bash", args: [] });
  });

  it("falls back to an ASCII Windows temp directory even when USERPROFILE is non-ASCII", () => {
    const result = prepareShellLaunch({
      shell: { command: "cmd.exe", args: [] },
      cwd: "C:/Users/Макс/Documents/UMKA",
      platform: "win32",
      env: {
        USERPROFILE: "C:/Users/Макс",
        SystemRoot: "C:/Windows",
      },
      resolveWindowsPath: () => "C:/Users/4D88~1/DOCUME~1/UMKA",
    });

    expect(result.cwd).toMatch(/4D88~1[\\/]+DOCUME~1[\\/]+UMKA$/);
  });

  it("prefers a resolved short ASCII path for the vault on Windows", () => {
    const result = prepareShellLaunch({
      shell: { command: "powershell.exe", args: [] },
      cwd: "C:/Users/Макс/Documents/UMKA",
      platform: "win32",
      env: {
        USERPROFILE: "C:/Users/Макс",
        SystemRoot: "C:/Windows",
      },
      resolveWindowsPath: () => "C:/Users/4D88~1/DOCUME~1/UMKA",
    });

    expect(result.cwd).toBe("C:/Users/4D88~1/DOCUME~1/UMKA");
    expect(result.shell).toEqual({ command: "powershell.exe", args: [] });
  });

  it("keeps cmd fallback arguments unchanged on Windows", () => {
    const result = prepareShellLaunch({
      shell: { command: "cmd.exe", args: [] },
      cwd: "C:/Users/Макс/Documents/UMKA",
      platform: "win32",
      env: {
        USERPROFILE: "C:/Users/Макс",
        SystemRoot: "C:/Windows",
      },
      resolveWindowsPath: () => "C:/Users/4D88~1/DOCUME~1/UMKA",
    });

    expect(result.cwd).toBe("C:/Users/4D88~1/DOCUME~1/UMKA");
    expect(result.shell.command).toBe("cmd.exe");
    expect(result.shell.args).toEqual([]);
  });
});
