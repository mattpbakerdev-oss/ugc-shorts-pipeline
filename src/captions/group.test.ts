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

  it("caps groups at 30 characters", () => {
    const g = groupWords(seq(["repurposing", "everything", "instead", "of"]), { fps: 30, takeBoundaries: [] });
    expect(g.map((x) => x.words.map((w) => w.text).join(" "))).toEqual(["repurposing everything instead", "of"]);
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
});
