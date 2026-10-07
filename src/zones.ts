import type { CSSProperties } from "react";
import type { Rect, Zones } from "./types";

export const DEFAULT_FACE_BOX: Rect = { x: 0.22, y: 0.36, w: 0.54, h: 0.42 };

const GAP = 0.02;
const SIDE_MARGIN = 0.05;
const CAPTION_HEIGHT = 0.1;
const PLATFORM_UI_HEIGHT = 0.1;

export const zonesFor = (face: Rect): Zones => {
  const maxBottom = 1 - PLATFORM_UI_HEIGHT - CAPTION_HEIGHT - GAP;
  if (face.y + face.h > maxBottom + 1e-9) {
    throw new Error(
      `Face box bottom ${(face.y + face.h).toFixed(2)} leaves no room for captions; keep y + h <= ${maxBottom.toFixed(2)} or raise the chin line`
    );
  }
  const rawBand = face.y - 0.03 - GAP;
  if (rawBand < 0.08 - 1e-9) {
    throw new Error(
      `Face box top ${face.y.toFixed(2)} leaves no room for the title band; keep y >= 0.13 or lower the face box`
    );
  }
  const leftW = Math.max(0, face.x - GAP - SIDE_MARGIN);
  const rightX = Math.min(1 - SIDE_MARGIN, face.x + face.w + GAP);
  const rightW = Math.max(0, 1 - SIDE_MARGIN - rightX);
  const captionsY = face.y + face.h + GAP;
  return {
    topBand: { x: 0.06, y: 0.03, w: 0.88, h: Math.min(0.19, rawBand) },
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
