import { AbsoluteFill, Easing, Sequence, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { groupWords, type CaptionGroup } from "../captions/group";
import { COLORS, fonts } from "../theme";
import { rectToStyle, zonesFor } from "../zones";
import type { Emphasis, ResolvedMoment, ResolvedVideo } from "../types";

const FONT_SIZE = 84;

type GroupEmphasis = { kind: Emphasis; from: number; to: number };

const Group: React.FC<{ group: CaptionGroup; absoluteStart: number; emphasis?: GroupEmphasis }> = ({ group, absoluteStart, emphasis }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const absolute = absoluteStart + frame;
  const enter = spring({ frame, fps, config: { damping: 14, stiffness: 220, mass: 0.6 } });
  const flashing = emphasis !== undefined && emphasis.kind === "flash" && absolute >= emphasis.from && absolute < emphasis.from + 3;
  const emphasised = emphasis !== undefined && absolute >= emphasis.from && absolute < emphasis.to;
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
        color: flashing ? COLORS.accent : COLORS.text,
        WebkitTextStroke: `6px ${COLORS.ink}`,
        paintOrder: "stroke fill",
        textShadow: `0 8px 0 ${COLORS.ink}, 0 0 28px rgba(0,0,0,0.6)`,
        translate: emphasised && emphasis.kind === "shake" ? `${Math.sin((absolute - emphasis.from) * 2.6) * 14}px 0px` : "0px 0px",
        scale: interpolate(enter, [0, 1], [0.9, 1]) * (emphasised && emphasis.kind === "pulse" ? 1.1 : 1) * (flashing ? 1.08 : 1),
        opacity: interpolate(enter, [0, 0.3], [0, 1], { extrapolateRight: "clamp" }),
      }}
    >
      {group.words.map((w, i) => {
        const nextStart = group.words[i + 1]?.startFrame ?? Number.POSITIVE_INFINITY;
        const current = absolute >= w.startFrame && absolute < nextStart;
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
              paddingLeft: current ? `${(pop - 1) * w.text.length * 0.5}em` : 0,
              paddingRight: current ? `${(pop - 1) * w.text.length * 0.5}em` : 0,
              color: current ? COLORS.accent : COLORS.text,
              scale: current ? pop : 1,
            }}
          >
            {w.text}
          </span>
        );
      })}
    </div>
  );
};

export const Captions: React.FC<{ resolved: ResolvedVideo; emphasis: ResolvedMoment[] }> = ({ resolved, emphasis }) => {
  const { width, height } = useVideoConfig();
  const zone = zonesFor(resolved.faceBox).captions;
  const groups = groupWords(resolved.words, {
    fps: resolved.fps,
    takeBoundaries: resolved.takes.slice(1).map((t) => t.startFrame),
  });
  return (
    <AbsoluteFill>
      <div style={{ ...rectToStyle(zone, width, height), display: "flex", alignItems: "center", justifyContent: "center" }}>
        {groups.map((g, i) => {
          const e = emphasis.find((m) => m.enterFrame >= g.startFrame && m.enterFrame < g.endFrame);
          // premountFor is intentionally omitted: premounted children would occupy layout space in the flex column.
          return (
            <Sequence key={i} name={`Caption ${i}`} from={g.startFrame} durationInFrames={g.endFrame - g.startFrame} layout="none">
              <Group group={g} absoluteStart={g.startFrame} emphasis={e && e.emphasis ? { kind: e.emphasis, from: e.enterFrame, to: e.exitFrame } : undefined} />
            </Sequence>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
