import { describe, expect, it } from "vitest";
import { inOverlayGap, overlayGaps, titleGaps } from "./overlayGaps";
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
  it("titleGaps adds freeze windows to cutaways", () => {
    const f = { ...m(30, 40), freeze: { lengthFrames: 10, text: "W" } } as ResolvedMoment;
    expect(titleGaps([f, m(5, 15, true), m(50, 60)])).toEqual([{ from: 5, to: 15 }, { from: 30, to: 40 }]);
    expect(overlayGaps([f, m(5, 15, true)])).toEqual([{ from: 5, to: 15 }]);
  });
});
