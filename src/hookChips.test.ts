import { describe, expect, it } from "vitest";
import { splitHook } from "./hookChips";

describe("splitHook", () => {
  it("splits and trims on //", () => {
    expect(splitHook("Not using AI yet? // You're already behind")).toEqual(["Not using AI yet?", "You're already behind"]);
  });
  it("accepts a single chip", () => {
    expect(splitHook("Stop scrolling")).toEqual(["Stop scrolling"]);
  });
  it("throws naming the hook when more than 3 chips", () => {
    expect(() => splitHook("a // b // c // d")).toThrow(/a \/\/ b \/\/ c \/\/ d/);
  });
});

import { hookChipFontSize, CHIP_GAP, CHIP_PAD_Y } from "./hookChips";
describe("hookChipFontSize", () => {
  it("keeps 56 in a roomy band", () => {
    expect(hookChipFontSize(365, 3)).toBe(56);
  });
  it("shrinks so all chips fit a tight band", () => {
    const band = 211;
    const fs = hookChipFontSize(band, 3);
    expect(fs).toBeLessThan(56);
    for (const n of [1, 2, 3]) {
      const f = hookChipFontSize(band, n);
      expect(n * (f * 1.1 + 2 * CHIP_PAD_Y + 8) + (n - 1) * CHIP_GAP).toBeLessThanOrEqual(band + 1e-9);
    }
  });
});
