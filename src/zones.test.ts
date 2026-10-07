import { describe, expect, it } from "vitest";
import { DEFAULT_FACE_BOX, rectToStyle, zonesFor } from "./zones";
import type { Rect } from "./types";

const overlaps = (a: Rect, b: Rect) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

describe("title band guard", () => {
  it("throws when the face is too high for the title band", () => {
    expect(() => zonesFor({ x: 0.1, y: 0.10, w: 0.5, h: 0.4 })).toThrow(/title band/);
  });
  it("accepts a face box with room for the band", () => {
    const z = zonesFor({ x: 0.04, y: 0.16, w: 0.44, h: 0.34 });
    expect(z.topBand.y + z.topBand.h).toBeLessThanOrEqual(0.14 + 1e-9);
  });
});

describe("zonesFor", () => {
  const z = zonesFor(DEFAULT_FACE_BOX);

  it("accepts the default face box with captions at 0.80", () => {
    expect(() => zonesFor(DEFAULT_FACE_BOX)).not.toThrow();
    expect(Math.abs(z.captions.y - 0.80)).toBeLessThan(1e-9);
  });

  it("keeps the face box as given", () => {
    expect(z.face).toEqual(DEFAULT_FACE_BOX);
  });

  it("never lets side zones overlap the face", () => {
    expect(overlaps(z.left, z.face)).toBe(false);
    expect(overlaps(z.right, z.face)).toBe(false);
  });

  it("puts captions below the face and above the platform UI", () => {
    expect(z.captions.y).toBeGreaterThanOrEqual(z.face.y + z.face.h);
    expect(z.captions.y + z.captions.h).toBeLessThanOrEqual(z.platformUi.y + 1e-9);
  });

  it("moves the side zones when the face moves", () => {
    const moved = zonesFor({ x: 0.1, y: 0.3, w: 0.4, h: 0.42 });
    expect(moved.left.w).toBeLessThan(z.left.w);
    expect(moved.right.w).toBeGreaterThan(z.right.w);
    expect(moved.captions.y).toBeCloseTo(0.74, 5);
  });

  it("clamps so a face at the edge still yields non-negative zones", () => {
    const edge = zonesFor({ x: 0, y: 0.2, w: 0.5, h: 0.5 });
    expect(edge.left.w).toBe(0);
  });

  it("keeps the default left/right widths at 0.15/0.17", () => {
    expect(z.left.w).toBeCloseTo(0.15, 5);
    expect(z.right.w).toBeCloseTo(0.17, 5);
  });

  it("top band stays above a high face", () => {
    const high = zonesFor({ x: 0.06, y: 0.17, w: 0.38, h: 0.33 });
    expect(high.topBand.y + high.topBand.h).toBeLessThanOrEqual(0.15 + 1e-9);
    expect(z.topBand.h).toBeCloseTo(0.19, 5);
  });

  it("left zone has no width when the face hugs the left edge", () => {
    const hug = zonesFor({ x: 0.06, y: 0.17, w: 0.38, h: 0.33 });
    expect(hug.left.w).toBe(0);
    expect(hug.right.w).toBeCloseTo(0.49, 5);
  });

  it("throws when the face box leaves no room for captions", () => {
    expect(() => zonesFor({ x: 0.3, y: 0.3, w: 0.4, h: 0.5 })).toThrow(/captions/);
  });
});

describe("rectToStyle", () => {
  it("converts fractions to absolute pixels", () => {
    expect(rectToStyle({ x: 0.1, y: 0.2, w: 0.5, h: 0.25 }, 1080, 1920)).toEqual({
      position: "absolute",
      left: 108,
      top: 384,
      width: 540,
      height: 480,
    });
  });
});
