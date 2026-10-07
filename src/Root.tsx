import { Composition } from "remotion";
import { TalkingHead, calculateMetadata } from "./TalkingHead";

export const RemotionRoot: React.FC = () => {
  return (
    <>
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
