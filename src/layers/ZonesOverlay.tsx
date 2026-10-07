import { AbsoluteFill, useVideoConfig } from "remotion";
import { rectToStyle, zonesFor } from "../zones";
import type { Rect } from "../types";

const colours: Record<string, string> = {
  topBand: "#FFD600", left: "#4cd964", right: "#4cd964", face: "#ff3b30", captions: "#ffffff", platformUi: "#999999",
};

export const ZonesOverlay: React.FC<{ faceBox: Rect }> = ({ faceBox }) => {
  const { width, height } = useVideoConfig();
  const zones = zonesFor(faceBox);
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {(Object.keys(colours) as (keyof typeof zones)[]).map((name) => (
        <div
          key={name}
          style={{
            ...rectToStyle(zones[name], width, height),
            border: `3px dashed ${colours[name]}`,
            boxSizing: "border-box",
            color: colours[name],
            fontFamily: "sans-serif",
            fontSize: 28,
            padding: 6,
          }}
        >
          {name}
        </div>
      ))}
    </AbsoluteFill>
  );
};
