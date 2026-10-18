import { describe, expect, it } from "vitest";
import { checkSource } from "./source";

describe("checkSource", () => {
  it("accepts a native 1080x1920 30 fps take with no scaling", () => {
    expect(checkSource("1 hook.mp4", { width: 1080, height: 1920, rotation: 0, fps: 30 })).toEqual({ scale: false });
  });
  it("accepts a 4K 60 fps take stored landscape with a -90 rotation tag, and asks for scaling", () => {
    expect(checkSource("1 hook.mp4", { width: 3840, height: 2160, rotation: -90, fps: 60 })).toEqual({ scale: true });
    expect(checkSource("1 hook.mp4", { width: 3840, height: 2160, rotation: 90, fps: 60 })).toEqual({ scale: true });
  });
  it("accepts an upright 2160x3840 take", () => {
    expect(checkSource("x.mp4", { width: 2160, height: 3840, rotation: 0, fps: 30 })).toEqual({ scale: true });
  });
  it("rejects a landscape take with no rotation", () => {
    expect(() => checkSource("x.mp4", { width: 3840, height: 2160, rotation: 0, fps: 30 })).toThrow(/x\.mp4 is 3840x2160.*9:16/);
  });
  it("rejects a 4:3 portrait take", () => {
    expect(() => checkSource("x.mp4", { width: 1440, height: 1920, rotation: 0, fps: 30 })).toThrow(/9:16/);
  });
  it("rejects frame rates below 30", () => {
    expect(() => checkSource("x.mp4", { width: 1080, height: 1920, rotation: 0, fps: 24 })).toThrow(/24 fps/);
  });
});
