import { describe, expect, it } from "vitest";
import { findPhrase, normaliseToken, PhraseNotFoundError } from "./phrase";
import type { Word } from "./types";

const w = (texts: string): Word[] =>
  texts.split(" ").map((text, i) => ({ text, startFrame: i * 10, endFrame: i * 10 + 8 }));

describe("normaliseToken", () => {
  it("lowercases, strips punctuation and maps number words", () => {
    expect(normaliseToken("Hooks.")).toBe("hooks");
    expect(normaliseToken("ten")).toBe("10");
    expect(normaliseToken("1,000")).toBe("1000");
    expect(normaliseToken("thousand")).toBe("1000");
    expect(normaliseToken("You're")).toBe("you're");
  });
});

describe("findPhrase", () => {
  const words = w("I ask for ten hook ideas and then I pick the best one. I ask again");

  it("finds a phrase and returns inclusive word indices", () => {
    expect(findPhrase(words, "10 hook ideas")).toEqual({ start: 3, end: 5 });
  });

  it("ignores case and punctuation in both phrase and words", () => {
    expect(findPhrase(words, "Pick the best one")).toEqual({ start: 9, end: 12 });
  });

  it("searches from an index so repeated phrases resolve in order", () => {
    expect(findPhrase(words, "I ask")).toEqual({ start: 0, end: 1 });
    expect(findPhrase(words, "I ask", 2)).toEqual({ start: 13, end: 14 });
  });

  it("throws a named error naming the phrase", () => {
    expect(() => findPhrase(words, "never said this")).toThrow(PhraseNotFoundError);
    expect(() => findPhrase(words, "never said this")).toThrow(/never said this/);
  });
});
