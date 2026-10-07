import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS, fonts } from "../theme";
import { useEnterExit } from "./enter";
import type { IconName } from "../types";

const Glyph: React.FC<{ name: IconName; tile: number }> = ({ name, tile }) => {
  const c = COLORS.accent;
  switch (name) {
    case "tt":
      return <svg viewBox="0 0 48 48" width="70%"><path d="M27 6v22a7 7 0 1 1-7-7v6a1 1 0 1 0 1 1V6h6c1 5 4 8 9 9v6c-3 0-6-1-9-3v10a13 13 0 1 1-13-13v6a7 7 0 1 0 7 7V6z" fill={c} /></svg>;
    case "ig":
      return <svg viewBox="0 0 48 48" width="70%"><rect x="8" y="8" width="32" height="32" rx="9" fill="none" stroke={c} strokeWidth="5" /><circle cx="24" cy="24" r="7" fill="none" stroke={c} strokeWidth="5" /><circle cx="33" cy="15" r="2.5" fill={c} /></svg>;
    case "yt":
      return <svg viewBox="0 0 48 48" width="70%"><rect x="5" y="12" width="38" height="24" rx="8" fill={c} /><path d="M21 18v12l10-6z" fill={COLORS.ink} /></svg>;
    case "fb":
      return <div style={{ fontFamily: fonts.display, fontWeight: 900, fontSize: tile * 0.43, color: c, lineHeight: 1 }}>f</div>;
  }
};

export const IconStack: React.FC<{ spec: { icons: IconName[] }; length: number; zoneWidth: number }> = ({ spec, length, zoneWidth }) => {
  const { exit } = useEnterExit(length);
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const tile = Math.min(150, zoneWidth * 0.85);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: tile * 0.15, alignItems: "center", opacity: exit }}>
      {spec.icons.map((icon, i) => {
        const s = spring({ frame: frame - i * 6, fps, config: { damping: 10, stiffness: 260 } });
        return (
          <div
            key={icon}
            style={{
              width: tile, height: tile, borderRadius: tile * 0.24,
              backgroundColor: COLORS.ink,
              boxShadow: `0 ${tile * 0.07}px 0 ${COLORS.accent}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              rotate: "5deg",
              scale: interpolate(s, [0, 1], [0, 1]),
            }}
          >
            <Glyph name={icon} tile={tile} />
          </div>
        );
      })}
    </div>
  );
};
