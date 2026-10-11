import { interpolate } from "remotion";
import { COLORS, fonts } from "../theme";
import { useEnterExit } from "./enter";
import { formatBigValue } from "./format";

export const BigNumber: React.FC<{ spec: { value: string; label: string; prefix?: string }; length: number; zoneWidth: number }> = ({ spec, length, zoneWidth }) => {
  const { enter, exit } = useEnterExit(length);
  const text = formatBigValue(spec.value, spec.prefix);
  const chars = Math.max(2, text.length);
  const fontSize = Math.min(260, (zoneWidth * 0.95 * 2) / chars);
  const labelSize = Math.min(56, (zoneWidth * 0.95) / (Math.max(1, spec.label.length) * 0.62));
  return (
    <div
      style={{
        maxWidth: zoneWidth,
        fontFamily: fonts.display,
        fontWeight: 900,
        color: COLORS.accent,
        WebkitTextStroke: `${fontSize * 0.03}px ${COLORS.ink}`,
        paintOrder: "stroke fill",
        textShadow: `0 ${fontSize * 0.07}px 0 ${COLORS.ink}`,
        lineHeight: 0.9,
        rotate: "-6deg",
        scale: interpolate(enter, [0, 1], [1.8, 1]) * exit,
        opacity: Math.min(1, enter * 3) * exit,
      }}
    >
      <div style={{ fontSize }}>{text}</div>
      <div style={{ fontSize: labelSize, color: COLORS.text, WebkitTextStroke: `${labelSize * 0.07}px ${COLORS.ink}`, paintOrder: "stroke fill", textShadow: `0 ${labelSize * 0.07}px 0 ${COLORS.ink}`, lineHeight: 1.1, marginTop: labelSize * 0.18, letterSpacing: "0.02em" }}>
        {spec.label}
      </div>
    </div>
  );
};
