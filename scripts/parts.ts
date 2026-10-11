import path from "node:path";
import type { Storyboard } from "../src/types";

export type PartPlan = { file: string; absPath: string; label: string };

/** Ordered pre-cut clips from the storyboard `source`; label = basename without extension. */
export const partsPlan = (source: Pick<NonNullable<Storyboard["source"]>, "dir" | "parts">): PartPlan[] => {
  if (source.parts.length === 0) throw new Error("source has no parts; list at least one clip");
  const seen = new Set<string>();
  return source.parts.map((file) => {
    const label = path.basename(file, path.extname(file));
    if (seen.has(label)) throw new Error(`Duplicate part label "${label}" (from ${file}); labels are the basename without extension`);
    seen.add(label);
    return { file, absPath: path.join(source.dir, file), label };
  });
};
