import { Easing, interpolate } from "remotion";
import { COLORS, fonts } from "../theme";
import { useEnterExit } from "./enter";
import { formatBigValue } from "./format";

export const Counter: React.FC<{ spec: { from: number; to: number; label: string; prefix?: string }; length: number; zoneWidth: number }> = ({ spec, length, zoneWidth }) => {
  const { enter, exit, frame, fps } = useEnterExit(length);
  const chars = Math.max(2, formatBigValue(spec.to, spec.prefix).length);
  const fontSize = Math.min(260, (zoneWidth * 0.95 * 2) / chars);
  const labelSize = Math.min(56, (zoneWidth * 0.95) / (Math.max(1, spec.label.length) * 0.62));
  const value = Math.round(
    interpolate(frame, [6, 6 + fps * 1.2], [spec.from, spec.to], {
      extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic),
    }),
  );
  return (
    <div
      style={{
        maxWidth: zoneWidth,
        fontFamily: fonts.display, fontWeight: 900, color: COLORS.accent,
        WebkitTextStroke: `${fontSize * 0.03}px ${COLORS.ink}`, paintOrder: "stroke fill",
        textShadow: `0 ${fontSize * 0.07}px 0 ${COLORS.ink}`, lineHeight: 0.9, rotate: "-6deg",
        scale: interpolate(enter, [0, 1], [1.6, 1]) * exit, opacity: Math.min(1, enter * 3) * exit,
      }}
    >
      <div style={{ fontSize, fontVariantNumeric: "tabular-nums" }}>{formatBigValue(value, spec.prefix)}</div>
      <div style={{ fontSize: labelSize, color: COLORS.text, WebkitTextStroke: `${labelSize * 0.07}px ${COLORS.ink}`, paintOrder: "stroke fill", textShadow: `0 ${labelSize * 0.07}px 0 ${COLORS.ink}`, lineHeight: 1.1, marginTop: labelSize * 0.18 }}>{spec.label}</div>
    </div>
  );
};
