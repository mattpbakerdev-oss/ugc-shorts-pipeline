import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

export const useEnterExit = (length: number, stiffness = 200) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 11, stiffness, mass: 0.7 } });
  const exit = interpolate(frame, [length - 6, length - 1], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return { enter, exit, frame, fps };
};
