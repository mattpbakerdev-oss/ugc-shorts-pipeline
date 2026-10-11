import { Audio } from "@remotion/media";
import { staticFile, useVideoConfig } from "remotion";
import { musicVolumeAt } from "../musicVolume";
import type { ResolvedVideo } from "../types";

export const Music: React.FC<{ resolved: ResolvedVideo }> = ({ resolved }) => {
  const { fps } = useVideoConfig();
  const { music, ducking } = resolved;
  if (!music) return null;
  return (
    <Audio
      src={staticFile(`music/${music.file}`)}
      loop
      premountFor={fps}
      volume={(f) => musicVolumeAt(f, ducking, music.volume)}
    />
  );
};
