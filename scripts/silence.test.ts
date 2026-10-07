import { describe, expect, it } from "vitest";
import { parseSilence } from "./silence";

const stderr = `
[silencedetect @ 0x1] silence_start: 0
[silencedetect @ 0x1] silence_end: 1.02 | silence_duration: 1.02
[silencedetect @ 0x1] silence_start: 4.5
[silencedetect @ 0x1] silence_end: 4.9 | silence_duration: 0.4
[silencedetect @ 0x1] silence_start: 8.7
[silencedetect @ 0x1] silence_end: 9.8 | silence_duration: 1.1
`;

describe("parseSilence", () => {
  it("finds leading and trailing silence, with padding", () => {
    expect(parseSilence(stderr, 9.8)).toEqual({ speechStart: 0.72, speechEnd: 9.05 });
  });

  it("returns whole file when there is no silence", () => {
    expect(parseSilence("", 5)).toEqual({ speechStart: 0, speechEnd: 5 });
  });

  it("ignores a trailing silence that does not reach the end", () => {
    const s = `[x] silence_start: 3\n[x] silence_end: 3.6 | silence_duration: 0.6\n`;
    expect(parseSilence(s, 10)).toEqual({ speechStart: 0, speechEnd: 10 });
  });

  // iPhone takes: audio stream ends ~0.3s before the video container.
  const audioShort = `
[silencedetect @ 0x1] silence_start: 6.4
[silencedetect @ 0x1] silence_end: 9.5 | silence_duration: 3.1
`;

  it("trims trailing silence ending exactly at the (audio) duration", () => {
    expect(parseSilence(audioShort, 9.5)).toEqual({ speechStart: 0, speechEnd: 6.75 });
  });

  it("still trims when the silence ends within tolerance of the given duration", () => {
    expect(parseSilence(audioShort, 9.8)).toEqual({ speechStart: 0, speechEnd: 6.75 });
  });
});
