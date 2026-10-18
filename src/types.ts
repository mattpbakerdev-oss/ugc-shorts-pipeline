export type Rect = { x: number; y: number; w: number; h: number };

export type Word = { text: string; startFrame: number; endFrame: number };

export type Take = { file: string; startFrame: number; endFrame: number };

export type TakesFile = { fps: number; width: number; height: number; takes: Take[] };

export type WordsFile = { words: Word[] };

export type ZoneName = "topBand" | "left" | "right" | "captions" | "graphics" | "full";

export type Zones = {
  topBand: Rect;
  face: Rect;
  left: Rect;
  right: Rect;
  captions: Rect;
  platformUi: Rect;
  full: Rect;
  /** Present only when the storyboard overrides the graphics area. */
  graphicsBox?: Rect;
};

export type InstalledSfxName = "slam" | "tick" | "pop" | "whoosh" | "riser" | "thud";
export type MemeSfxName = "vine-boom" | "record-scratch" | "bruh" | "xp-error" | "fah" | "boomer" | "quack";
export type SfxName = InstalledSfxName | MemeSfxName;
export type IconName = "tt" | "ig" | "yt" | "fb";
export type GraphicSpec =
  | { kind: "bigNumber"; value: string; label: string; prefix?: string }
  | { kind: "punchList"; items: string[]; pick?: number; strike?: number[] }
  | { kind: "iconStack"; icons: IconName[] }
  | { kind: "ctaSaveShare" }
  | { kind: "counter"; from: number; to: number; label: string; prefix?: string }
  | { kind: "flashCard"; word: string };
export type Emphasis = "shake" | "pulse" | "flash";
export type Moment = {
  on?: string; at?: number; show?: GraphicSpec; emphasis?: Emphasis; sfx?: SfxName;
  hold?: number | `until:${string}`;
  /** Append below the previous graphic in the same zone instead of replacing it. */
  stack?: boolean;
  /** Muted full-frame insert of a cutaway clip (id without extension; seconds within the clip). Excludes show/crashZoom/impact/freeze. */
  cutaway?: { file: string; from: number; to: number };
  /** 4-frame punch-in on the phrase start, snap back at the phrase end (or `hold`). Default scale 1.35, no shake. */
  crashZoom?: { scale?: number; shake?: boolean } | true;
  /** 2-frame full-frame flash at the phrase start. May combine with crashZoom or cameraShake only. */
  impact?: "white" | "black";
  /** Whole-frame jolt of the face layer from the phrase start: alternating, decaying offsets. Default 8 frames, 14 px. Excludes show/cutaway/crashZoom/freeze and hold. */
  cameraShake?: { frames?: number; px?: number } | true;
  /** Freeze the frame for `seconds`, extending the timeline, with a big caption. */
  freeze?: { seconds: number; text: string };
};
export type Section = { take: number; title: string };
/** Remove [from, to) seconds from a take; times are take-local, read off work/<id>/take_NN.mp4. */
export type Cut = { take: number; from: number; to: number };
/** Pre-cut clips in play order, instead of scanning numbered takes. Part paths are relative to `dir`; `cutawayDir` too. */
export type Source = { dir: string; parts: string[]; trim?: boolean; cutawayDir?: string };
export type Music = { file: string; volume?: number };
export type CutawaysFile = { fps: number; clips: Record<string, { file: string; durationSeconds: number }> };
export type Storyboard = {
  id: string; faceBox?: Rect;
  source?: Source; music?: Music;
  /** Top of the caption band as a fraction of frame height (0.30 to 0.80); must sit below the face box. */
  captionY?: number;
  /** Replaces the primary graphics zone; must not overlap the face box. */
  graphicsBox?: Rect;
  /** Replaces the top band for the hook chips; keeps a 0.02 gap from the face box, may overlap the top band. */
  hookBox?: Rect;
  /** Number of takes the hook chips span (default 1). Sections may only target takes after it. */
  hookTakes?: number;
  hook: string; sections: Section[]; moments: Moment[]; cuts?: Cut[];
  /**
   * Per take (numbered from 1). `text` pins the whole transcript when Whisper mishears a short clip (spread evenly).
   * Otherwise `drop` removes Whisper's words by text (a phantom "Thank" on a breath) and `replace` swaps a word's
   * text keeping its timing ({ too: "two" }); both may be given together, neither with `text`.
   */
  transcriptOverrides?: { take: number; text?: string; drop?: string[]; replace?: Record<string, string> }[];
};
export type ResolvedMoment = {
  enterFrame: number; exitFrame: number; show?: GraphicSpec; emphasis?: Emphasis; sfx?: SfxName; zone: ZoneName; stack?: boolean;
  /** fromFrame/toFrame are clip-local (not on the video timeline); enterFrame/exitFrame are. Zone is "full". */
  cutaway?: { file: string; fromFrame: number; toFrame: number };
  crashZoom?: { scale: number; shake: boolean };
  /** Window is enterFrame to enterFrame + IMPACT_FRAMES (exitFrame may be later when combined with crashZoom or cameraShake). */
  impact?: "white" | "black";
  /** Window is enterFrame to enterFrame + frames (= exitFrame). */
  cameraShake?: { frames: number; px: number };
  /** enterFrame is the frozen frame; exitFrame = enterFrame + lengthFrames. */
  freeze?: { lengthFrames: number; text: string };
};
export type ResolvedSection = { startFrame: number; endFrame: number; title: string; isHook: boolean };
export type ResolvedVideo = {
  id: string; fps: number; width: number; height: number; durationInFrames: number;
  faceBox: Rect; captionY: number; graphicsBox: Rect; hookBox: Rect;
  /** Source-clip timeline (NOT shifted by freezes); map to video frames with `freezes`. */
  takes: Take[];
  /** Video-timeline (freeze-shifted) start frames of takes 2..N, for caption grouping. */
  takeBoundaries: number[];
  /** Video timeline, already shifted by freezes. */
  words: Word[]; sections: ResolvedSection[]; moments: ResolvedMoment[];
  /** Video-timeline frame where each freeze starts (the face is held there), in order. */
  freezes: { atFrame: number; lengthFrames: number; text: string }[];
  /** Merged windows (video timeline, +-2 frames) where music should duck. */
  ducking: { from: number; to: number }[];
  music?: { file: string; volume: number };
};

/** Sounds whose files exist in public/sfx. */
export const SFX_NAMES: SfxName[] = ["slam", "tick", "pop", "whoosh", "riser", "thud", "vine-boom", "record-scratch", "bruh", "xp-error", "fah", "boomer", "quack"];
