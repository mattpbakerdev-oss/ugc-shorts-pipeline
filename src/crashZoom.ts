import { interpolate } from "remotion";

export const CRASH_EASE = 4;
export const SHAKE_FRAMES = 2;
export const SHAKE_PX = 8;

/** Extra scale multiplier: ease-out in over 4 frames from the enter frame, snap back to 1 at exit. */
export const crashScaleAt = (frame: number, enter: number, exit: number, scale: number): number => {
  if (frame < enter || frame >= exit) return 1;
  const t = interpolate(frame, [enter, enter + CRASH_EASE], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const eased = 1 - (1 - t) * (1 - t);
  return 1 + (scale - 1) * eased;
};

/** Alternating +-8 px shake for the first 2 frames. */
export const crashShakeAt = (frame: number, enter: number): { x: number; y: number } => {
  const k = frame - enter;
  if (k < 0 || k >= SHAKE_FRAMES) return { x: 0, y: 0 };
  return k % 2 === 0 ? { x: SHAKE_PX, y: -SHAKE_PX } : { x: -SHAKE_PX, y: SHAKE_PX };
};
