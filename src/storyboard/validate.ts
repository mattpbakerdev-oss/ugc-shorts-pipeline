import { SFX_NAMES, type Moment, type Storyboard } from "../types";

const stringsIn = (m: Moment): string[] => {
  const out: string[] = [];
  if (m.on) out.push(m.on);
  if (typeof m.hold === "string") out.push(m.hold);
  const s = m.show;
  if (s) {
    if (s.kind === "bigNumber") out.push(s.value, s.label);
    if (s.kind === "punchList") out.push(...s.items);
    if (s.kind === "counter") out.push(s.label);
    if (s.kind === "flashCard") out.push(s.word);
  }
  return out;
};

export const validateStoryboard = (sb: Storyboard): void => {
  sb.sections.forEach((s, i) => {
    if (!Number.isInteger(s.take) || s.take < 1) {
      throw new Error(`${sb.id}: section ${i} has take ${s.take}; takes are numbered from 1`);
    }
  });
  (sb.cuts ?? []).forEach((c, i) => {
    if (!Number.isInteger(c.take) || c.take < 1) throw new Error(`${sb.id}: cut ${i} has take ${c.take}; takes are numbered from 1`);
    if (!(c.from >= 0)) throw new Error(`${sb.id}: cut ${i} has from ${c.from}; must be >= 0`);
    if (!(c.to > c.from)) throw new Error(`${sb.id}: cut ${i} has to ${c.to} <= from ${c.from}`);
  });
  sb.moments.forEach((m, i) => {
    const label = `${sb.id}: moment ${i}`;
    if (m.on === undefined && m.at === undefined) throw new Error(`${label} needs "on" (a phrase) or "at" (seconds)`);
    if (m.on !== undefined && m.at !== undefined) throw new Error(`${label} has both "on" and "at"; use one`);
    for (const s of stringsIn(m)) {
      if (/postiz/i.test(s)) throw new Error(`${label} references Postiz ("${s}"); the brand must not be amplified`);
    }
    if (m.sfx && !SFX_NAMES.includes(m.sfx)) throw new Error(`${label} uses unknown sfx "${m.sfx}"; known: ${SFX_NAMES.join(", ")}`);
  });
};
