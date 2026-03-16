import { describe, expect, it } from "vitest";
import { mapTerminalKeyEvent } from "../src/terminal/xterm-adapter";

function createKeyboardEvent(overrides: Partial<KeyboardEvent> = {}): KeyboardEvent {
  return {
    type: "keydown",
    key: "",
    ctrlKey: false,
    metaKey: false,
    altKey: false,
    shiftKey: false,
    preventDefault() {},
    ...overrides,
  } as KeyboardEvent;
}

describe("mapTerminalKeyEvent", () => {
  it("maps Alt+Backspace to ESC+DEL for shell word deletion", () => {
    const event = createKeyboardEvent({
      altKey: true,
      key: "Backspace",
    });

    expect(mapTerminalKeyEvent(event, "linux")).toEqual({
      action: "send",
      data: "\u001b\u007f",
    });
  });

  it("maps Alt+Backspace to ESC+Backspace on Windows", () => {
    const event = createKeyboardEvent({
      altKey: true,
      key: "Backspace",
    });

    expect(mapTerminalKeyEvent(event, "win32")).toEqual({
      action: "send",
      data: "\u001b\b",
    });
  });

  it("recognizes copy shortcut", () => {
    const event = createKeyboardEvent({
      ctrlKey: true,
      shiftKey: true,
      key: "C",
    });

    expect(mapTerminalKeyEvent(event)).toEqual({
      action: "copy",
    });
  });

  it("recognizes paste shortcut", () => {
    const event = createKeyboardEvent({
      ctrlKey: true,
      shiftKey: true,
      key: "V",
    });

    expect(mapTerminalKeyEvent(event)).toEqual({
      action: "paste",
    });
  });

  it("leaves unrelated keys to xterm", () => {
    const event = createKeyboardEvent({
      key: "a",
    });

    expect(mapTerminalKeyEvent(event)).toEqual({
      action: "pass",
    });
  });
});
