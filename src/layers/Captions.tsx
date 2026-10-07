import { AbsoluteFill, Easing, Sequence, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { groupWords, type CaptionGroup } from "../captions/group";
import { COLORS, fonts } from "../theme";
import { rectToStyle, zonesFor } from "../zones";
import type { ResolvedMoment, ResolvedVideo } from "../types";

const FONT_SIZE = 84;

const Group: React.FC<{ group: CaptionGroup; absoluteStart: number }> = ({ group, absoluteStart }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const absolute = absoluteStart + frame;
  const enter = spring({ frame, fps, config: { damping: 14, stiffness: 220, mass: 0.6 } });
  return (
    <div
      style={{
        width: "100%",
        textAlign: "center",
        fontFamily: fonts.display,
        fontWeight: 900,
        fontSize: FONT_SIZE,
        lineHeight: 1.05,
        textTransform: "uppercase",
        color: COLORS.text,
        WebkitTextStroke: `6px ${COLORS.ink}`,
        paintOrder: "stroke fill",
        textShadow: `0 8px 0 ${COLORS.ink}, 0 0 28px rgba(0,0,0,0.6)`,
        scale: interpolate(enter, [0, 1], [0.9, 1]),
        opacity: interpolate(enter, [0, 0.3], [0, 1], { extrapolateRight: "clamp" }),
      }}
    >
      {group.words.map((w, i) => {
        const spoken = absolute >= w.startFrame;
        const sinceStart = absolute - w.startFrame;
        const pop = interpolate(sinceStart, [0, 3, 7], [1, 1.26, 1.18], {
          extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic),
        });
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              margin: "0 0.4em",
              color: spoken ? COLORS.accent : COLORS.text,
              scale: spoken ? pop : 1,
            }}
          >
            {w.text}
          </span>
        );
      })}
    </div>
  );
};

export const Captions: React.FC<{ resolved: ResolvedVideo; emphasis: ResolvedMoment[] }> = ({ resolved }) => {
  const { width, height } = useVideoConfig();
  const zone = zonesFor(resolved.faceBox).captions;
  const groups = groupWords(resolved.words, {
    fps: resolved.fps,
    takeBoundaries: resolved.takes.slice(1).map((t) => t.startFrame),
  });
  return (
    <AbsoluteFill>
      <div style={{ ...rectToStyle(zone, width, height), display: "flex", alignItems: "center", justifyContent: "center" }}>
        {groups.map((g, i) => (
          <Sequence key={i} name={`Caption ${i}`} from={g.startFrame} durationInFrames={g.endFrame - g.startFrame} layout="none">
            <Group group={g} absoluteStart={g.startFrame} />
          </Sequence>
        ))}
      </div>
    </AbsoluteFill>
  );
};
