import type { CSSProperties } from "react";
import type { Rect, Zones } from "./types";

export const DEFAULT_FACE_BOX: Rect = { x: 0.33, y: 0.22, w: 0.42, h: 0.52 };

const GAP = 0.02;
const SIDE_MARGIN = 0.03;
const CAPTION_HEIGHT = 0.12;
const PLATFORM_UI_HEIGHT = 0.12;

export const zonesFor = (face: Rect): Zones => {
  const leftW = Math.max(0, face.x - GAP - SIDE_MARGIN);
  const rightX = Math.min(1 - SIDE_MARGIN, face.x + face.w + GAP);
  const rightW = Math.max(0, 1 - SIDE_MARGIN - rightX);
  const captionsY = Math.min(face.y + face.h + GAP, 1 - PLATFORM_UI_HEIGHT - CAPTION_HEIGHT);
  return {
    topBand: { x: 0.06, y: 0.03, w: 0.88, h: 0.19 },
    face,
    left: { x: SIDE_MARGIN, y: face.y, w: leftW, h: face.h },
    right: { x: rightX, y: face.y, w: rightW, h: face.h },
    captions: { x: 0.04, y: captionsY, w: 0.92, h: CAPTION_HEIGHT },
    platformUi: { x: 0, y: 1 - PLATFORM_UI_HEIGHT, w: 1, h: PLATFORM_UI_HEIGHT },
    full: { x: 0, y: 0, w: 1, h: 1 },
  };
};

export const rectToStyle = (r: Rect, width: number, height: number): CSSProperties => ({
  position: "absolute",
  left: Math.round(r.x * width),
  top: Math.round(r.y * height),
  width: Math.round(r.w * width),
  height: Math.round(r.h * height),
});
