import { AbsoluteFill, useVideoConfig } from "remotion";
import { COLORS, fonts } from "../theme";

export const FlashCard: React.FC<{ spec: { word: string }; length: number }> = ({ spec }) => {
  const { width } = useVideoConfig();
  const fontSize = Math.min(200, (width * 0.9 * 1.6) / spec.word.length);
  return (
  <AbsoluteFill style={{ backgroundColor: COLORS.accent, alignItems: "center", justifyContent: "center" }}>
    <div style={{ fontFamily: fonts.display, fontWeight: 900, fontSize, color: COLORS.ink, textTransform: "uppercase", rotate: "-4deg" }}>
      {spec.word}
    </div>
  </AbsoluteFill>
  );
};
