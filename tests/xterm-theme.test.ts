import { describe, expect, it } from "vitest";
import { getTerminalTheme } from "../src/terminal/xterm-adapter";

describe("getTerminalTheme", () => {
  it("reads dark theme colors from Obsidian CSS variables", () => {
    document.documentElement.style.setProperty("--background-primary", "rgb(20, 21, 24)");
    document.documentElement.style.setProperty("--text-normal", "rgb(220, 226, 232)");
    document.documentElement.style.setProperty("--interactive-accent", "rgb(123, 162, 255)");
    document.documentElement.style.setProperty("--text-selection", "rgba(123, 162, 255, 0.28)");
    document.documentElement.style.setProperty("--background-modifier-hover", "rgba(255, 255, 255, 0.08)");

    expect(getTerminalTheme("dark")).toEqual(
      expect.objectContaining({
        background: "rgb(20, 21, 24)",
        foreground: "rgb(220, 226, 232)",
        cursor: "rgb(123, 162, 255)",
        cursorAccent: "rgb(20, 21, 24)",
        selectionBackground: "rgba(123, 162, 255, 0.28)",
        selectionInactiveBackground: "rgba(255, 255, 255, 0.08)",
      }),
    );
  });

  it("reads light theme colors from Obsidian CSS variables", () => {
    document.documentElement.style.setProperty("--background-primary", "rgb(255, 255, 255)");
    document.documentElement.style.setProperty("--text-normal", "rgb(34, 39, 46)");
    document.documentElement.style.setProperty("--interactive-accent", "rgb(8, 109, 221)");
    document.documentElement.style.setProperty("--text-selection", "rgba(8, 109, 221, 0.22)");
    document.documentElement.style.setProperty("--background-modifier-hover", "rgba(15, 23, 42, 0.08)");

    expect(getTerminalTheme("light")).toEqual(
      expect.objectContaining({
        background: "rgb(255, 255, 255)",
        foreground: "rgb(34, 39, 46)",
        cursor: "rgb(8, 109, 221)",
        cursorAccent: "rgb(255, 255, 255)",
        selectionBackground: "rgba(8, 109, 221, 0.22)",
        selectionInactiveBackground: "rgba(15, 23, 42, 0.08)",
      }),
    );
  });

  it("falls back to built-in colors when CSS variables are unavailable", () => {
    document.documentElement.removeAttribute("style");

    expect(getTerminalTheme("dark")).toEqual(
      expect.objectContaining({
        background: "#111827",
        foreground: "#e5e7eb",
        cursor: "#e5e7eb",
      }),
    );
  });
});
