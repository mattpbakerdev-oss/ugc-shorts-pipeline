import type { Word } from "./types";

const NUMBER_WORDS: Record<string, string> = {
  zero: "0", one: "1", two: "2", three: "3", four: "4", five: "5", six: "6", seven: "7",
  eight: "8", nine: "9", ten: "10", eleven: "11", twelve: "12", thirteen: "13", fourteen: "14",
  fifteen: "15", sixteen: "16", seventeen: "17", eighteen: "18", nineteen: "19", twenty: "20",
  thirty: "30", forty: "40", fifty: "50", sixty: "60", seventy: "70", eighty: "80", ninety: "90",
  hundred: "100", thousand: "1000",
};

export const normaliseToken = (t: string): string => {
  const core = t.toLowerCase().replace(/[^a-z0-9']/g, "");
  return NUMBER_WORDS[core] ?? core;
};

export class PhraseNotFoundError extends Error {
  constructor(phrase: string) {
    super(`Phrase not found in transcript: "${phrase}"`);
    this.name = "PhraseNotFoundError";
  }
}

export const findPhrase = (
  words: Word[],
  phrase: string,
  fromIndex = 0,
): { start: number; end: number } => {
  const target = phrase.split(/\s+/).map(normaliseToken).filter(Boolean);
  if (target.length === 0) throw new PhraseNotFoundError(phrase);
  const tokens = words.map((w) => normaliseToken(w.text));
  for (let i = fromIndex; i <= tokens.length - target.length; i++) {
    let ok = true;
    for (let j = 0; j < target.length; j++) {
      if (tokens[i + j] !== target[j]) { ok = false; break; }
    }
    if (ok) return { start: i, end: i + target.length - 1 };
  }
  throw new PhraseNotFoundError(phrase);
};
