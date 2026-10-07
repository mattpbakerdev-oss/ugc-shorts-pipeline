import { Composition } from "remotion";
import { TalkingHead, calculateMetadata } from "./TalkingHead";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* Remotion disallows underscores in composition ids; props.id keeps the underscore (data folder name). */}
      <Composition
        id="v2-ai-b"
        component={TalkingHead}
        durationInFrames={30}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{ id: "v2_ai_b", showZones: false }}
        calculateMetadata={calculateMetadata}
      />
    </>
  );
};
