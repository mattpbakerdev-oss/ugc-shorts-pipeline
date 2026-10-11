import type { ResolvedMoment } from "../types";

/** Frame windows [from, to) where a full-frame cutaway hides titles and graphics. */
export const overlayGaps = (moments: ResolvedMoment[]): { from: number; to: number }[] =>
  moments.filter((m) => m.cutaway).map((m) => ({ from: m.enterFrame, to: m.exitFrame })).sort((a, b) => a.from - b.from);

export const inOverlayGap = (gaps: { from: number; to: number }[], frame: number): boolean =>
  gaps.some((g) => frame >= g.from && frame < g.to);

/** Windows where section titles and hook chips hide: cutaways plus freezes (the freeze chip owns the top band). */
export const titleGaps = (moments: ResolvedMoment[]): { from: number; to: number }[] =>
  moments.filter((m) => m.cutaway || m.freeze).map((m) => ({ from: m.enterFrame, to: m.exitFrame })).sort((a, b) => a.from - b.from);
