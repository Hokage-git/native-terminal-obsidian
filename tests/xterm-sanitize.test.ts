import { describe, expect, it } from "vitest";
import { sanitizeTerminalOutput } from "../src/terminal/xterm-adapter";

describe("sanitizeTerminalOutput", () => {
  it("preserves DEL characters so interactive shells keep native line editing", () => {
    expect(sanitizeTerminalOutput(`abc${String.fromCharCode(127)}def`)).toBe(
      `abc${String.fromCharCode(127)}def`,
    );
  });

  it("removes malformed OSC title tails produced by Windows shells", () => {
    expect(sanitizeTerminalOutput("\u001b]0;npm\u0007\\\u001b[0K")).toBe("\u001b]0;npm\u0007\u001b[0K");
  });
});
