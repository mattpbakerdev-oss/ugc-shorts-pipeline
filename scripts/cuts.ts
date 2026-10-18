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

/**
 * Map take-local word frames measured on the UNCUT take onto the cut take: each kept segment is laid
 * end to end. A word is placed in the first kept segment it overlaps, clamped to that segment (at least
 * 1 frame): Whisper stretches a take's first word back over the leading silence a cut removes, so a word
 * that starts inside a cut but ends in kept audio is kept from the segment start. A word lying entirely
 * inside a removed range (a false start, a click) is dropped.
 */
export const mapWordsThroughKept = <W extends { startFrame: number; endFrame: number }>(words: W[], kept: Range[], fps = 30): W[] => {
  const segs = kept.map((g) => ({ from: Math.round(g.from * fps), to: Math.round(g.to * fps) }));
  const out: W[] = [];
  for (const w of words) {
    let offset = 0;
    for (const g of segs) {
      if (w.startFrame < g.to && w.endFrame > g.from) {
        const start = offset + (Math.max(w.startFrame, g.from) - g.from);
        const end = Math.max(start + 1, offset + (Math.min(w.endFrame, g.to) - g.from));
        out.push({ ...w, startFrame: start, endFrame: end });
        break;
      }
      offset += g.to - g.from;
    }
  }
  return out;
};
