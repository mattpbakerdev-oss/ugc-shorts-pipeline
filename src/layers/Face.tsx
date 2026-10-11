import { Video } from "@remotion/media";
import { AbsoluteFill, Freeze, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { crashScaleAt, crashShakeAt } from "../crashZoom";
import { faceSegments, sourceFrameAt } from "../faceSegments";
import { scaleAtFrame } from "../punchIn";
import type { ResolvedVideo } from "../types";

/**
 * The face video is on the SOURCE timeline; the composition is shifted by freezes. faceSegments()
 * splits it: play segments are Sequences with trimBefore at their source start (audio pauses in the gaps),
 * freeze segments hold one source frame, muted.
 */
export const Face: React.FC<{ resolved: ResolvedVideo }> = ({ resolved }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { faceBox } = resolved;
  const src = staticFile(`videos/${resolved.id}/face.mp4`);
  const originX = `${(faceBox.x + faceBox.w / 2) * 100}%`;
  const originY = `${(faceBox.y + faceBox.h / 2) * 100}%`;

  let crash = 1;
  let shakeX = 0;
  let shakeY = 0;
  for (const m of resolved.moments) {
    if (!m.crashZoom) continue;
    crash *= crashScaleAt(frame, m.enterFrame, m.exitFrame, m.crashZoom.scale);
    if (m.crashZoom.shake) {
      const s = crashShakeAt(frame, m.enterFrame);
      shakeX += s.x;
      shakeY += s.y;
    }
  }
  const scale = scaleAtFrame(resolved.takes, sourceFrameAt(resolved.freezes, frame)) * crash;
  const style = { width: "100%", height: "100%", objectFit: "cover" as const };

  return (
    <AbsoluteFill style={{ scale, translate: `${shakeX}px ${shakeY}px`, transformOrigin: `${originX} ${originY}` }}>
      {faceSegments(resolved.freezes, resolved.durationInFrames).map((s, i) => (
        <Sequence key={i} name={s.kind === "freeze" ? "Face freeze" : "Face"} from={s.from} durationInFrames={s.length} layout="none">
          {s.kind === "play" ? (
            <Video src={src} trimBefore={s.sourceStart} premountFor={fps} style={style} />
          ) : (
            <Freeze frame={0}>
              <Video src={src} trimBefore={s.sourceStart} premountFor={fps} muted style={style} />
            </Freeze>
          )}
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
