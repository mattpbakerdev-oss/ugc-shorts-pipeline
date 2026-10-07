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
  it("rejects captionY outside 0.3 to 0.88", () => {
    expect(() => validateStoryboard({ ...base, captionY: 0.2 })).toThrow(/captionY/);
    expect(() => validateStoryboard({ ...base, captionY: 0.95 })).toThrow(/captionY/);
    expect(() => validateStoryboard({ ...base, captionY: 0.66 })).not.toThrow();
  });
  it("rejects a graphicsBox outside the frame", () => {
    expect(() => validateStoryboard({ ...base, graphicsBox: { x: 0.8, y: 0.2, w: 0.4, h: 0.3 } })).toThrow(/graphicsBox/);
    expect(() => validateStoryboard({ ...base, graphicsBox: { x: 0.5, y: 0.2, w: 0.4, h: 0.3 } })).not.toThrow();
  });
});
