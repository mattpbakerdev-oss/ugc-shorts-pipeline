import { useCurrentFrame } from "remotion";
import { inOverlayGap, overlayGaps } from "../storyboard/overlayGaps";
import type { ResolvedVideo } from "../types";

/** Renders nothing while a cutaway is on screen. */
export const HideInGaps: React.FC<{ resolved: ResolvedVideo; children: React.ReactNode }> = ({ resolved, children }) => {
  const frame = useCurrentFrame();
  return inOverlayGap(overlayGaps(resolved.moments), frame) ? null : <>{children}</>;
};
