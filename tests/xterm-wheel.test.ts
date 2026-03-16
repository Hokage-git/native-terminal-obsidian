import { describe, expect, it } from "vitest";
import { getWheelScrollAmount } from "../src/terminal/xterm-adapter";

describe("getWheelScrollAmount", () => {
  it("scrolls up for negative wheel delta", () => {
    expect(getWheelScrollAmount(-120)).toBe(-3);
  });

  it("scrolls down for positive wheel delta", () => {
    expect(getWheelScrollAmount(120)).toBe(3);
  });

  it("does not scroll for zero delta", () => {
    expect(getWheelScrollAmount(0)).toBe(0);
  });
});
