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
