import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS, fonts } from "../theme";
import { useEnterExit } from "./enter";

const STAGGER = 8;

export const PunchList: React.FC<{ spec: { items: string[]; pick?: number; strike?: number[] }; length: number; zoneWidth: number }> = ({ spec, length, zoneWidth }) => {
  const { exit } = useEnterExit(length);
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const fontSize = Math.min(40, zoneWidth * 0.2);
  const strike = new Set(spec.strike ?? spec.items.map((_, i) => i).filter((i) => spec.pick !== undefined && i !== spec.pick));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: fontSize * 0.35, opacity: exit, maxWidth: zoneWidth }}>
      {spec.items.map((item, i) => {
        const s = spring({ frame: frame - i * STAGGER, fps, config: { damping: 12, stiffness: 220 } });
        const picked = spec.pick === i;
        const struck = strike.has(i);
        const strikeProgress = interpolate(frame, [i * STAGGER + 14, i * STAGGER + 22], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        return (
          <div
            key={i}
            style={{
              position: "relative",
              alignSelf: "flex-start",
              maxWidth: zoneWidth,
              fontFamily: fonts.body,
              fontWeight: 800,
              fontSize,
              padding: `${fontSize * 0.3}px ${fontSize * 0.55}px`,
              borderRadius: fontSize * 0.3,
              backgroundColor: picked ? COLORS.accent : COLORS.ink,
              color: picked ? COLORS.ink : COLORS.text,
              boxShadow: `0 ${fontSize * 0.2}px 0 ${picked ? COLORS.ink : COLORS.accent}`,
              transform: "skewX(-6deg)",
              translate: `${interpolate(s, [0, 1], [-80, 0])}px 0px`,
              opacity: s,
            }}
          >
            {picked ? "✓ " : ""}{item}
            {struck ? (
              <div style={{ position: "absolute", left: fontSize * 0.4, right: fontSize * 0.4, top: "50%", height: fontSize * 0.15, backgroundColor: COLORS.accent, scale: `${strikeProgress} 1`, transformOrigin: "left" }} />
            ) : null}
          </div>
        );
      })}
    </div>
  );
};
