import type { Word } from "./types";

/** transcript word (lowercase, no punctuation) → what the caption should say */
export const FIXES: Record<string, string> = {
  postees: "Postiz",
  posties: "Postiz",
  postis: "Postiz",
  posters: "Postiz",
  "post is": "Postiz",
  "post-it's": "Postiz",
  "post-its": "Postiz",
  tiktok: "TikTok",
  "tik tok": "TikTok",
  youtube: "YouTube",
  instagram: "Instagram",
  facebook: "Facebook",
};

export const applyFixes = (text: string): string => {
  const m = text.match(/^(\W*)(.*?)(\W*)$/);
  if (!m) return text;
  const [, lead, core, trail] = m;
  const fixed = FIXES[core.toLowerCase()];
  return fixed ? `${lead}${fixed}${trail}` : text;
};

/**
 * whisper.cpp emits markers like [BLANK_AUDIO], [silence], (music). Any token that is wholly
 * bracketed is dropped, as are punctuation-only tokens. Side effect: a genuinely spoken
 * parenthesised token such as "(almost)" would also be dropped; acceptable, whisper does not
 * normally emit parentheses around real speech.
 */
const isNonSpeech = (text: string): boolean => {
  const t = text.trim();
  if (/^[\[(].*[\])]$/.test(t)) return true;
  // Standalone punctuation-only tokens (leading space) go; unspaced ones ("," after "Hooks") must
  // survive to be merged into the previous word.
  return t.length > 0 && /^\s/.test(text) && !/[\p{L}\p{N}]/u.test(t);
};

type Caption = { text: string; startMs: number; endMs: number };

/**
 * Whisper emits sub-word tokens; a token without a leading space continues the
 * previous word ("Hook" + "s", "behind" + "."), so merge those before timing.
 */
export const captionsToWords = (captions: Caption[], fps: number): Word[] => {
  captions = captions.filter((c) => !isNonSpeech(c.text));
  const merged: Caption[] = [];
  for (const c of captions) {
    const prev = merged[merged.length - 1];
    if (prev && c.text.trim() && !/^\s/.test(c.text)) {
      prev.text += c.text;
      prev.endMs = c.endMs;
    } else {
      merged.push({ ...c });
    }
  }
  const out: Word[] = [];
  for (const c of merged) {
    const text = applyFixes(c.text.trim());
    if (!text) continue;
    const startFrame = Math.round((c.startMs / 1000) * fps);
    const endFrame = Math.max(startFrame + 1, Math.round((c.endMs / 1000) * fps));
    out.push({ text, startFrame, endFrame });
  }
  return out;
};
