export const WIDTH = 1080;
export const HEIGHT = 1920;
export const FPS = 30;

export type SourceInfo = { width: number; height: number; rotation: number; fps: number };

/**
 * Accepts any 9:16 source at 30 fps or more (ffmpeg auto-rotates on decode, so a 3840x2160 clip with a
 * +-90 rotation tag displays as 2160x3840). `scale` says whether prep must scale it to 1080x1920.
 */
export const checkSource = (file: string, info: SourceInfo): { scale: boolean } => {
  const rotated = Math.abs(((info.rotation % 180) + 180) % 180) === 90;
  const w = rotated ? info.height : info.width;
  const h = rotated ? info.width : info.height;
  if (Math.abs(w / h - WIDTH / HEIGHT) > 0.005) {
    throw new Error(`${file} is ${info.width}x${info.height}${rotated ? ` (rotated ${info.rotation}, displays ${w}x${h})` : ""}; expected a 9:16 portrait take`);
  }
  if (info.fps < FPS - 0.01) throw new Error(`${file} is ${info.fps} fps; expected at least ${FPS}`);
  return { scale: w !== WIDTH || h !== HEIGHT };
};
