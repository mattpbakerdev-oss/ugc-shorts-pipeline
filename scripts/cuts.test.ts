import { describe, expect, it } from "vitest";
import { keptSegments, mapWordsThroughKept } from "./cuts";

describe("keptSegments", () => {
  it("returns the full range with no cuts", () => {
    expect(keptSegments(10, [])).toEqual([{ from: 0, to: 10 }]);
  });
  it("splits around a middle cut", () => {
    expect(keptSegments(10, [{ from: 3, to: 5 }])).toEqual([{ from: 0, to: 3 }, { from: 5, to: 10 }]);
  });
  it("merges overlapping cuts", () => {
    expect(keptSegments(10, [{ from: 6, to: 8 }, { from: 2, to: 4 }, { from: 3, to: 7 }])).toEqual([
      { from: 0, to: 2 }, { from: 8, to: 10 },
    ]);
  });
  it("clamps a cut past the end", () => {
    expect(keptSegments(10, [{ from: 8, to: 99 }])).toEqual([{ from: 0, to: 8 }]);
  });
  it("throws when everything is cut", () => {
    expect(() => keptSegments(10, [{ from: 0, to: 10 }])).toThrow(/nothing/i);
  });
  it("snaps off-grid bounds to the frame grid and drops sub-frame slivers", () => {
    const segs = keptSegments(10, [{ from: 1.234, to: 2.567 }, { from: 4.001, to: 9.99 }]);
    for (const g of segs) {
      expect(Math.abs(g.from * 30 - Math.round(g.from * 30))).toBeLessThan(1e-9);
      expect(Math.abs(g.to * 30 - Math.round(g.to * 30))).toBeLessThan(1e-9);
    }
    expect(segs.length).toBe(2); // the 9.99-10 sliver is dropped
    expect(() => keptSegments(10, [{ from: 0, to: 9.99 }])).toThrow(/less than one frame/);
  });
});

describe("mapWordsThroughKept", () => {
  const w = (text: string, startFrame: number, endFrame: number) => ({ text, startFrame, endFrame });
  it("leaves words alone when the whole take is kept", () => {
    expect(mapWordsThroughKept([w("a", 10, 20)], [{ from: 0, to: 10 }], 30)).toEqual([w("a", 10, 20)]);
  });
  it("shifts words after a cut back by the cut length", () => {
    // cut [3, 5] s = frames 90-150; a word at 160-170 lands at 100-110
    expect(mapWordsThroughKept([w("a", 10, 20), w("b", 160, 170)], [{ from: 0, to: 3 }, { from: 5, to: 10 }], 30)).toEqual([w("a", 10, 20), w("b", 100, 110)]);
  });
  it("keeps a word that starts inside a cut but ends in the next kept segment, clamped to the segment start", () => {
    // Whisper stretches a take's first word back over the leading silence that the cut removes.
    expect(mapWordsThroughKept([w("people", 1, 25), w("scroll", 25, 35)], [{ from: 0.5, to: 10 }], 30)).toEqual([w("people", 0, 10), w("scroll", 10, 20)]);
  });
  it("keeps a stretched word before a mid-take cut only up to the cut, and one after it from the cut", () => {
    expect(mapWordsThroughKept([w("made", 80, 120), w("put", 130, 160)], [{ from: 0, to: 3 }, { from: 5, to: 10 }], 30)).toEqual([w("made", 80, 90), w("put", 90, 100)]);
  });
  it("drops words that lie entirely inside a cut", () => {
    expect(mapWordsThroughKept([w("fix", 95, 110), w("three", 110, 140), w("cut", 160, 170)], [{ from: 0, to: 3 }, { from: 5, to: 10 }], 30)).toEqual([w("cut", 100, 110)]);
  });
  it("drops words that start before the first kept segment", () => {
    expect(mapWordsThroughKept([w("click", 2, 5), w("people", 20, 30)], [{ from: 0.5, to: 10 }], 30)).toEqual([w("people", 5, 15)]);
  });
  it("clamps a word that runs into a cut to the segment end", () => {
    expect(mapWordsThroughKept([w("a", 80, 100)], [{ from: 0, to: 3 }, { from: 5, to: 10 }], 30)).toEqual([w("a", 80, 90)]);
  });
  it("keeps a word at least one frame long when clamped", () => {
    expect(mapWordsThroughKept([w("a", 89, 100)], [{ from: 0, to: 3 }, { from: 5, to: 10 }], 30)).toEqual([w("a", 89, 90)]);
  });
});
