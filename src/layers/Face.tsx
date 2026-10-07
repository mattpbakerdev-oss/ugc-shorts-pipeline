import { Video } from "@remotion/media";
import { AbsoluteFill, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { scaleAtFrame } from "../punchIn";
import type { ResolvedVideo } from "../types";

export const Face: React.FC<{ resolved: ResolvedVideo }> = ({ resolved }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { faceBox } = resolved;
  const originX = `${(faceBox.x + faceBox.w / 2) * 100}%`;
  const originY = `${(faceBox.y + faceBox.h / 2) * 100}%`;
  return (
    <AbsoluteFill>
      <Video
        name="Face"
        src={staticFile(`videos/${resolved.id}/face.mp4`)}
        premountFor={fps}
        style={{
          width: "100%",
          height: "100%",
          scale: scaleAtFrame(resolved.takes, frame, fps),
          transformOrigin: `${originX} ${originY}`,
        }}
      />
    </AbsoluteFill>
  );
};
