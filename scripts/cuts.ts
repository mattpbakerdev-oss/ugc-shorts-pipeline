export type Range = { from: number; to: number };

/** Kept ranges of [0, duration] after removing `cuts`: sorted, merged, clamped. Throws if nothing remains. */
export const keptSegments = (duration: number, cuts: Range[], fps = 30): Range[] => {
  const sorted = cuts
    .map((c) => ({ from: Math.max(0, c.from), to: Math.min(duration, c.to) }))
    .filter((c) => c.to > c.from)
    .sort((a, b) => a.from - b.from);
  const merged: Range[] = [];
  for (const c of sorted) {
    const last = merged[merged.length - 1];
    if (last && c.from <= last.to) last.to = Math.max(last.to, c.to);
    else merged.push({ ...c });
  }
  const kept: Range[] = [];
  let cursor = 0;
  for (const c of merged) {
    if (c.from > cursor) kept.push({ from: cursor, to: c.from });
    cursor = c.to;
  }
  if (cursor < duration) kept.push({ from: cursor, to: duration });
  if (kept.length === 0) throw new Error(`Cuts remove the entire take (${duration}s); nothing would be kept`);
  // Snap to the frame grid so video and audio trims agree; drop sub-frame slivers.
  const snapped = kept
    .map((g) => ({ from: Math.round(g.from * fps) / fps, to: Math.round(g.to * fps) / fps }))
    .filter((g) => g.to - g.from > 0.5 / fps);
  if (snapped.length === 0) throw new Error(`Cuts leave less than one frame of the take (${duration}s)`);
  return snapped;
};
