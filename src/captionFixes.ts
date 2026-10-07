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

type Caption = { text: string; startMs: number; endMs: number };

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


/**
 * Drops non-speech tokens. whisper.cpp may also split a marker into sub-tokens (" [", "BL", "ANK",
 * "_", "AUD", "IO", "]"), so a token opening a bracket without closing it swallows everything up to
 * the token that closes it.
 */
const dropNonSpeech = (captions: Caption[]): Caption[] => {
  const out: Caption[] = [];
  let inMarker = false;
  for (const c of captions) {
    const t = c.text.trim();
    if (inMarker) {
      if (/[\])]/.test(t)) inMarker = false;
      continue;
    }
    if (/^[\[(]/.test(t) && !/[\])]$/.test(t)) {
      inMarker = true;
      continue;
    }
    if (isNonSpeech(c.text)) continue;
    out.push(c);
  }
  return out;
};

/**
 * Whisper emits sub-word tokens; a token without a leading space continues the
 * previous word ("Hook" + "s", "behind" + "."), so merge those before timing.
 */
export const captionsToWords = (captions: Caption[], fps: number): Word[] => {
  captions = dropNonSpeech(captions);
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

/**
 * Move words transcribed from a single take onto the joined timeline: add the take's start frame,
 * clamp into [startFrame, endFrame] and keep every word at least one frame long.
 */
export const offsetWords = (words: Word[], startFrame: number, endFrame: number): Word[] =>
  words.map((w) => {
    const s = Math.min(Math.max(w.startFrame + startFrame, startFrame), endFrame - 1);
    const e = Math.min(Math.max(w.endFrame + startFrame, s + 1), Math.max(endFrame, s + 1));
    return { ...w, startFrame: s, endFrame: e };
  });
