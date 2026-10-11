import { describe, expect, it } from "vitest";
import { partsPlan } from "./parts";

describe("partsPlan", () => {
  it("resolves parts in order with labels and absolute paths", () => {
    const plan = partsPlan({ dir: "/src/Batch", parts: ["viral/v00_cold.mp4", "viral/v01_hook_a.mov"] });
    expect(plan).toEqual([
      { file: "viral/v00_cold.mp4", absPath: "/src/Batch/viral/v00_cold.mp4", label: "v00_cold" },
      { file: "viral/v01_hook_a.mov", absPath: "/src/Batch/viral/v01_hook_a.mov", label: "v01_hook_a" },
    ]);
  });
  it("throws on empty parts", () => {
    expect(() => partsPlan({ dir: "/src", parts: [] })).toThrow(/no parts/i);
  });
  it("throws on duplicate labels", () => {
    expect(() => partsPlan({ dir: "/src", parts: ["a/x.mp4", "b/x.mp4"] })).toThrow(/duplicate.*x/i);
  });
});
