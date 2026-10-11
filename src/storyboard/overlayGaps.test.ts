import { describe, expect, it } from "vitest";
import { inOverlayGap, overlayGaps } from "./overlayGaps";
import type { ResolvedMoment } from "../types";

const m = (enter: number, exit: number, cutaway?: boolean) =>
  ({ enterFrame: enter, exitFrame: exit, cutaway: cutaway ? { file: "x", fromFrame: 0, toFrame: exit - enter } : undefined }) as ResolvedMoment;

describe("overlayGaps", () => {
  it("returns cutaway windows only, sorted", () => {
    const g = overlayGaps([m(50, 60, true), m(10, 20), m(5, 15, true)]);
    expect(g).toEqual([{ from: 5, to: 15 }, { from: 50, to: 60 }]);
    expect(inOverlayGap(g, 5)).toBe(true);
    expect(inOverlayGap(g, 15)).toBe(false);
    expect(inOverlayGap(g, 59)).toBe(true);
  });
});
