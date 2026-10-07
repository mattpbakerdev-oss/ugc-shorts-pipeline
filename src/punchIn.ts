import { interpolate } from "remotion";
import type { Take } from "./types";

export const PUNCH_SCALE = 1.08;
export const HOOK_PUSH = 1.02;

export const punchInSchedule = (takes: Take[]) =>
  takes.map((t, i) => ({ startFrame: t.startFrame, endFrame: t.endFrame, scale: i % 2 === 0 ? 1 : PUNCH_SCALE }));

export const scaleAtFrame = (takes: Take[], frame: number, _fps: number): number => {
  const i = takes.findIndex((t) => frame >= t.startFrame && frame < t.endFrame);
  const take = takes[Math.max(0, i)];
  const base = Math.max(0, i) % 2 === 0 ? 1 : PUNCH_SCALE;
  if (i === 0) {
    const push = interpolate(frame, [take.startFrame, take.endFrame - 1], [1, HOOK_PUSH], {
      extrapolateLeft: "clamp", extrapolateRight: "clamp",
    });
    return base * push;
  }
  return base;
};
