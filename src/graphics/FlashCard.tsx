import { AbsoluteFill } from "remotion";
import { COLORS, fonts } from "../theme";

export const FlashCard: React.FC<{ spec: { word: string }; length: number }> = ({ spec }) => (
  <AbsoluteFill style={{ backgroundColor: COLORS.accent, alignItems: "center", justifyContent: "center" }}>
    <div style={{ fontFamily: fonts.display, fontWeight: 900, fontSize: 200, color: COLORS.ink, textTransform: "uppercase", rotate: "-4deg" }}>
      {spec.word}
    </div>
  </AbsoluteFill>
);
