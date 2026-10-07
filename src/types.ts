export type Rect = { x: number; y: number; w: number; h: number };

export type Word = { text: string; startFrame: number; endFrame: number };

export type Take = { file: string; startFrame: number; endFrame: number };

export type TakesFile = { fps: number; width: number; height: number; takes: Take[] };

export type WordsFile = { words: Word[] };

export type ZoneName = "topBand" | "left" | "right" | "captions" | "full";

export type Zones = {
  topBand: Rect;
  face: Rect;
  left: Rect;
  right: Rect;
  captions: Rect;
  platformUi: Rect;
  full: Rect;
};

export type SfxName = "slam" | "tick" | "pop" | "whoosh" | "riser" | "thud";
export type IconName = "tt" | "ig" | "yt" | "fb";
export type GraphicSpec =
  | { kind: "bigNumber"; value: string; label: string }
  | { kind: "punchList"; items: string[]; pick?: number; strike?: number[] }
  | { kind: "iconStack"; icons: IconName[] }
  | { kind: "counter"; from: number; to: number; label: string }
  | { kind: "flashCard"; word: string };
export type Emphasis = "shake" | "pulse" | "flash";
export type Moment = {
  on?: string; at?: number; show?: GraphicSpec; emphasis?: Emphasis; sfx?: SfxName;
  hold?: number | `until:${string}`;
  /** Append below the previous graphic in the same zone instead of replacing it. */
  stack?: boolean;
};
export type Section = { take: number; title: string };
/** Remove [from, to) seconds from a take; times are take-local, read off work/<id>/take_NN.mp4. */
export type Cut = { take: number; from: number; to: number };
export type Storyboard = { id: string; faceBox?: Rect; hook: string; sections: Section[]; moments: Moment[]; cuts?: Cut[] };
export type ResolvedMoment = { enterFrame: number; exitFrame: number; show?: GraphicSpec; emphasis?: Emphasis; sfx?: SfxName; zone: ZoneName; stack?: boolean };
export type ResolvedSection = { startFrame: number; endFrame: number; title: string; isHook: boolean };
export type ResolvedVideo = {
  id: string; fps: number; width: number; height: number; durationInFrames: number;
  faceBox: Rect; takes: Take[]; words: Word[]; sections: ResolvedSection[]; moments: ResolvedMoment[];
};

export const SFX_NAMES: SfxName[] = ["slam", "tick", "pop", "whoosh", "riser", "thud"];
