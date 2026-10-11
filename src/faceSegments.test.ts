import { describe, expect, it } from "vitest";
import { faceSegments, sourceFrameAt } from "./faceSegments";

describe("faceSegments", () => {
  it("is one play segment without freezes", () => {
    expect(faceSegments([], 100)).toEqual([{ kind: "play", from: 0, length: 100, sourceStart: 0 }]);
  });
  it("splits around freezes and offsets later source starts", () => {
    const f = [{ atFrame: 30, lengthFrames: 24, text: "a" }, { atFrame: 80, lengthFrames: 10, text: "b" }];
    expect(faceSegments(f, 120)).toEqual([
      { kind: "play", from: 0, length: 30, sourceStart: 0 },
      { kind: "freeze", from: 30, length: 24, sourceStart: 30 },
      { kind: "play", from: 54, length: 26, sourceStart: 30 },
      { kind: "freeze", from: 80, length: 10, sourceStart: 56 },
      { kind: "play", from: 90, length: 30, sourceStart: 56 },
    ]);
  });
  it("omits empty play segments (freeze at 0 or at the end)", () => {
    expect(faceSegments([{ atFrame: 0, lengthFrames: 5, text: "" }], 5)).toEqual([{ kind: "freeze", from: 0, length: 5, sourceStart: 0 }]);
  });
  it("sourceFrameAt agrees with the segments", () => {
    const f = [{ atFrame: 30, lengthFrames: 24, text: "a" }];
    expect(sourceFrameAt(f, 29)).toBe(29);
    expect(sourceFrameAt(f, 30)).toBe(30);
    expect(sourceFrameAt(f, 53)).toBe(30);
    expect(sourceFrameAt(f, 54)).toBe(30);
    expect(sourceFrameAt(f, 60)).toBe(36);
  });
});
