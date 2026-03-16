import { describe, expect, it } from "vitest";
import { getTerminalTheme } from "../src/terminal/xterm-adapter";

describe("getTerminalTheme", () => {
  it("provides explicit selection colors for dark theme", () => {
    expect(getTerminalTheme("dark")).toEqual(
      expect.objectContaining({
        background: "#111827",
        foreground: "#e5e7eb",
        selectionBackground: expect.any(String),
        selectionInactiveBackground: expect.any(String),
      }),
    );
  });

  it("provides explicit selection colors for light theme", () => {
    expect(getTerminalTheme("light")).toEqual(
      expect.objectContaining({
        background: "#f5f5f5",
        foreground: "#1f2933",
        selectionBackground: expect.any(String),
        selectionInactiveBackground: expect.any(String),
      }),
    );
  });
});
