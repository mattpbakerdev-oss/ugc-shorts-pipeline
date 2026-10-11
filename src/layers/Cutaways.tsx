import { Video } from "@remotion/media";
import { AbsoluteFill, Sequence, staticFile, useVideoConfig } from "remotion";
import type { ResolvedVideo } from "../types";

export const Cutaways: React.FC<{ resolved: ResolvedVideo }> = ({ resolved }) => {
  const { fps } = useVideoConfig();
  return (
    <>
      {resolved.moments.filter((m) => m.cutaway).map((m, i) => (
        <Sequence key={i} name={`cutaway ${m.cutaway!.file}`} from={m.enterFrame} durationInFrames={m.exitFrame - m.enterFrame}>
          <AbsoluteFill style={{ backgroundColor: "#000" }}>
            <Video
              src={staticFile(`videos/${resolved.id}/cutaways/${m.cutaway!.file}.mp4`)}
              trimBefore={m.cutaway!.fromFrame}
              premountFor={fps}
              muted
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </AbsoluteFill>
        </Sequence>
      ))}
    </>
  );
};
