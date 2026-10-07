import { AbsoluteFill, Sequence, useVideoConfig } from "remotion";
import { BigNumber } from "../graphics/BigNumber";
import { Counter } from "../graphics/Counter";
import { FlashCard } from "../graphics/FlashCard";
import { IconStack } from "../graphics/IconStack";
import { PunchList } from "../graphics/PunchList";
import { rectToStyle, zonesFor } from "../zones";
import type { ResolvedMoment, ResolvedVideo } from "../types";

const Graphic: React.FC<{ m: ResolvedMoment; zoneWidth: number }> = ({ m, zoneWidth }) => {
  const length = m.exitFrame - m.enterFrame;
  const s = m.show;
  if (!s) return null;
  switch (s.kind) {
    case "bigNumber": return <BigNumber spec={s} length={length} zoneWidth={zoneWidth} />;
    case "punchList": return <PunchList spec={s} length={length} zoneWidth={zoneWidth} />;
    case "iconStack": return <IconStack spec={s} length={length} zoneWidth={zoneWidth} />;
    case "counter": return <Counter spec={s} length={length} zoneWidth={zoneWidth} />;
    case "flashCard": return <FlashCard spec={s} length={length} />;
  }
};

export const Graphics: React.FC<{ resolved: ResolvedVideo }> = ({ resolved }) => {
  const { width, height } = useVideoConfig();
  const zones = zonesFor(resolved.faceBox);
  return (
    <AbsoluteFill>
      {resolved.moments.filter((m) => m.show).map((m, i) => {
        const rect = zones[m.zone === "captions" ? "left" : m.zone];
        const style = rectToStyle(rect, width, height);
        const alignLeft = m.zone === "left";
        return (
          <Sequence key={i} name={`${m.show!.kind} @${m.enterFrame}`} from={m.enterFrame} durationInFrames={m.exitFrame - m.enterFrame} layout="none">
            <div
              style={{
                ...style,
                display: "flex",
                flexDirection: "column",
                justifyContent: m.zone === "full" ? "center" : "flex-start",
                alignItems: alignLeft ? "flex-start" : m.zone === "right" ? "flex-end" : "center",
                paddingTop: m.zone === "full" ? 0 : 40,
                overflow: "visible",
              }}
            >
              <Graphic m={m} zoneWidth={Number(style.width)} />
            </div>
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
