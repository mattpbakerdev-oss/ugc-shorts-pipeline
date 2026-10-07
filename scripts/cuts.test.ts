import { describe, expect, it } from "vitest";
import { keptSegments } from "./cuts";

describe("keptSegments", () => {
  it("returns the full range with no cuts", () => {
    expect(keptSegments(10, [])).toEqual([{ from: 0, to: 10 }]);
  });
  it("splits around a middle cut", () => {
    expect(keptSegments(10, [{ from: 3, to: 5 }])).toEqual([{ from: 0, to: 3 }, { from: 5, to: 10 }]);
  });
  it("merges overlapping cuts", () => {
    expect(keptSegments(10, [{ from: 6, to: 8 }, { from: 2, to: 4 }, { from: 3, to: 7 }])).toEqual([
      { from: 0, to: 2 }, { from: 8, to: 10 },
    ]);
  });
  it("clamps a cut past the end", () => {
    expect(keptSegments(10, [{ from: 8, to: 99 }])).toEqual([{ from: 0, to: 8 }]);
  });
  it("throws when everything is cut", () => {
    expect(() => keptSegments(10, [{ from: 0, to: 10 }])).toThrow(/nothing/i);
  });
});
