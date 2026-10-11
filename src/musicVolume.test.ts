import { describe, expect, it } from "vitest";
import { musicVolumeAt } from "./musicVolume";

const d = [{ from: 50, to: 60 }];
describe("musicVolumeAt", () => {
  it("is the base volume away from windows", () => {
    expect(musicVolumeAt(0, d, 0.2)).toBeCloseTo(0.2);
    expect(musicVolumeAt(100, d, 0.2)).toBeCloseTo(0.2);
    expect(musicVolumeAt(10, [], 0.5)).toBeCloseTo(0.5);
  });
  it("is silent inside a window", () => {
    expect(musicVolumeAt(50, d, 0.2)).toBe(0);
    expect(musicVolumeAt(55, d, 0.2)).toBe(0);
    expect(musicVolumeAt(60, d, 0.2)).toBe(0);
  });
  it("ramps over 6 frames either side", () => {
    expect(musicVolumeAt(47, d, 1)).toBeCloseTo(0.5);
    expect(musicVolumeAt(44, d, 1)).toBeCloseTo(1);
    expect(musicVolumeAt(63, d, 1)).toBeCloseTo(0.5);
    expect(musicVolumeAt(66, d, 1)).toBeCloseTo(1);
  });
  it("takes the lowest of overlapping ramps", () => {
    expect(musicVolumeAt(53, [{ from: 50, to: 52 }, { from: 56, to: 58 }], 1)).toBeCloseTo(1 / 6);
  });
});
