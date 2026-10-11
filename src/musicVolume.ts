import { interpolate } from "remotion";

export const DUCK_RAMP = 6;

/** Music gain at a frame: `base`, ramping to 0 over DUCK_RAMP frames before/after each window and 0 inside it. */
export const musicVolumeAt = (frame: number, ducking: { from: number; to: number }[], base: number): number => {
  let v = 1;
  for (const d of ducking) {
    const g = interpolate(frame, [d.from - DUCK_RAMP, d.from, d.to, d.to + DUCK_RAMP], [1, 0, 0, 1], {
      extrapolateLeft: "clamp", extrapolateRight: "clamp",
    });
    v = Math.min(v, g);
  }
  return v * base;
};
