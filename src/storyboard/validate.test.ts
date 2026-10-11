import { describe, expect, it } from "vitest";
import { validateStoryboard } from "./validate";
import type { Storyboard } from "../types";

const base: Storyboard = {
  id: "t", hook: "Hi", sections: [{ take: 2, title: "1. One" }],
  moments: [{ on: "hello", show: { kind: "bigNumber", value: "1", label: "X" }, sfx: "slam" }],
};

describe("validateStoryboard", () => {
  it("accepts a valid storyboard", () => {
    expect(() => validateStoryboard(base)).not.toThrow();
  });
  it("rejects a moment with neither on nor at", () => {
    expect(() => validateStoryboard({ ...base, moments: [{ show: { kind: "flashCard", word: "x" } }] })).toThrow(/on.*at/);
  });
  it("rejects a moment with both on and at", () => {
    expect(() => validateStoryboard({ ...base, moments: [{ on: "a", at: 1 }] })).toThrow(/both/);
  });
  it("rejects any Postiz reference in a moment", () => {
    expect(() => validateStoryboard({ ...base, moments: [{ on: "I tell Postiz" }] })).toThrow(/Postiz/);
    expect(() => validateStoryboard({ ...base, moments: [{ at: 1, show: { kind: "punchList", items: ["postiz rocks"] } }] })).toThrow(/Postiz/);
  });
  it("rejects an unknown sfx", () => {
    expect(() => validateStoryboard({ ...base, moments: [{ at: 1, sfx: "boing" as never }] })).toThrow(/boing/);
  });
  it("rejects a section on take 0", () => {
    expect(() => validateStoryboard({ ...base, sections: [{ take: 0, title: "x" }] })).toThrow(/take/);
  });
  it("accepts valid cuts", () => {
    expect(() => validateStoryboard({ ...base, cuts: [{ take: 1, from: 0, to: 1.5 }] })).not.toThrow();
  });
  it("rejects cuts with take < 1, from < 0 or to <= from", () => {
    expect(() => validateStoryboard({ ...base, cuts: [{ take: 0, from: 0, to: 1 }] })).toThrow(/cut 0.*take/);
    expect(() => validateStoryboard({ ...base, cuts: [{ take: 1, from: -1, to: 1 }] })).toThrow(/cut 0.*from/);
    expect(() => validateStoryboard({ ...base, cuts: [{ take: 1, from: 2, to: 2 }] })).toThrow(/cut 0.*to/);
  });
  it("rejects captionY outside 0.3 to 0.80", () => {
    expect(() => validateStoryboard({ ...base, captionY: 0.2 })).toThrow(/captionY/);
    expect(() => validateStoryboard({ ...base, captionY: 0.95 })).toThrow(/captionY/);
    expect(() => validateStoryboard({ ...base, captionY: 0.85 })).toThrow(/captionY/);
    expect(() => validateStoryboard({ ...base, captionY: 0.8 })).not.toThrow();
    expect(() => validateStoryboard({ ...base, captionY: 0.66 })).not.toThrow();
  });
  it("validates hookBox", () => {
    expect(() => validateStoryboard({ ...base, hookBox: { x: 0.8, y: 0.03, w: 0.4, h: 0.19 } })).toThrow(/hookBox/);
    expect(() => validateStoryboard({ ...base, hookBox: { x: 0.2, y: 0.3, w: 0.4, h: 0.19 } })).toThrow(/hookBox/);
    expect(() => validateStoryboard({ ...base, faceBox: { x: 0.04, y: 0.16, w: 0.44, h: 0.34 }, hookBox: { x: 0.5, y: 0.03, w: 0.48, h: 0.19 } })).not.toThrow();
  });
  it("rejects a graphicsBox outside the frame", () => {
    expect(() => validateStoryboard({ ...base, graphicsBox: { x: 0.8, y: 0.2, w: 0.4, h: 0.3 } })).toThrow(/graphicsBox/);
    expect(() => validateStoryboard({ ...base, graphicsBox: { x: 0.5, y: 0.2, w: 0.4, h: 0.3 } })).not.toThrow();
  });
});

describe("validateStoryboard source and music", () => {
  const b: Storyboard = { id: "t", hook: "Hi", sections: [], moments: [] };
  it("accepts a valid source and music", () => {
    expect(() => validateStoryboard({ ...b, source: { dir: "/x", parts: ["a.mp4"], trim: false }, music: { file: "m.mp3", volume: 0.1 } })).not.toThrow();
  });
  it("rejects empty source.parts", () => {
    expect(() => validateStoryboard({ ...b, source: { dir: "/x", parts: [] } })).toThrow(/parts/);
  });
  it("rejects non-boolean trim", () => {
    expect(() => validateStoryboard({ ...b, source: { dir: "/x", parts: ["a.mp4"], trim: "no" as never } })).toThrow(/trim/);
  });
  it("rejects music volume outside (0, 1]", () => {
    expect(() => validateStoryboard({ ...b, music: { file: "m.mp3", volume: 0 } })).toThrow(/volume/);
    expect(() => validateStoryboard({ ...b, music: { file: "m.mp3", volume: 1.5 } })).toThrow(/volume/);
  });
  it("rejects music without a file", () => {
    expect(() => validateStoryboard({ ...b, music: { file: "" } })).toThrow(/file/);
  });
});

describe("meme moment validation", () => {
  const v = (m: Storyboard["moments"][number]) => () => validateStoryboard({ ...base, moments: [m] });
  it("accepts each kind and impact + crashZoom", () => {
    expect(v({ at: 1, cutaway: { file: "a", from: 0, to: 1 } })).not.toThrow();
    expect(v({ at: 1, crashZoom: true })).not.toThrow();
    expect(v({ at: 1, impact: "white", crashZoom: { scale: 1.5 } })).not.toThrow();
    expect(v({ at: 1, freeze: { seconds: 1, text: "WAIT" }, sfx: "record-scratch" })).not.toThrow();
  });
  it("rejects mutually exclusive combinations", () => {
    const show = { kind: "flashCard", word: "x" } as const;
    expect(v({ at: 1, show, crashZoom: true })).toThrow(/mutually exclusive/);
    expect(v({ at: 1, cutaway: { file: "a", from: 0, to: 1 }, impact: "white" })).toThrow(/mutually exclusive/);
    expect(v({ at: 1, freeze: { seconds: 1, text: "x" }, crashZoom: true })).toThrow(/mutually exclusive/);
    expect(v({ at: 1, show, freeze: { seconds: 1, text: "x" } })).toThrow(/mutually exclusive/);
  });
  it("checks cutaway range and freeze values", () => {
    expect(v({ at: 1, cutaway: { file: "a", from: 1, to: 1 } })).toThrow(/range/);
    expect(v({ at: 1, cutaway: { file: "a", from: -1, to: 1 } })).toThrow(/range/);
    expect(v({ at: 1, freeze: { seconds: 0, text: "x" } })).toThrow(/> 0/);
    expect(v({ at: 1, freeze: { seconds: 1, text: " " } })).toThrow(/empty/);
  });
  it("accepts the meme sfx names", () => {
    for (const s of ["vine-boom", "record-scratch", "bruh", "xp-error", "fah", "boomer", "quack"] as const) expect(v({ at: 1, sfx: s })).not.toThrow();
  });
});
