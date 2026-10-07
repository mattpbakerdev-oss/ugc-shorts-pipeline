import { AbsoluteFill, Sequence, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS, fonts } from "../theme";
import { rectToStyle, zonesFor } from "../zones";
import type { ResolvedSection, ResolvedVideo } from "../types";

const Pill: React.FC<{ section: ResolvedSection }> = ({ section }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const length = section.endFrame - section.startFrame;
  const enter = spring({ frame, fps, config: { damping: 12, stiffness: 180 } });
  const exit = interpolate(frame, [length - 6, length - 1], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const lines = section.title.split("//").map((s) => s.trim());
  return (
    <div
      style={{
        display: "inline-block",
        backgroundColor: COLORS.accent,
        color: COLORS.ink,
        fontFamily: fonts.display,
        fontWeight: 900,
        fontSize: section.isHook ? 64 : 56,
        lineHeight: 1.1,
        textTransform: "uppercase",
        textAlign: "center",
        padding: "18px 36px",
        borderRadius: 18,
        boxShadow: `0 12px 0 ${COLORS.ink}`,
        maxWidth: "100%",
        rotate: "-2deg",
        scale: interpolate(enter, [0, 1], [0.6, 1]) * exit,
        opacity: exit,
      }}
    >
      {lines.map((l, i) => <div key={i}>{l}</div>)}
    </div>
  );
};

export const SectionTitles: React.FC<{ resolved: ResolvedVideo }> = ({ resolved }) => {
  const { width, height } = useVideoConfig();
  const zone = zonesFor(resolved.faceBox).topBand;
  return (
    <AbsoluteFill>
      <div style={{ ...rectToStyle(zone, width, height), display: "flex", alignItems: "center", justifyContent: "center" }}>
        {resolved.sections.map((s, i) => (
          <Sequence key={i} name={`Title: ${s.title}`} from={s.startFrame} durationInFrames={s.endFrame - s.startFrame} layout="none">
            <Pill section={s} />
          </Sequence>
        ))}
      </div>
    </AbsoluteFill>
  );
};
