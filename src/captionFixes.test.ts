import { describe, expect, it } from "vitest";
import { applyFixes, captionsToWords, snapWordsToTakes } from "./captionFixes";

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

describe("snapWordsToTakes", () => {
  const takes = [
    { file: "a", startFrame: 0, endFrame: 423 },
    { file: "b", startFrame: 423, endFrame: 900 },
  ];
  it("snaps a word straddling a boundary to boundary + headPad - 2 frames", () => {
    const out = snapWordsToTakes([{ text: "Repurposing.", startFrame: 410, endFrame: 432 }], takes, 9);
    expect(out).toEqual([{ text: "Repurposing.", startFrame: 430, endFrame: 432 }]);
  });
  it("leaves words entirely before or after a boundary alone", () => {
    const ws = [
      { text: "a", startFrame: 400, endFrame: 423 },
      { text: "b", startFrame: 423, endFrame: 440 },
    ];
    expect(snapWordsToTakes(ws, takes, 9)).toEqual(ws);
  });
  it("keeps at least one frame for short straddling words", () => {
    const out = snapWordsToTakes([{ text: "x", startFrame: 420, endFrame: 425 }], takes, 9);
    expect(out[0].endFrame - out[0].startFrame).toBeGreaterThanOrEqual(1);
    expect(out[0].startFrame).toBe(424);
  });
});
