/** Whole-frame jolt on the face layer: alternating offsets that decay linearly over `frames`. */
export const CAMERA_SHAKE_DEFAULT = { frames: 8, px: 14 };

/** Offset for `frame` of a shake entering at `enter`: full `px` on the first frame, alternating on x, decaying to px/frames on the last. */
export const cameraShakeAt = (frame: number, enter: number, frames: number, px: number): { x: number; y: number } => {
  const k = frame - enter;
  if (k < 0 || k >= frames) return { x: 0, y: 0 };
  const amp = px * (1 - k / frames);
  const sx = k % 2 === 0 ? 1 : -1;
  const sy = k % 4 < 2 ? -1 : 1;
  return { x: sx * amp, y: sy * amp * 0.6 };
};

/** Extra scale that keeps a `width` x `height` layer covering the frame (plus 1 px) while it is shifted by this frame's shake offset; 1 outside the window. */
export const cameraShakeCoverAt = (frame: number, enter: number, frames: number, px: number, width: number, height: number): number => {
  const s = cameraShakeAt(frame, enter, frames, px);
  if (s.x === 0 && s.y === 0) return 1;
  // 1 px margin: sub-pixel resampling at the shifted edge would otherwise bleed the background through.
  return 1 + Math.max((2 * (Math.abs(s.x) + 1)) / width, (2 * (Math.abs(s.y) + 1)) / height);
};

/** Sum of every cameraShake moment's offset at `frame`, and the product of their cover scales. */
export const cameraShakeOffsetAt = (
  moments: { enterFrame: number; cameraShake?: { frames: number; px: number } }[], frame: number, width = 1080, height = 1920,
): { x: number; y: number; scale: number } => {
  let x = 0;
  let y = 0;
  let scale = 1;
  for (const m of moments) {
    if (!m.cameraShake) continue;
    const s = cameraShakeAt(frame, m.enterFrame, m.cameraShake.frames, m.cameraShake.px);
    x += s.x;
    y += s.y;
    scale *= cameraShakeCoverAt(frame, m.enterFrame, m.cameraShake.frames, m.cameraShake.px, width, height);
  }
  return { x, y, scale };
};
