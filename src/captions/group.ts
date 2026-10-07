import type { Word } from "../types";

export type CaptionGroup = { startFrame: number; endFrame: number; words: Word[]; lines: Word[][] };

export const MAX_LINE_CHARS = 18;
const MAX_LINES = 2;

/** Greedy line packing; returns null if the words do not fit in MAX_LINES lines. */
const packLines = (words: Word[]): Word[][] | null => {
  const lines: Word[][] = [];
  let len = 0;
  for (const w of words) {
    const cur = lines[lines.length - 1];
    if (cur && len + 1 + w.text.length <= MAX_LINE_CHARS) {
      cur.push(w);
      len += 1 + w.text.length;
    } else {
      lines.push([w]);
      len = w.text.length;
    }
  }
  return lines.length <= MAX_LINES ? lines : null;
};

const MAX_WORDS = 4;
const MAX_CHARS = 30;
const PAUSE_SECONDS = 0.6;
const HOLD_SECONDS = 1;

export const groupWords = (
  words: Word[],
  opts: { fps: number; takeBoundaries: number[] },
): CaptionGroup[] => {
  const pause = Math.round(PAUSE_SECONDS * opts.fps);
  const hold = Math.round(HOLD_SECONDS * opts.fps);
  const boundaries = [...opts.takeBoundaries].sort((a, b) => a - b);
  const crossesBoundary = (prev: Word, next: Word) =>
    boundaries.some((b) => prev.startFrame < b && next.startFrame >= b);

  const chunks: Word[][] = [];
  let current: Word[] = [];
  let chars = 0;
  for (const w of words) {
    const prev = current[current.length - 1];
    const wouldBreak =
      current.length >= MAX_WORDS ||
      chars + w.text.length + (current.length ? 1 : 0) > MAX_CHARS ||
      (prev && w.startFrame - prev.endFrame > pause) ||
      (prev && crossesBoundary(prev, w)) ||
      (prev && /[.!?]$/.test(prev.text)) ||
      (current.length > 0 && packLines([...current, w]) === null);
    if (current.length && wouldBreak) {
      chunks.push(current);
      current = [];
      chars = 0;
    }
    current.push(w);
    chars += w.text.length + (current.length > 1 ? 1 : 0);
  }
  if (current.length) chunks.push(current);

  return chunks.map((ws, i) => {
    const last = ws[ws.length - 1];
    const next = chunks[i + 1]?.[0];
    const endFrame = next ? Math.min(last.endFrame + hold, next.startFrame) : last.endFrame + hold;
    return { startFrame: ws[0].startFrame, endFrame, words: ws, lines: packLines(ws) ?? [ws] };
  });
};
