import type { Word } from "./types";

/** transcript word (lowercase, no punctuation) → what the caption should say */
export const FIXES: Record<string, string> = {
  postees: "Postiz",
  posties: "Postiz",
  postis: "Postiz",
  posters: "Postiz",
  "post is": "Postiz",
  "post its": "Postiz",
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
const MAX_MARKER_TOKENS = 12;

const dropNonSpeech = (captions: Caption[]): Caption[] => {
  const out: Caption[] = [];
  for (let i = 0; i < captions.length; i++) {
    const c = captions[i];
    const t = c.text.trim();
    if (/^[\[(]/.test(t) && !/^[\[(].*[\])]$/.test(t)) {
      if (/[\])]/.test(t)) continue; // opener and closer in one token, e.g. " (almost),"
      // Multi-token marker: swallow up to the closing token, but only if it arrives soon.
      let close = -1;
      for (let j = i + 1; j < captions.length && j <= i + MAX_MARKER_TOKENS; j++) {
        if (/[\])]/.test(captions[j].text)) {
          close = j;
          break;
        }
      }
      if (close !== -1) {
        i = close;
        continue;
      }
      // No closer: it was real speech, keep the tokens.
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
  const norm = (t: string) => t.trim().toLowerCase().replace(/[^\p{L}\p{N}'-]/gu, "");
  const multi = Object.keys(FIXES).filter((k) => k.includes(" ")).map((k) => k.split(" "));
  for (let i = 0; i < merged.length; i++) {
    let c = merged[i];
    const hit = multi.find((parts) => parts.every((p, j) => merged[i + j] && norm(merged[i + j].text) === p));
    if (hit) {
      const last = merged[i + hit.length - 1];
      const trail = last.text.trim().match(/(\W*)$/)![1];
      c = { text: FIXES[hit.join(" ")] + trail, startMs: c.startMs, endMs: last.endMs };
      i += hit.length - 1;
    }
    const text = applyFixes(c.text.trim());
    if (!text) continue;
    const startFrame = Math.round((c.startMs / 1000) * fps);
    const endFrame = Math.max(startFrame + 1, Math.round((c.endMs / 1000) * fps));
    out.push({ text, startFrame, endFrame });
  }
  return out;
};

/**
 * Move words transcribed from a single take onto the joined timeline: add the take's start frame
 * and clamp into [startFrame, endFrame]. Words starting 3+ frames past the take end lie in the
 * silence pad whisper was given and are hallucinations, so they are dropped. A final word that would
 * be clamped to under 4 frames is extended backwards (trimming the previous word if it runs into it) so it shows.
 */
export const offsetWords = (words: Word[], startFrame: number, endFrame: number): Word[] => {
  const len = endFrame - startFrame;
  const out: Word[] = [];
  let prevEnd = startFrame;
  for (const w of words) {
    if (w.startFrame >= len + 3) continue;
    let s = Math.min(Math.max(w.startFrame + startFrame, startFrame), endFrame - 1);
    let e = Math.min(Math.max(w.endFrame + startFrame, s + 1), endFrame);
    if (w.endFrame + startFrame >= endFrame && endFrame - s < 4) {
      s = Math.min(Math.max(prevEnd, endFrame - 6), endFrame - 4);
      e = endFrame;
      // The previous word may have been stretched over this one; trim it so the final word shows.
      const prev = out[out.length - 1];
      if (prev && prev.endFrame > s) prev.endFrame = Math.max(prev.startFrame + 1, s);
    }
    out.push({ ...w, startFrame: s, endFrame: e });
    prevEnd = e;
  }
  return out;
};
