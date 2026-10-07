export type Range = { from: number; to: number };

/** Kept ranges of [0, duration] after removing `cuts`: sorted, merged, clamped. Throws if nothing remains. */
export const keptSegments = (duration: number, cuts: Range[]): Range[] => {
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
  return kept;
};
