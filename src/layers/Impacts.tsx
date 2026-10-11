import { AbsoluteFill, Sequence } from "remotion";
import { IMPACT_FRAMES } from "../storyboard/resolve";
import { COLORS } from "../theme";
import type { ResolvedVideo } from "../types";

export const Impacts: React.FC<{ resolved: ResolvedVideo }> = ({ resolved }) => (
  <>
    {resolved.moments.filter((m) => m.impact).map((m, i) => (
      <Sequence key={i} name={`impact ${m.impact}`} from={m.enterFrame} durationInFrames={IMPACT_FRAMES}>
        <AbsoluteFill style={{ backgroundColor: m.impact === "white" ? COLORS.text : "#000" }} />
      </Sequence>
    ))}
  </>
);
