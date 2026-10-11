import { useCurrentFrame } from "remotion";
import { inOverlayGap, overlayGaps, titleGaps } from "../storyboard/overlayGaps";
import type { ResolvedVideo } from "../types";

/** Renders nothing while a cutaway is on screen (and, with `includeFreezes`, during freezes). */
export const HideInGaps: React.FC<{ resolved: ResolvedVideo; includeFreezes?: boolean; children: React.ReactNode }> = ({ resolved, includeFreezes, children }) => {
  const frame = useCurrentFrame();
  const gaps = includeFreezes ? titleGaps(resolved.moments) : overlayGaps(resolved.moments);
  return inOverlayGap(gaps, frame) ? null : <>{children}</>;
};
