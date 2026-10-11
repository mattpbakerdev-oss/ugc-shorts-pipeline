import { describe, expect, it } from "vitest";
import { resolveStoryboard } from "./resolve";
import { bigNumber, ctaSaveShare, iconStack, flashCard } from "./dsl";
import type { CutawaysFile, Moment, Storyboard, TakesFile, Word, WordsFile } from "../types";
import { DEFAULT_FACE_BOX } from "../zones";

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

describe("resolver guards", () => {
  const base = { id: "g", hook: "H", sections: [] as Storyboard["sections"] };
  it("throws when the side zone is collapsed and a graphic is used", () => {
    const wide = { x: 0.08, y: 0.3, w: 0.84, h: 0.4 };
    expect(() => resolveStoryboard({ ...base, faceBox: wide, moments: [{ at: 1, show: bigNumber(3, "X") }] }, takes, wordsFile)).toThrow(/side zone/);
  });
  it("allows emphasis-only moments with a collapsed side zone", () => {
    const wide = { x: 0.08, y: 0.3, w: 0.84, h: 0.4 };
    expect(() => resolveStoryboard({ ...base, faceBox: wide, moments: [{ on: "best", emphasis: "pulse" }] }, takes, wordsFile)).not.toThrow();
  });
  it("throws when an at moment is outside the video", () => {
    expect(() => resolveStoryboard({ ...base, moments: [{ at: 10, show: flashCard("GO") }] }, takes, wordsFile)).toThrow(/moment 0 at 10s/);
  });
  it("throws when a section take exceeds the take count", () => {
    expect(() => resolveStoryboard({ ...base, sections: [{ take: 5, title: "x" }], moments: [] }, takes, wordsFile)).toThrow(/take 5.*2 takes/);
  });
});

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
    expect(r.faceBox).toEqual(DEFAULT_FACE_BOX);
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

    it("a stack:true moment does not cut the earlier same-zone moment", () => {
      const out = resolveStoryboard({
        ...sb, sections: [],
        moments: [
          { on: "b", show: bigNumber(1, "A"), hold: 2 },
          { on: "e", show: bigNumber(2, "B"), hold: 2, stack: true },
        ],
      }, takes, w);
      expect(out.moments[0].exitFrame).toBe(10 + 60);
      expect(out.moments[0].zone).toBe(out.moments[1].zone);
    });

    it("picks the wider side from the face box", () => {
      const mkSb = (faceBox?: Storyboard["faceBox"]): Storyboard => ({
        ...sb, sections: [], faceBox,
        moments: [{ on: "b", show: bigNumber(1, "A") }, { on: "e", show: iconStack(["tt"]) }],
      });
      const hug = resolveStoryboard(mkSb({ x: 0.06, y: 0.17, w: 0.38, h: 0.33 }), takes, w);
      expect(hug.moments.map((m) => m.zone)).toEqual(["right", "right"]);
      const def = resolveStoryboard(mkSb(), takes, w);
      expect(def.moments.map((m) => m.zone)).toEqual(["left", "right"]);
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

    it("lets different phrases start on the same word", () => {
      const out = run([{ on: "a b", show: bigNumber(1, "X") }, { on: "a", emphasis: "pulse" }]);
      expect(out.moments[1].enterFrame).toBe(out.moments[0].enterFrame);
    });

    it("throws naming the phrase when until: is only said before the moment", () => {
      expect(() => run([{ on: "f", show: bigNumber(1, "X"), hold: "until:b" }])).toThrow(/until:b/);
    });
  });
});

describe("resolver overrides", () => {
  const face = { x: 0.04, y: 0.16, w: 0.44, h: 0.34 };
  const base = { id: "o", hook: "H", sections: [] as Storyboard["sections"], faceBox: face };
  it("derives captionY and graphicsBox when not overridden", () => {
    const r = resolveStoryboard({ ...base, moments: [] }, takes, wordsFile);
    expect(r.captionY).toBeCloseTo(0.52, 9);
    expect(r.graphicsBox.x).toBeCloseTo(0.5, 9);
  });
  it("uses captionY and graphicsBox as primary zone", () => {
    const box = { x: 0.52, y: 0.22, w: 0.43, h: 0.4 };
    const r = resolveStoryboard({ ...base, captionY: 0.66, graphicsBox: box, moments: [{ at: 1, show: bigNumber(3, "X") }, { at: 2, show: iconStack(["tt"]) }] }, takes, wordsFile);
    expect(r.captionY).toBe(0.66);
    expect(r.graphicsBox).toEqual(box);
    expect(r.moments[0].zone).toBe("graphics");
    expect(r.moments[1].zone).toBe("graphics");
  });
  it("gives ctaSaveShare a 3 s hold in the secondary zone", () => {
    const r = resolveStoryboard({ ...base, moments: [{ at: 1, show: ctaSaveShare() }] }, takes, wordsFile);
    expect(r.moments[0].exitFrame - r.moments[0].enterFrame).toBe(Math.round(3 * takes.fps));
    expect(r.moments[0].zone).toBe("right");
  });
  it("throws when captionY is above the chin or graphicsBox overlaps the face", () => {
    expect(() => resolveStoryboard({ ...base, captionY: 0.4, moments: [] }, takes, wordsFile)).toThrow(/captionY/);
    expect(() => resolveStoryboard({ ...base, graphicsBox: { x: 0.3, y: 0.2, w: 0.4, h: 0.3 }, moments: [] }, takes, wordsFile)).toThrow(/graphicsBox/);
  });
  it("applies the 10% width rule to graphicsBox", () => {
    expect(() => resolveStoryboard({ ...base, graphicsBox: { x: 0.6, y: 0.2, w: 0.08, h: 0.3 }, moments: [{ at: 1, show: bigNumber(3, "X") }] }, takes, wordsFile)).toThrow(/10%/);
  });
});

