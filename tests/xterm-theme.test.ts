import { describe, expect, it } from "vitest";
import { getTerminalTheme } from "../src/terminal/xterm-adapter";

describe("getTerminalTheme", () => {
  it("uses Obsidian CSS variables in auto mode", () => {
    document.documentElement.style.setProperty("--background-primary", "rgb(16, 18, 22)");
    document.documentElement.style.setProperty("--text-normal", "rgb(226, 232, 240)");
    document.documentElement.style.setProperty("--interactive-accent", "rgb(0, 191, 165)");
    document.documentElement.style.setProperty("--text-selection", "rgba(0, 191, 165, 0.24)");
    document.documentElement.style.setProperty("--background-modifier-hover", "rgba(255, 255, 255, 0.08)");

    expect(getTerminalTheme("auto")).toEqual(
      expect.objectContaining({
        background: "rgb(16, 18, 22)",
        foreground: "rgb(226, 232, 240)",
        cursor: "rgb(0, 191, 165)",
        selectionBackground: "rgba(0, 191, 165, 0.24)",
      }),
    );
  });

  it("reads dark theme colors from Obsidian CSS variables", () => {
    expect(getTerminalTheme("dark")).toEqual(
      expect.objectContaining({
        background: "#111827",
        foreground: "#e5e7eb",
        cursor: "#e5e7eb",
        cursorAccent: "#111827",
        selectionBackground: "rgba(96, 165, 250, 0.28)",
        selectionInactiveBackground: "rgba(71, 85, 105, 0.35)",
      }),
    );
  });

  it("reads light theme colors from Obsidian CSS variables", () => {
    expect(getTerminalTheme("light")).toEqual(
      expect.objectContaining({
        background: "#f5f5f5",
        foreground: "#1f2933",
        cursor: "#2563eb",
        cursorAccent: "#f5f5f5",
        selectionBackground: "rgba(37, 99, 235, 0.22)",
        selectionInactiveBackground: "rgba(148, 163, 184, 0.28)",
      }),
    );
  });

  it("falls back to built-in colors when CSS variables are unavailable", () => {
    document.documentElement.removeAttribute("style");

    expect(getTerminalTheme("auto")).toEqual(
      expect.objectContaining({
        background: "#111827",
        foreground: "#e5e7eb",
        cursor: "#e5e7eb",
      }),
    );
  });
});
