import { interpolate } from "remotion";
import type { Take } from "./types";

export const PUNCH_SCALE = 1.08;
export const HOOK_PUSH = 1.02;

export const punchInSchedule = (takes: Take[]) =>
  takes.map((t, i) => ({ startFrame: t.startFrame, endFrame: t.endFrame, scale: i % 2 === 0 ? 1 : PUNCH_SCALE }));

export const scaleAtFrame = (takes: Take[], frame: number): number => {
  const schedule = punchInSchedule(takes);
  const found = schedule.findIndex((s) => frame >= s.startFrame && frame < s.endFrame);
  const entry = schedule[Math.max(0, found)];
  const base = entry.scale;
  if (found === 0) {
    const push = interpolate(frame, [entry.startFrame, entry.endFrame - 1], [1, HOOK_PUSH], {
      extrapolateLeft: "clamp", extrapolateRight: "clamp",
    });
    return base * push;
  }
  return base;
};
