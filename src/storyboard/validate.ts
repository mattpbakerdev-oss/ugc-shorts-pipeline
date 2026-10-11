import { DEFAULT_FACE_BOX, GAP, overlapsRect } from "../zones";
import { SFX_NAMES, type Moment, type Storyboard } from "../types";

const stringsIn = (m: Moment): string[] => {
  const out: string[] = [];
  if (m.on) out.push(m.on);
  if (typeof m.hold === "string") out.push(m.hold);
  if (m.freeze) out.push(m.freeze.text);
  if (m.cutaway) out.push(m.cutaway.file);
  const s = m.show;
  if (s) {
    if (s.kind === "bigNumber") out.push(s.value, s.label, s.prefix ?? "");
    if (s.kind === "punchList") out.push(...s.items);
    if (s.kind === "counter") out.push(s.label);
    if (s.kind === "flashCard") out.push(s.word);
  }
  return out;
};

export const validateStoryboard = (sb: Storyboard): void => {
  if (sb.source) {
    if (!Array.isArray(sb.source.parts) || sb.source.parts.length === 0) throw new Error(`${sb.id}: source.parts must be a non-empty list`);
    if (sb.source.trim !== undefined && typeof sb.source.trim !== "boolean") throw new Error(`${sb.id}: source.trim must be a boolean`);
  }
  if (sb.music) {
    if (!sb.music.file) throw new Error(`${sb.id}: music.file is required`);
    const v = sb.music.volume;
    if (v !== undefined && !(v > 0 && v <= 1)) throw new Error(`${sb.id}: music.volume ${v} must be in (0, 1]`);
  }
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
  (sb.transcriptOverrides ?? []).forEach((o, i) => {
    if (!Number.isInteger(o.take) || o.take < 1) throw new Error(`${sb.id}: transcriptOverride ${i} has take ${o.take}; takes are numbered from 1`);
    if (typeof o.text !== "string" || !o.text.trim()) throw new Error(`${sb.id}: transcriptOverride ${i} has empty text`);
  });
  if (sb.captionY !== undefined && !(sb.captionY >= 0.3 && sb.captionY <= 0.8)) {
    throw new Error(`${sb.id}: captionY ${sb.captionY} must be between 0.3 and 0.80 (leaves room for the caption band above the platform UI)`);
  }
  const g = sb.graphicsBox;
  if (g && !(g.x >= 0 && g.y >= 0 && g.w > 0 && g.h > 0 && g.x + g.w <= 1 + 1e-9 && g.y + g.h <= 1 + 1e-9)) {
    throw new Error(`${sb.id}: graphicsBox must lie inside the frame (x, y >= 0; x + w and y + h <= 1)`);
  }
  const h = sb.hookBox;
  if (h) {
    if (!(h.x >= 0 && h.y >= 0 && h.w > 0 && h.h > 0 && h.x + h.w <= 1 + 1e-9 && h.y + h.h <= 1 + 1e-9)) {
      throw new Error(`${sb.id}: hookBox must lie inside the frame (x, y >= 0; x + w and y + h <= 1)`);
    }
    const f = sb.faceBox ?? DEFAULT_FACE_BOX;
    if (overlapsRect(h, { x: f.x - GAP, y: f.y - GAP, w: f.w + 2 * GAP, h: f.h + 2 * GAP })) {
      throw new Error(`${sb.id}: hookBox overlaps or is within ${GAP} of the face box; move it clear of the face`);
    }
  }
  sb.moments.forEach((m, i) => {
    const label = `${sb.id}: moment ${i}`;
    if (m.on === undefined && m.at === undefined) throw new Error(`${label} needs "on" (a phrase) or "at" (seconds)`);
    if (m.on !== undefined && m.at !== undefined) throw new Error(`${label} has both "on" and "at"; use one`);
    for (const s of stringsIn(m)) {
      if (/postiz/i.test(s)) throw new Error(`${label} references Postiz ("${s}"); the brand must not be amplified`);
    }
    const known: string[] = [...SFX_NAMES];
    if (m.sfx && !known.includes(m.sfx)) throw new Error(`${label} uses unknown sfx "${m.sfx}"; known: ${known.join(", ")}`);
    const kinds = (["show", "cutaway", "crashZoom", "impact", "freeze"] as const).filter((k) => m[k] !== undefined);
    const okPair = kinds.length === 2 && kinds.includes("impact") && kinds.includes("crashZoom");
    if (kinds.length > 1 && !okPair) {
      throw new Error(`${label} combines ${kinds.join(" + ")}; show, cutaway, crashZoom, impact and freeze are mutually exclusive (only impact + crashZoom may combine)`);
    }
    if (m.cutaway) {
      const c = m.cutaway;
      if (!c.file) throw new Error(`${label}: cutaway.file is required`);
      if (!(c.from >= 0) || !(c.to > c.from)) throw new Error(`${label}: cutaway range ${c.from}-${c.to}s must satisfy 0 <= from < to`);
      if (m.hold !== undefined) throw new Error(`${label}: a cutaway's length is its from/to range; remove "hold"`);
    }
    if (m.freeze) {
      if (!(m.freeze.seconds > 0)) throw new Error(`${label}: freeze.seconds ${m.freeze.seconds} must be > 0`);
      if (!m.freeze.text || !m.freeze.text.trim()) throw new Error(`${label}: freeze.text must not be empty`);
      if (m.hold !== undefined) throw new Error(`${label}: a freeze's length is freeze.seconds; remove "hold"`);
    }
    if (typeof m.crashZoom === "object" && m.crashZoom.scale !== undefined && !(m.crashZoom.scale > 1)) {
      throw new Error(`${label}: crashZoom.scale ${m.crashZoom.scale} must be > 1`);
    }
  });
};
