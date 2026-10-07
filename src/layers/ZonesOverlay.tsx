import { AbsoluteFill, useVideoConfig } from "remotion";
import { rectToStyle, zonesFor } from "../zones";
import type { Rect } from "../types";

const colours: Record<string, string> = {
  topBand: "#FFD600", left: "#4cd964", right: "#4cd964", face: "#ff3b30", captions: "#ffffff", platformUi: "#999999", graphicsBox: "#00e5ff",
};

export const ZonesOverlay: React.FC<{ faceBox: Rect; captionY?: number; graphicsBox?: Rect }> = ({ faceBox, captionY, graphicsBox }) => {
  const { width, height } = useVideoConfig();
  const base = zonesFor(faceBox);
  // resolved.graphicsBox is always set; only draw it when it differs from the derived side zones.
  const same = (a: Rect, b: Rect) => (["x", "y", "w", "h"] as const).every((k) => Math.abs(a[k] - b[k]) < 1e-9);
  const override = graphicsBox && !same(graphicsBox, base.left) && !same(graphicsBox, base.right) ? graphicsBox : undefined;
  const zones = zonesFor(faceBox, { captionY, graphicsBox: override });
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {(Object.keys(colours) as (keyof typeof zones)[]).filter((name) => zones[name]).map((name) => (
        <div
          key={name}
          style={{
            ...rectToStyle(zones[name] as Rect, width, height),
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
