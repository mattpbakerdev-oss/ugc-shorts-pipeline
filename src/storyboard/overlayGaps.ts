import type { ResolvedMoment } from "../types";

/** Frame windows [from, to) where a full-frame cutaway hides titles and graphics. */
export const overlayGaps = (moments: ResolvedMoment[]): { from: number; to: number }[] =>
  moments.filter((m) => m.cutaway).map((m) => ({ from: m.enterFrame, to: m.exitFrame })).sort((a, b) => a.from - b.from);

export const inOverlayGap = (gaps: { from: number; to: number }[], frame: number): boolean =>
  gaps.some((g) => frame >= g.from && frame < g.to);
