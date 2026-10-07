import type { Rect } from "./types";

export const splitHook = (title: string): string[] => {
  const parts = title.split("//").map((s) => s.trim()).filter(Boolean);
  if (parts.length < 1 || parts.length > 3) {
    throw new Error(`Hook "${title}" must split on "//" into 1-3 chips, got ${parts.length}`);
  }
  return parts;
};

export const CHIP_BASE_FONT = 56;
export const CHIP_PAD_Y = 14;
export const CHIP_GAP = 14;
const CHIP_SHADOW = 8;

export const CHIP_PAD_X = 28;
export const CHIP_MIN_FONT = 36;
export const CHIP_STEP_PX = 32;

/**
 * Largest chip font size (<= 56) at which n stacked, staircased chips fit a box of
 * boxWidthPx x bandPx. Throws if it would be below 36.
 */
export const COVER_MAX_FONT = 96;
export const COVER_HOOK_BOTTOM = 0.6;
const BOX_GAP = 0.02;

/** Cover-only: extend the hook box down to 0.60, stopping 0.02 above the face if it would overlap it. */
export const coverHookBox = (hookBox: Rect, faceBox: Rect): Rect => {
  const bottom = hookBox.y + hookBox.h;
  if (bottom >= COVER_HOOK_BOTTOM) return hookBox;
  const clearX = hookBox.x + hookBox.w <= faceBox.x - BOX_GAP + 1e-9 || hookBox.x >= faceBox.x + faceBox.w + BOX_GAP - 1e-9;
  const target = clearX ? COVER_HOOK_BOTTOM : Math.min(COVER_HOOK_BOTTOM, faceBox.y - BOX_GAP);
  return { ...hookBox, h: Math.max(hookBox.h, target - hookBox.y) };
};

export const hookChipFontSize = (bandPx: number, n: number, boxWidthPx = Infinity, longestChipChars = 0, hook = "", maxFont = CHIP_BASE_FONT, stepPx = CHIP_STEP_PX): number => {
  const byHeight = (bandPx - (n - 1) * CHIP_GAP - n * (CHIP_PAD_Y * 2 + CHIP_SHADOW)) / (n * 1.1);
  const byWidth = longestChipChars > 0 ? (boxWidthPx - (n - 1) * stepPx - 2 * CHIP_PAD_X) / (longestChipChars * 0.62) : Infinity;
  const fs = Math.min(maxFont, byHeight, byWidth);
  if (fs < CHIP_MIN_FONT - 1e-9) {
    throw new Error(`Hook "${hook}" would need ${fs.toFixed(0)}px chips (< ${CHIP_MIN_FONT}); give the storyboard a bigger hookBox or use shorter chips`);
  }
  return fs;
};
