const HEAD_PAD = 0.3;
const TAIL_PAD = 0.35;
// How close to the end a silence must finish to count as "trailing". Callers should pass the AUDIO
// stream length (iPhone audio ends ~0.3s before the video); 0.5s also absorbs that gap if they pass
// the container duration instead.
const END_TOLERANCE = 0.5;

type Span = { start: number; end: number };

const parseSpans = (stderr: string): Span[] => {
  const spans: Span[] = [];
  let open: number | null = null;
  for (const line of stderr.split("\n")) {
    const s = line.match(/silence_start:\s*([\d.]+)/);
    const e = line.match(/silence_end:\s*([\d.]+)/);
    if (s) open = Number(s[1]);
    if (e && open !== null) {
      spans.push({ start: open, end: Number(e[1]) });
      open = null;
    }
  }
  return spans;
};

export const parseSilence = (
  stderr: string,
  duration: number,
): { speechStart: number; speechEnd: number } => {
  const spans = parseSpans(stderr);
  let speechStart = 0;
  let speechEnd = duration;
  const first = spans[0];
  if (first && first.start <= 0.05) speechStart = Math.max(0, first.end - HEAD_PAD);
  const last = spans[spans.length - 1];
  if (last && last.end >= duration - END_TOLERANCE) speechEnd = Math.min(duration, last.start + TAIL_PAD);
  return {
    speechStart: Number(speechStart.toFixed(3)),
    speechEnd: Number(speechEnd.toFixed(3)),
  };
};
