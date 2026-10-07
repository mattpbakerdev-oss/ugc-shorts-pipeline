import { describe, expect, it } from "vitest";
import { punchInSchedule, scaleAtFrame } from "./punchIn";
import type { Take } from "./types";

const takes: Take[] = [
  { file: "1", startFrame: 0, endFrame: 60 },
  { file: "2", startFrame: 60, endFrame: 120 },
  { file: "3", startFrame: 120, endFrame: 150 },
];

describe("punchInSchedule", () => {
  it("alternates 1 and 1.08 starting at 1", () => {
    expect(punchInSchedule(takes).map((s) => s.scale)).toEqual([1, 1.08, 1]);
  });
});

describe("scaleAtFrame", () => {
  it("pushes in across the hook take from 1.0 to 1.02", () => {
    expect(scaleAtFrame(takes, 0)).toBeCloseTo(1.0, 5);
    expect(scaleAtFrame(takes, 59)).toBeCloseTo(1.02, 2);
  });
  it("uses the take's punch scale after the hook", () => {
    expect(scaleAtFrame(takes, 90)).toBeCloseTo(1.08, 5);
    expect(scaleAtFrame(takes, 140)).toBeCloseTo(1, 5);
  });
});
