import { AbsoluteFill, Sequence, useVideoConfig } from "remotion";
import { BigNumber } from "../graphics/BigNumber";
import { Counter } from "../graphics/Counter";
import { FlashCard } from "../graphics/FlashCard";
import { IconStack } from "../graphics/IconStack";
import { PunchList } from "../graphics/PunchList";
import { rectToStyle, zonesFor } from "../zones";
import type { ResolvedMoment, ResolvedVideo } from "../types";

const Graphic: React.FC<{ m: ResolvedMoment; zoneWidth: number; align: "left" | "right" }> = ({ m, zoneWidth, align }) => {
  const length = m.exitFrame - m.enterFrame;
  const s = m.show;
  if (!s) return null;
  switch (s.kind) {
    case "bigNumber": return <BigNumber spec={s} length={length} zoneWidth={zoneWidth} />;
    case "punchList": return <PunchList spec={s} length={length} zoneWidth={zoneWidth} align={align} />;
    case "iconStack": return <IconStack spec={s} length={length} zoneWidth={zoneWidth} />;
    case "counter": return <Counter spec={s} length={length} zoneWidth={zoneWidth} />;
    case "flashCard": return <FlashCard spec={s} length={length} />;
  }
};

const SideColumn: React.FC<{ side: "left" | "right" | "graphics"; resolved: ResolvedVideo }> = ({ side, resolved }) => {
  const { width, height } = useVideoConfig();
  const rect = side === "graphics" ? resolved.graphicsBox : zonesFor(resolved.faceBox)[side];
  const { faceBox } = resolved;
  const align: "left" | "right" = side === "graphics"
    ? (rect.x + rect.w / 2 < faceBox.x + faceBox.w / 2 ? "left" : "right")
    : side;
  const items = resolved.moments
    .filter((m) => m.show && m.zone === side)
    .sort((a, b) => a.enterFrame - b.enterFrame);
  if (items.length === 0) return null;
  return (
    <div
      style={{
        ...rectToStyle(rect, width, height),
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-start",
        alignItems: align === "left" ? "flex-start" : "flex-end",
        gap: 24,
        paddingTop: 40,
        overflow: "visible",
      }}
    >
      {items.map((m, i) => (
        // premountFor is intentionally omitted: premounted children would occupy layout space in the flex column.
        <Sequence key={i} name={`${m.show!.kind} @${m.enterFrame}`} from={m.enterFrame} durationInFrames={m.exitFrame - m.enterFrame} layout="none">
          <Graphic m={m} zoneWidth={Math.round(rect.w * width)} align={align} />
        </Sequence>
      ))}
    </div>
  );
};

export const Graphics: React.FC<{ resolved: ResolvedVideo }> = ({ resolved }) => {
  const { width } = useVideoConfig();
  return (
    <AbsoluteFill>
      <SideColumn side="left" resolved={resolved} />
      <SideColumn side="right" resolved={resolved} />
      <SideColumn side="graphics" resolved={resolved} />
      {resolved.moments.filter((m) => m.show && m.zone === "full").map((m, i) => (
        <Sequence key={i} name={`${m.show!.kind} @${m.enterFrame}`} from={m.enterFrame} durationInFrames={m.exitFrame - m.enterFrame} layout="none">
          <AbsoluteFill>
            <Graphic m={m} zoneWidth={width} align="left" />
          </AbsoluteFill>
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