describe("meme moments", () => {
  const cut: CutawaysFile = { fps: 30, clips: { a: { file: "a.mp4", durationSeconds: 2 }, b: { file: "b.mp4", durationSeconds: 1 } } };
  const base = { id: "m", hook: "H", sections: [{ take: 2, title: "T" }] };
  const run = (moments: Moment[], c: CutawaysFile = cut) => resolveStoryboard({ ...base, moments }, takes, wordsFile, c);

  it("resolves crashZoom with defaults, exiting at the phrase end", () => {
    const m = run([{ on: "ten hook", crashZoom: true }]).moments[0];
    expect(m.crashZoom).toEqual({ scale: 1.35, shake: false });
    expect([m.enterFrame, m.exitFrame]).toEqual([50, 68]);
  });
  it("honours crashZoom options and hold", () => {
    const m = run([{ on: "ten", crashZoom: { scale: 1.6, shake: true }, hold: 1 }]).moments[0];
    expect(m.crashZoom).toEqual({ scale: 1.6, shake: true });
    expect(m.exitFrame - m.enterFrame).toBe(30);
  });
  it("resolves impact as 2 frames, and with crashZoom keeps the zoom exit", () => {
    const m = run([{ on: "ten", impact: "white" }]).moments[0];
    expect([m.impact, m.exitFrame - m.enterFrame]).toEqual(["white", 2]);
    const both = run([{ on: "ten hook", impact: "black", crashZoom: true }]).moments[0];
    expect([both.impact, both.crashZoom?.scale, both.exitFrame]).toEqual(["black", 1.35, 68]);
  });
  it("resolves a cutaway into the full zone with the range as its hold", () => {
    const m = run([{ at: 1, cutaway: { file: "a", from: 0.5, to: 1.5 } }]).moments[0];
    expect(m.cutaway).toEqual({ file: "a", fromFrame: 15, toFrame: 45 });
    expect([m.zone, m.enterFrame, m.exitFrame]).toEqual(["full", 30, 60]);
  });
  it("throws for a cutaway past the clip end, an unknown clip, or missing cutaways.json", () => {
    expect(() => run([{ at: 1, cutaway: { file: "b", from: 0.5, to: 1.5 } }])).toThrow(/only 1s/);
    expect(() => run([{ at: 1, cutaway: { file: "zzz", from: 0, to: 1 } }])).toThrow(/zzz.*npm run prep/);
    expect(() => resolveStoryboard({ ...base, moments: [{ at: 1, cutaway: { file: "a", from: 0, to: 1 } }] }, takes, wordsFile)).toThrow(/npm run prep/);
  });
  it("expands a freeze: shifts later moments, sections, words and the duration", () => {
    const r = run([{ on: "using", freeze: { seconds: 1, text: "WAIT" } }, { on: "pick", show: bigNumber(1, "X"), hold: 1 }]);
    expect(r.freezes).toEqual([{ atFrame: 10, lengthFrames: 30, text: "WAIT" }]);
    expect(r.moments[0]).toMatchObject({ enterFrame: 10, exitFrame: 40, zone: "full", sfx: "record-scratch" });
    expect(r.moments[1].enterFrame).toBe(80 + 30);
    expect(r.durationInFrames).toBe(150);
    expect(r.sections.map((s) => [s.startFrame, s.endFrame])).toEqual([[0, 70], [70, 150]]);
    const ai = r.words.find((w) => w.text === "AI")!;
    expect(ai.startFrame).toBe(20 + 30);
    expect(r.words[0].startFrame).toBe(0);
    expect(r.takes[1].startFrame).toBe(40); // source timeline stays unshifted
  });
  it("shifts a cutaway that follows a freeze but keeps its clip range", () => {
    const r = run([{ on: "using", freeze: { seconds: 1, text: "W" } }, { at: 2, cutaway: { file: "a", from: 0, to: 1 } }]);
    expect([r.moments[1].enterFrame, r.moments[1].exitFrame]).toEqual([90, 120]);
    expect(r.moments[1].cutaway).toEqual({ file: "a", fromFrame: 0, toFrame: 30 });
  });
  it("throws when a freeze starts inside a cutaway", () => {
    expect(() => run([{ at: 0.5, cutaway: { file: "a", from: 0, to: 1 } }, { on: "AI", freeze: { seconds: 1, text: "W" } }])).toThrow(/overlaps the freeze/);
  });
  it("accumulates multiple freezes in frame order", () => {
    const r = run([{ on: "using", freeze: { seconds: 1, text: "A" } }, { on: "ten", freeze: { seconds: 0.5, text: "B" } }]);
    expect(r.freezes.map((f) => f.atFrame)).toEqual([10, 50 + 30]);
    expect(r.durationInFrames).toBe(120 + 45);
  });
  it("merges overlapping ducking windows with a 2 frame pad", () => {
    const r = run([{ at: 1, impact: "white" }, { at: 1.1, cutaway: { file: "a", from: 0, to: 1 } }, { at: 3, impact: "black" }]);
    expect(r.ducking).toEqual([{ from: 28, to: 65 }, { from: 88, to: 94 }]);
  });
  it("ducks around a freeze and passes music through", () => {
    const r = resolveStoryboard({ ...base, music: { file: "m.mp3" }, moments: [{ on: "using", freeze: { seconds: 1, text: "W" } }] }, takes, wordsFile, cut);
    expect(r.ducking).toEqual([{ from: 8, to: 42 }]);
    expect(r.music).toEqual({ file: "m.mp3", volume: 0.1 });
  });
});
