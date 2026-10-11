import type { ResolvedVideo } from "./types";

export type FaceSegment = {
  kind: "play" | "freeze";
  /** Composition frame where the segment starts, and its length. */
  from: number;
  length: number;
  /** Source-timeline frame: first frame played (play) or the frame held (freeze). */
  sourceStart: number;
};

/**
 * Splits the composition into plain-playback and frozen segments. `freezes` are on the shifted
 * (composition) timeline; the face video is on the source timeline, so each freeze of N frames
 * pushes everything after it N frames later and holds one source frame meanwhile.
 */
export const faceSegments = (freezes: ResolvedVideo["freezes"], durationInFrames: number): FaceSegment[] => {
  const out: FaceSegment[] = [];
  let cursor = 0; // composition frame
  let shift = 0; // total frames frozen so far
  for (const f of [...freezes].sort((a, b) => a.atFrame - b.atFrame)) {
    if (f.atFrame > cursor) out.push({ kind: "play", from: cursor, length: f.atFrame - cursor, sourceStart: cursor - shift });
    out.push({ kind: "freeze", from: f.atFrame, length: f.lengthFrames, sourceStart: f.atFrame - shift });
    shift += f.lengthFrames;
    cursor = f.atFrame + f.lengthFrames;
  }
  if (durationInFrames > cursor) out.push({ kind: "play", from: cursor, length: durationInFrames - cursor, sourceStart: cursor - shift });
  return out;
};

/** Composition frame to source frame (frozen frames map to the held frame). */
export const sourceFrameAt = (freezes: ResolvedVideo["freezes"], frame: number): number => {
  let shift = 0;
  for (const f of [...freezes].sort((a, b) => a.atFrame - b.atFrame)) {
    if (frame < f.atFrame) break;
    if (frame < f.atFrame + f.lengthFrames) return f.atFrame - shift;
    shift += f.lengthFrames;
  }
  return frame - shift;
};
