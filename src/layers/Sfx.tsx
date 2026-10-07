import { Audio } from "@remotion/media";
import { Sequence, staticFile, useVideoConfig } from "remotion";
import type { ResolvedVideo } from "../types";

export const Sfx: React.FC<{ resolved: ResolvedVideo }> = ({ resolved }) => {
  const { fps } = useVideoConfig();
  return (
    <>
      {resolved.moments.filter((m) => m.sfx).map((m, i) => (
        <Sequence key={i} name={`sfx ${m.sfx}`} from={m.enterFrame} durationInFrames={3 * fps} layout="none">
          <Audio src={staticFile(`sfx/${m.sfx}.wav`)} premountFor={fps} volume={0.8} />
        </Sequence>
      ))}
    </>
  );
};
