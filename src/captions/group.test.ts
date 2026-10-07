import { describe, expect, it } from "vitest";
import { groupWords } from "./group";
import type { Word } from "../types";

const seq = (texts: string[], gapFrames = 2, lenFrames = 8, start = 0): Word[] => {
  let f = start;
  return texts.map((text) => {
    const w = { text, startFrame: f, endFrame: f + lenFrames };
    f += lenFrames + gapFrames;
    return w;
  });
};

describe("groupWords", () => {
  it("caps groups at four words", () => {
    const g = groupWords(seq(["a", "b", "c", "d", "e", "f"]), { fps: 30, takeBoundaries: [] });
    expect(g.map((x) => x.words.length)).toEqual([4, 2]);
  });

  it("ends a group when its words cannot fit two 13-char lines", () => {
    const g = groupWords(seq(["repurposing", "everything", "instead", "of"]), { fps: 30, takeBoundaries: [] });
    expect(g.map((x) => x.words.map((w) => w.text).join(" "))).toEqual(["repurposing everything", "instead of"]);
  });

  it("breaks on a pause longer than 0.6s", () => {
    const words = [...seq(["one", "two"]), ...seq(["three"], 2, 8, 100)];
    const g = groupWords(words, { fps: 30, takeBoundaries: [] });
    expect(g.length).toBe(2);
  });

  it("breaks at take boundaries", () => {
    const words = seq(["a", "b", "c", "d"]);
    const g = groupWords(words, { fps: 30, takeBoundaries: [20] });
    expect(g[0].words.map((w) => w.text)).toEqual(["a", "b"]);
    expect(g[1].words.map((w) => w.text)).toEqual(["c", "d"]);
  });

  it("holds until the next group or at most one second", () => {
    const words = [...seq(["a"]), ...seq(["b"], 2, 8, 100)];
    const g = groupWords(words, { fps: 30, takeBoundaries: [] });
    expect(g[0].endFrame).toBe(8 + 30);
    expect(g[1].endFrame).toBe(108 + 30);
  });

  it("does not hold past the next group's start", () => {
    const words = [...seq(["a"]), ...seq(["b"], 2, 8, 27)];
    const g = groupWords(words, { fps: 30, takeBoundaries: [] });
    expect(g[0].endFrame).toBe(27);
  });

  it("splits a four-word group into two lines of at most 13", () => {
    const g = groupWords(seq(["aaaaaa", "bbbbb", "cccccc", "dd"]), { fps: 30, takeBoundaries: [] });
    expect(g.length).toBe(1);
    expect(g[0].lines.map((l) => l.map((w) => w.text).join(" "))).toEqual(["aaaaaa bbbbb", "cccccc dd"]);
  });

  it("ends the group early when four words cannot fit two lines", () => {
    const g = groupWords(seq(["aaaaaaaa", "bbbbbbbb", "cccccccc", "dd"]), { fps: 30, takeBoundaries: [] });
    expect(g.map((x) => x.words.map((w) => w.text))).toEqual([["aaaaaaaa", "bbbbbbbb"], ["cccccccc", "dd"]]);
  });

  it("starts a new group after a word ending in . ! or ?", () => {
    for (const p of [".", "!", "?"]) {
      const g = groupWords(seq(["so", `yes${p}`, "then", "no"]), { fps: 30, takeBoundaries: [] });
      expect(g.map((x) => x.words.length)).toEqual([2, 2]);
    }
  });

  it("never exceeds 13 characters on a line unless a single word is longer", () => {
    const texts = ["we", "are", "repurposing", "everything", "instead", "of", "posting", "once", "ok", "go", "now", "please"];
    for (const grp of groupWords(seq(texts), { fps: 30, takeBoundaries: [] })) {
      expect(grp.lines.length).toBeLessThanOrEqual(2);
      for (const l of grp.lines) expect(l.map((w) => w.text).join(" ").length).toBeLessThanOrEqual(13);
      expect(grp.lines.flat()).toEqual(grp.words);
    }
  });

  it("keeps a word longer than 13 characters alone on its line", () => {
    const g = groupWords(seq(["a", "internationalization", "b"]), { fps: 30, takeBoundaries: [] });
    const all = g.flatMap((x) => x.lines);
    expect(all.find((l) => l.some((w) => w.text === "internationalization"))!.length).toBe(1);
    expect(g.every((x) => x.lines.length <= 2)).toBe(true);
  });
});
