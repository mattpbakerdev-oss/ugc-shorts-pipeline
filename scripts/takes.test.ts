import { describe, expect, it } from "vitest";
import { assertOverrideTakes, buildTakes } from "./takes";

describe("buildTakes", () => {
  it("lays takes end to end from frame 0", () => {
    expect(
      buildTakes([
        { file: "1 hook.mp4", frames: 120 },
        { file: "2 tip1.mp4", frames: 300 },
      ]),
    ).toEqual([
      { file: "1 hook.mp4", startFrame: 0, endFrame: 120 },
      { file: "2 tip1.mp4", startFrame: 120, endFrame: 420 },
    ]);
  });

  it("rejects a take with no frames", () => {
    expect(() => buildTakes([{ file: "x.mp4", frames: 0 }])).toThrow(/x\.mp4/);
  });
});

describe("assertOverrideTakes", () => {
  it("throws for an override beyond the take count", () => {
    expect(() => assertOverrideTakes("v", [{ take: 4 }], 3)).toThrow(/take 4.*3 takes/);
    expect(() => assertOverrideTakes("v", [{ take: 3 }], 3)).not.toThrow();
  });
});
