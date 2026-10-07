import { AbsoluteFill, Easing, Sequence, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { groupWords, type CaptionGroup } from "../captions/group";
import { COLORS, fonts } from "../theme";
import { rectToStyle, zonesFor } from "../zones";
import type { Emphasis, ResolvedMoment, ResolvedVideo } from "../types";

const FONT_SIZE = 84;
const POP_SETTLED = 1.18;
const SIDE_MARGIN_PX = 80;
const WORD_GAP_EM = 0.15; // margin each side of a word
const CHAR_EM = 0.84; // approx. Montserrat 900 uppercase advance incl. stroke

// Width in em of the widest row, including the reserved pop padding, so the font can shrink to keep the text inside the safe margins.
const rowWidthEm = (line: { text: string }[]) =>
  line.reduce((sum, w) => sum + w.text.length * (CHAR_EM + (POP_SETTLED - 1)) + WORD_GAP_EM * 2, 0);
const fitFontSize = (lines: { text: string }[][], frameWidth: number) =>
  Math.min(FONT_SIZE, (frameWidth - 2 * SIDE_MARGIN_PX) / Math.max(...lines.map(rowWidthEm)));

type GroupEmphasis = { kind: Emphasis; from: number; to: number };

const Group: React.FC<{ group: CaptionGroup; absoluteStart: number; emphasis?: GroupEmphasis }> = ({ group, absoluteStart, emphasis }) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
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
        fontSize: fitFontSize(group.lines, width),
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
      {group.lines.map((line, li) => (
        <div key={li} style={{ whiteSpace: "nowrap" }}>
          {line.map((w) => {
            const i = group.words.indexOf(w);
            const nextStart = group.words[i + 1]?.startFrame ?? Number.POSITIVE_INFINITY;
            const current = absolute >= w.startFrame && absolute < nextStart;
            const sinceStart = absolute - w.startFrame;
            const pop = interpolate(sinceStart, [0, 3, 7], [1, 1.26, POP_SETTLED], {
              extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic),
            });
            // Reserve the settled pop width for every word from the start so the highlight never reflows the line.
            const reserve = `${(POP_SETTLED - 1) * w.text.length * 0.5}em`;
            return (
              <span
                key={i}
                style={{
                  display: "inline-block",
                  margin: `0 ${WORD_GAP_EM}em`,
                  paddingLeft: reserve,
                  paddingRight: reserve,
                  color: current ? COLORS.accent : COLORS.text,
                  scale: current ? pop : 1,
                }}
              >
                {w.text}
              </span>
            );
          })}
        </div>
      ))}
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
