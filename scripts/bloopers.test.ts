import { describe, expect, it } from "vitest";
import { findRestarts } from "./bloopers";
import type { Take, Word } from "../src/types";

const fps = 30;
const mk = (list: [string, number][]): Word[] =>
  list.map(([text, s]) => ({ text, startFrame: s * fps, endFrame: s * fps + 5 }));
const takes: Take[] = [{ file: "a.mp4", startFrame: 0, endFrame: 60 * fps }];

describe("findRestarts", () => {
  it("proposes cutting the first attempt of a repeated 3-gram", () => {
    const words = mk([["So", 0], ["the", 1], ["first", 1.5], ["thing", 2], ["The", 3], ["first", 3.5], ["thing", 4], ["is", 4.5]]);
    expect(findRestarts(words, takes, fps)).toEqual([{ take: 1, from: 1, to: 3, phrase: "the first thing" }]);
  });
  it("ignores the same 3-gram more than the window apart", () => {
    const words = mk([["the", 0], ["first", 1], ["thing", 2], ["the", 10], ["first", 11], ["thing", 12]]);
    expect(findRestarts(words, takes, fps)).toEqual([]);
  });
  it("ignores a 2-word repeat", () => {
    const words = mk([["the", 0], ["first", 1], ["x", 2], ["the", 3], ["first", 3.5], ["y", 4]]);
    expect(findRestarts(words, takes, fps)).toEqual([]);
  });
  it("converts to take-local seconds with 1-based take numbers", () => {
    const two: Take[] = [
      { file: "a.mp4", startFrame: 0, endFrame: 10 * fps },
      { file: "b.mp4", startFrame: 10 * fps, endFrame: 30 * fps },
    ];
    const words = mk([["one", 12], ["two", 12.5], ["three", 13], ["one", 14], ["two", 14.5], ["three", 15]]);
    expect(findRestarts(words, two, fps)).toEqual([{ take: 2, from: 2, to: 4, phrase: "one two three" }]);
  });
  it("skips restarts that span takes", () => {
    const two: Take[] = [
      { file: "a.mp4", startFrame: 0, endFrame: 10 * fps },
      { file: "b.mp4", startFrame: 10 * fps, endFrame: 30 * fps },
    ];
    const words = mk([["one", 8], ["two", 8.5], ["three", 9], ["one", 11], ["two", 11.5], ["three", 12]]);
    expect(findRestarts(words, two, fps)).toEqual([]);
  });

  it("treats punctuation as ignorable: minWords 2 catches 'First thing. The first thing', 3 does not", () => {
    const words = mk([["First", 0], ["thing.", 0.5], ["The", 1.5], ["first", 2], ["thing,", 2.5], ["I'm", 3], ["not", 3.5]]);
    expect(findRestarts(words, takes, fps, { minWords: 2, windowSeconds: 4 })).toEqual([
      { take: 1, from: 0, to: 2, phrase: "first thing the" },
    ]);
    expect(findRestarts(words, takes, fps)).toEqual([]);
  });
});
