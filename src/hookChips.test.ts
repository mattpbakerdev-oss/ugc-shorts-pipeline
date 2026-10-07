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
