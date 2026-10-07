import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS, fonts } from "../theme";
import { CHIP_BASE_FONT, hookChipFontSize, splitHook } from "../hookChips";
import { rectToStyle } from "../zones";
import type { Rect, ResolvedSection } from "../types";

const STEP = 0.03;
const TILTS = [-2, 1, -1.5];
const STYLES = [
  { bg: COLORS.text, fg: COLORS.ink },
  { bg: COLORS.accent, fg: COLORS.ink },
  { bg: COLORS.ink, fg: COLORS.text },
];
// Montserrat 900 uppercase averages ~0.8em per glyph; used only to shrink an over-wide chip.
const EST_EM_PER_CHAR = 0.8;

export const HookChips: React.FC<{ section: ResolvedSection; zone: Rect; forceIn?: boolean }> = ({ section, zone, forceIn = false }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const length = section.endFrame - section.startFrame;
  const chips = splitHook(section.title);
  const exit = forceIn ? 1 : interpolate(frame, [length - 6, length - 1], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const left = 0.02 * width;
  const bandFont = hookChipFontSize(zone.h * height, chips.length);
  const k = bandFont / CHIP_BASE_FONT;
  const padX = 28 * k;
  const padY = 14 * k;
  const gap = 14 * k;
  return (
    <div style={{ ...rectToStyle(zone, width, height), display: "flex", flexDirection: "column", alignItems: "flex-start", justifyContent: "flex-start", gap }}>
      {chips.map((text, i) => {
        const enter = forceIn ? 1 : spring({ frame: frame - i * 8, fps, config: { damping: 10, stiffness: 180 } });
        const offset = left + i * STEP * width;
        const maxW = zone.w * width - offset;
        const est = text.length * EST_EM_PER_CHAR * bandFont + 2 * padX;
        const fontSize = est > maxW ? Math.floor(bandFont * (maxW - 2 * padX) / (est - 2 * padX)) : bandFont;
        const { bg, fg } = STYLES[i];
        return (
          <div
            key={i}
            style={{
              translate: `${offset}px 0`,
              backgroundColor: bg,
              color: fg,
              fontFamily: fonts.display,
              fontWeight: 900,
              fontSize,
              lineHeight: 1.1,
              textTransform: "uppercase",
              whiteSpace: "nowrap",
              padding: `${padY}px ${padX}px`,
              borderRadius: 14 * k,
              boxShadow: `0 ${8 * k}px 0 ${COLORS.ink}`,
              rotate: `${TILTS[i]}deg`,
              scale: interpolate(enter, [0, 1], [0.6, 1]) * exit,
              opacity: Math.min(1, enter * 4) * exit,
            }}
          >
            {text}
          </div>
        );
      })}
    </div>
  );
};
