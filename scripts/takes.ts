import type { Take } from "../src/types";

export const buildTakes = (items: { file: string; frames: number }[]): Take[] => {
  let cursor = 0;
  return items.map(({ file, frames }) => {
    if (!Number.isInteger(frames) || frames <= 0) {
      throw new Error(`Take ${file} has ${frames} frames; expected a positive integer`);
    }
    const take = { file, startFrame: cursor, endFrame: cursor + frames };
    cursor += frames;
    return take;
  });
};

/** Throws when a transcriptOverrides entry names a take that does not exist. */
export const assertOverrideTakes = (id: string, overrides: { take: number }[], takeCount: number): void => {
  for (const o of overrides) {
    if (o.take > takeCount) throw new Error(`${id}: transcriptOverrides take ${o.take} but there are only ${takeCount} takes`);
  }
};
