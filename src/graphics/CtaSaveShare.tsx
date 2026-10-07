import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS } from "../theme";
import { useEnterExit } from "./enter";

const TICK_DELAY = 10;
const TICK_FRAMES = 8;
const TICK_PATH = "M8 26 L19 37 L40 12";

const Badge: React.FC<{ start: number; tile: number }> = ({ start, tile }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const size = tile * 0.4;
  const pop = spring({ frame: frame - start, fps, config: { damping: 10, stiffness: 260 } });
  const p = interpolate(frame, [start + 2, start + 2 + TICK_FRAMES], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div
      style={{
        position: "absolute", top: -size * 0.25, right: -size * 0.25,
        width: size, height: size, borderRadius: "50%",
        backgroundColor: COLORS.accent,
        boxShadow: `0 ${size * 0.08}px 0 ${COLORS.ink}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        scale: interpolate(pop, [0, 1], [0, 1]),
      }}
    >
      <svg viewBox="0 0 48 48" width="62%" height="62%">
        <path d={TICK_PATH} fill="none" stroke={COLORS.ink} strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - p} />
      </svg>
    </div>
  );
};

const Glyph: React.FC<{ name: "save" | "share" }> = ({ name }) => {
  const c = COLORS.accent;
  return name === "save"
    ? <svg viewBox="0 0 48 48" width="70%"><path d="M12 6h24v37L24 33 12 43z" fill="none" stroke={c} strokeWidth="5" strokeLinejoin="round" /></svg>
    : <svg viewBox="0 0 48 48" width="70%"><path d="M8 28v12h32V28" fill="none" stroke={c} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" /><path d="M24 31V8M14 18l10-10 10 10" fill="none" stroke={c} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" /></svg>;
};

export const CtaSaveShare: React.FC<{ length: number; zoneWidth: number }> = ({ length, zoneWidth }) => {
  const { exit } = useEnterExit(length);
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const tile = Math.min(150, zoneWidth * 0.85);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: tile * 0.15, alignItems: "center", opacity: exit }}>
      {(["save", "share"] as const).map((name, i) => {
        const s = spring({ frame: frame - i * 6, fps, config: { damping: 10, stiffness: 260 } });
        return (
          <div
            key={name}
            style={{
              position: "relative",
              width: tile, height: tile, borderRadius: tile * 0.24,
              backgroundColor: COLORS.ink,
              boxShadow: `0 ${tile * 0.07}px 0 ${COLORS.accent}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              rotate: "5deg",
              scale: interpolate(s, [0, 1], [0, 1]),
            }}
          >
            <Glyph name={name} />
            <Badge start={TICK_DELAY + i * 6} tile={tile} />
          </div>
        );
      })}
    </div>
  );
};
