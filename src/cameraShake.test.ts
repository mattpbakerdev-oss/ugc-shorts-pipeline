import { describe, expect, it } from "vitest";
import { CAMERA_SHAKE_DEFAULT, cameraShakeAt, cameraShakeCoverAt, cameraShakeOffsetAt } from "./cameraShake";

describe("cameraShakeAt", () => {
  const { frames, px } = CAMERA_SHAKE_DEFAULT;
  it("defaults to 8 frames of 14 px", () => {
    expect(CAMERA_SHAKE_DEFAULT).toEqual({ frames: 8, px: 14 });
  });
  it("is zero before the enter frame and from the end of the window", () => {
    expect(cameraShakeAt(9, 10, frames, px)).toEqual({ x: 0, y: 0 });
    expect(cameraShakeAt(10 + frames, 10, frames, px)).toEqual({ x: 0, y: 0 });
  });
  it("hits the full amplitude on the first frame", () => {
    const s = cameraShakeAt(10, 10, frames, px);
    expect(Math.max(Math.abs(s.x), Math.abs(s.y))).toBe(px);
  });
  it("alternates direction on x every frame", () => {
    for (let k = 1; k < frames; k++) {
      const a = cameraShakeAt(10 + k - 1, 10, frames, px);
      const b = cameraShakeAt(10 + k, 10, frames, px);
      expect(Math.sign(a.x) * Math.sign(b.x)).toBe(-1);
    }
  });
  it("decays over the window", () => {
    const mag = (k: number) => { const s = cameraShakeAt(10 + k, 10, frames, px); return Math.hypot(s.x, s.y); };
    for (let k = 1; k < frames; k++) expect(mag(k)).toBeLessThan(mag(k - 1));
    expect(mag(frames - 1)).toBeGreaterThan(0);
  });
  it("honours custom frames and px", () => {
    expect(cameraShakeAt(3, 0, 3, 20)).toEqual({ x: 0, y: 0 });
    expect(Math.max(Math.abs(cameraShakeAt(0, 0, 3, 20).x), Math.abs(cameraShakeAt(0, 0, 3, 20).y))).toBe(20);
  });
});

describe("cameraShakeOffsetAt", () => {
  const m = (enterFrame: number, shake?: { frames: number; px: number }) =>
    ({ enterFrame, exitFrame: enterFrame + (shake?.frames ?? 1), zone: "full" as const, cameraShake: shake });
  it("is zero when no moment shakes", () => {
    expect(cameraShakeOffsetAt([m(0), m(5)], 5)).toEqual({ x: 0, y: 0, scale: 1 });
  });
  it("returns the shaking moment's offset", () => {
    expect(cameraShakeOffsetAt([m(0), m(10, { frames: 8, px: 14 })], 10)).toMatchObject(cameraShakeAt(10, 10, 8, 14));
  });
  it("sums overlapping shakes", () => {
    const a = cameraShakeAt(11, 10, 8, 14);
    const b = cameraShakeAt(11, 11, 4, 20);
    expect(cameraShakeOffsetAt([m(10, { frames: 8, px: 14 }), m(11, { frames: 4, px: 20 })], 11)).toMatchObject({ x: a.x + b.x, y: a.y + b.y });
  });
});

describe("cameraShakeCoverAt", () => {
  const { frames, px } = CAMERA_SHAKE_DEFAULT;
  const W = 1080, H = 1920;
  it("is exactly 1 outside the shake window", () => {
    expect(cameraShakeCoverAt(9, 10, frames, px, W, H)).toBe(1);
    expect(cameraShakeCoverAt(10 + frames, 10, frames, px, W, H)).toBe(1);
  });
  it("scales just enough that the shifted layer still covers the frame on every shake frame", () => {
    for (let k = 0; k < frames; k++) {
      const s = cameraShakeAt(10 + k, 10, frames, px);
      const cover = cameraShakeCoverAt(10 + k, 10, frames, px, W, H);
      expect(cover).toBeGreaterThan(1);
      expect(((cover - 1) * W) / 2).toBeGreaterThanOrEqual(Math.abs(s.x));
      expect(((cover - 1) * H) / 2).toBeGreaterThanOrEqual(Math.abs(s.y));
      expect(cover).toBeLessThan(1.05);
    }
  });
  it("sums per-moment cover into the offset helper's scale", () => {
    const m = [{ enterFrame: 10, cameraShake: { frames, px } }];
    expect(cameraShakeOffsetAt(m, 10, W, H).scale).toBe(cameraShakeCoverAt(10, 10, frames, px, W, H));
    expect(cameraShakeOffsetAt(m, 0, W, H).scale).toBe(1);
  });
});
