import { describe, expect, it } from "vitest";
import { applyFixes, captionsToWords, offsetWords } from "./captionFixes";

describe("applyFixes", () => {
  it("corrects known mis-hearings case-insensitively, keeping punctuation", () => {
    expect(applyFixes("postees")).toBe("Postiz");
    expect(applyFixes("Postees,")).toBe("Postiz,");
    expect(applyFixes("hello")).toBe("hello");
  });
});

describe("captionsToWords", () => {
  it("converts ms to frames and trims whitespace", () => {
    expect(
      captionsToWords(
        [
          { text: " If", startMs: 0, endMs: 100 },
          { text: " you're", startMs: 100, endMs: 433 },
          { text: "  ", startMs: 433, endMs: 500 },
        ],
        30,
      ),
    ).toEqual([
      { text: "If", startFrame: 0, endFrame: 3 },
      { text: "you're", startFrame: 3, endFrame: 13 },
    ]);
  });

  it("guarantees every word lasts at least one frame", () => {
    expect(captionsToWords([{ text: "a", startMs: 1000, endMs: 1005 }], 30)).toEqual([
      { text: "a", startFrame: 30, endFrame: 31 },
    ]);
  });

  it("merges sub-word tokens that have no leading space into the previous word", () => {
    expect(
      captionsToWords(
        [
          { text: " Hook", startMs: 0, endMs: 200 },
          { text: "s", startMs: 200, endMs: 300 },
          { text: ",", startMs: 300, endMs: 330 },
          { text: " Post", startMs: 400, endMs: 500 },
          { text: "-", startMs: 500, endMs: 520 },
          { text: "It", startMs: 520, endMs: 600 },
          { text: "'s", startMs: 600, endMs: 700 },
        ],
        30,
      ),
    ).toEqual([
      { text: "Hooks,", startFrame: 0, endFrame: 10 },
      { text: "Postiz", startFrame: 12, endFrame: 21 },
    ]);
  });

  it("drops non-speech markers and punctuation-only tokens, keeps numbers", () => {
    expect(
      captionsToWords(
        [
          { text: " Hello", startMs: 0, endMs: 200 },
          { text: " [BLANK_AUDIO]", startMs: 200, endMs: 10000 },
          { text: " (music)", startMs: 10000, endMs: 11000 },
          { text: " [silence]", startMs: 11000, endMs: 12000 },
          { text: " ...", startMs: 12000, endMs: 12100 },
          { text: " 1,000", startMs: 12100, endMs: 12500 },
        ],
        30,
      ),
    ).toEqual([
      { text: "Hello", startFrame: 0, endFrame: 6 },
      { text: "1,000", startFrame: 363, endFrame: 375 },
    ]);
  });
});

describe("captionsToWords split markers", () => {
  it("drops a marker that whisper split into sub-tokens, without touching the previous word", () => {
    const toks = [" hand", ".", " [", "BL", "ANK", "_", "AUD", "IO", "]"].map((text, i) => ({ text, startMs: i * 100, endMs: i * 100 + 100 }));
    expect(captionsToWords(toks, 30).map((w) => w.text)).toEqual(["hand."]);
  });
});

describe("offsetWords", () => {
  it("adds the take start to every word", () => {
    expect(offsetWords([{ text: "a", startFrame: 3, endFrame: 10 }], 100, 200)).toEqual([
      { text: "a", startFrame: 103, endFrame: 110 },
    ]);
  });
  it("clamps words running past the take end", () => {
    expect(offsetWords([{ text: "a", startFrame: 90, endFrame: 150 }], 100, 200)).toEqual([
      { text: "a", startFrame: 190, endFrame: 200 },
    ]);
  });
  it("keeps at least one frame for a word at the very end", () => {
    const [w] = offsetWords([{ text: "a", startFrame: 150, endFrame: 160 }], 100, 200);
    expect(w.startFrame).toBe(199);
    expect(w.endFrame).toBe(200);
  });
});
