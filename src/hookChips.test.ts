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
  it("shrinks so chips fit a short band", () => {
    const band = 190;
    const f = hookChipFontSize(band, 2);
    expect(f).toBeLessThan(56);
    expect(2 * (f * 1.1 + 2 * CHIP_PAD_Y + 8) + CHIP_GAP).toBeLessThanOrEqual(band + 1e-9);
  });
  it("is limited by width", () => {
    const f = hookChipFontSize(365, 3, 518, 12);
    expect(f).toBeCloseTo((518 - 64 - 56) / (12 * 0.62), 6);
    expect(f).toBeGreaterThanOrEqual(48);
  });
  it("throws naming the hook when below 36px", () => {
    expect(() => hookChipFontSize(211, 3, 518, 12, "A // B // C")).toThrow(/A \/\/ B \/\/ C.*hookBox/);
    expect(() => hookChipFontSize(365, 3, 300, 12, "H")).toThrow(/hookBox/);
  });
});
