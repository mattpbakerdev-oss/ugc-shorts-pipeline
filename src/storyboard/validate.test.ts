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
});
