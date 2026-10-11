import { AbsoluteFill, Sequence, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS, fonts } from "../theme";
import type { ResolvedVideo } from "../types";

const Chip: React.FC<{ text: string; top: number; height: number; boxWidthPx: number }> = ({ text, top, height, boxWidthPx }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const fontSize = Math.min(120, (boxWidthPx * 0.9) / (Math.max(text.length, 1) * 0.62));
  const pop = spring({ frame, fps, config: { damping: 12, stiffness: 200 } });
  const scale = interpolate(pop, [0, 1], [0.3, 1]);
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top, height, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div
        style={{
          scale, rotate: "-3deg", opacity: Math.min(1, pop * 2),
          backgroundColor: COLORS.accent, color: COLORS.ink, fontFamily: fonts.display, fontWeight: 900, fontSize,
          lineHeight: 1.05, padding: "18px 44px", borderRadius: 28, textAlign: "center", maxWidth: "92%",
        }}
      >
        {text}
      </div>
    </div>
  );
};

export const FreezeCaption: React.FC<{ resolved: ResolvedVideo }> = ({ resolved }) => {
  const { hookBox, height, width } = resolved;
  return (
    <AbsoluteFill>
      {resolved.freezes.map((f, i) => (
        <Sequence key={i} name="freeze caption" from={f.atFrame} durationInFrames={f.lengthFrames}>
          <Chip text={f.text} top={hookBox.y * height} height={hookBox.h * height} boxWidthPx={hookBox.w * width} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
