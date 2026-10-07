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

describe("dropNonSpeech bounds", () => {
  const mk = (ts: string[]) => ts.map((text, i) => ({ text, startMs: i * 100, endMs: i * 100 + 100 }));
  it("drops a one-token marker with trailing punctuation alone", () => {
    expect(captionsToWords(mk([" hi", " (almost),", " there", " [BLANK_AUDIO]."]), 30).map((w) => w.text)).toEqual(["hi", "there"]);
  });
  it("keeps real words after an unclosed bracket", () => {
    expect(captionsToWords(mk([" [", " one", " two", " three", " four", " five"]), 30).map((w) => w.text)).toEqual(["one", "two", "three", "four", "five"]);
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
  it("drops words in the silence pad (hallucinations)", () => {
    expect(offsetWords([{ text: "a", startFrame: 150, endFrame: 160 }], 100, 200)).toEqual([]);
  });
  it("extends a squeezed final word backwards so it shows", () => {
    const out = offsetWords(
      [
        { text: "x", startFrame: 80, endFrame: 95 },
        { text: "end.", startFrame: 99, endFrame: 104 },
      ],
      100,
      200,
    );
    expect(out[1]).toEqual({ text: "end.", startFrame: 195, endFrame: 200 });
  });
  it("trims a stretched previous word so the final word keeps 4 frames", () => {
    const out = offsetWords(
      [
        { text: "of", startFrame: 60, endFrame: 99 },
        { text: "that.", startFrame: 99, endFrame: 100 },
      ],
      100,
      200,
    );
    expect(out[1].endFrame - out[1].startFrame).toBeGreaterThanOrEqual(4);
    expect(out[0].endFrame).toBeLessThanOrEqual(out[1].startFrame);
  });
  it("leaves a mid-take word unchanged", () => {
    expect(offsetWords([{ text: "m", startFrame: 40, endFrame: 50 }], 100, 200)).toEqual([
      { text: "m", startFrame: 140, endFrame: 150 },
    ]);
  });
});
