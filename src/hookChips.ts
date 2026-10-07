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

/** Largest chip font size (<= 56) at which n stacked chips fit in a band of bandPx pixels. */
export const hookChipFontSize = (bandPx: number, n: number): number =>
  Math.max(1, Math.min(CHIP_BASE_FONT, (bandPx - (n - 1) * CHIP_GAP - n * (CHIP_PAD_Y * 2 + CHIP_SHADOW)) / (n * 1.1)));
