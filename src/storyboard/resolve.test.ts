import { describe, expect, it } from "vitest";
import { resolveStoryboard } from "./resolve";
import { bigNumber, iconStack, flashCard } from "./dsl";
import type { Storyboard, TakesFile, Word, WordsFile } from "../types";

const words: Word[] = "not using AI yet hooks ten hook ideas pick the best one".split(" ")
  .map((text, i) => ({ text, startFrame: i * 10, endFrame: i * 10 + 8 }));
const wordsFile: WordsFile = { words };
const takes: TakesFile = {
  fps: 30, width: 1080, height: 1920,
  takes: [
    { file: "1", startFrame: 0, endFrame: 40 },
    { file: "2", startFrame: 40, endFrame: 120 },
  ],
};
const sb: Storyboard = {
  id: "t", hook: "Not using AI yet? // You're behind",
  sections: [{ take: 2, title: "1. Hooks" }],
  moments: [
    { on: "ten hook ideas", show: bigNumber(10, "HOOK IDEAS"), sfx: "slam", hold: "until:pick the best one" },
    { on: "pick the best one", show: iconStack(["tt", "ig"]), hold: 1 },
    { at: 3, show: flashCard("GO") },
    { on: "best", emphasis: "shake" },
  ],
};

describe("resolveStoryboard", () => {
  const r = resolveStoryboard(sb, takes, wordsFile);

  it("takes duration and dimensions from takes.json", () => {
    expect(r.durationInFrames).toBe(120);
    expect(r.width).toBe(1080);
  });

  it("maps sections to take frames and makes the first take the hook", () => {
    expect(r.sections).toEqual([
      { startFrame: 0, endFrame: 40, title: "Not using AI yet? // You're behind", isHook: true },
      { startFrame: 40, endFrame: 120, title: "1. Hooks", isHook: false },
    ]);
  });

  it("resolves a phrase moment to the first word's frame and until: to the phrase start", () => {
    expect(r.moments[0]).toMatchObject({ enterFrame: 50, exitFrame: 80, zone: "left", sfx: "slam" });
  });

  it("applies numeric hold in seconds", () => {
    expect(r.moments[1]).toMatchObject({ enterFrame: 80, exitFrame: 110, zone: "right" });
  });

  it("resolves at: seconds and flashCard default hold of 3 frames", () => {
    expect(r.moments[2]).toMatchObject({ enterFrame: 90, exitFrame: 93, zone: "full" });
  });

  it("gives emphasis the word's own duration in the captions zone", () => {
    expect(r.moments[3]).toMatchObject({ enterFrame: 100, exitFrame: 108, zone: "captions", emphasis: "shake" });
  });

  it("fails with the phrase name when a phrase is missing", () => {
    expect(() => resolveStoryboard({ ...sb, moments: [{ on: "nope nope" }] }, takes, wordsFile)).toThrow(/nope nope/);
  });

  it("uses the default face box when none is given", () => {
    expect(r.faceBox).toEqual({ x: 0.33, y: 0.22, w: 0.42, h: 0.52 });
  });

  it("clamps words that run past the end of the video", () => {
    const late: WordsFile = { words: [{ text: "end", startFrame: 119, endFrame: 123 }, { text: "x", startFrame: 125, endFrame: 128 }] };
    const out = resolveStoryboard({ ...sb, moments: [] }, takes, late);
    expect(out.words).toEqual([
      { text: "end", startFrame: 119, endFrame: 120 },
      { text: "x", startFrame: 119, endFrame: 120 },
    ]);
  });

  describe("zone cut, clamping and ordering", () => {
    const mk = (text: string): WordsFile => ({
      words: text.split(" ").map((t, i) => ({ text: t, startFrame: i * 10, endFrame: i * 10 + 8 })),
    });
    const w = mk("a b c d e f g h i j k l");
    const run = (moments: Storyboard["moments"], wf: WordsFile = w) =>
      resolveStoryboard({ ...sb, moments }, takes, wf);

    it("cuts a graphic short when a later graphic in the same zone starts inside its hold", () => {
      const out = run([{ on: "a", show: bigNumber(1, "X") }, { on: "d", show: bigNumber(2, "Y") }]);
      expect(out.moments[0].exitFrame).toBe(out.moments[1].enterFrame);
    });

    it("does not cut a graphic for a sfx-only moment", () => {
      const out = run([{ on: "a", show: bigNumber(1, "X") }, { on: "d", sfx: "whoosh" }, { on: "g", show: bigNumber(2, "Y") }]);
      expect(out.moments[0].exitFrame).toBe(out.moments[2].enterFrame);
    });

    it("clamps exit to the end of the video", () => {
      const out = run([{ on: "l", show: bigNumber(1, "X") }]);
      expect(out.moments[0].exitFrame).toBe(120);
    });

    it("resolves repeated phrases in order", () => {
      const out = run([{ on: "I ask" }, { on: "I ask" }], mk("I ask x y I ask z"));
      expect(out.moments[0].enterFrame).toBe(0);
      expect(out.moments[1].enterFrame).toBe(40);
    });

    it("throws naming the phrase when until: is only said before the moment", () => {
      expect(() => run([{ on: "f", show: bigNumber(1, "X"), hold: "until:b" }])).toThrow(/until:b/);
    });
  });
});
