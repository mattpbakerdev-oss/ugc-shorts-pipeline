import { findPhrase, PhraseNotFoundError, normaliseToken } from "../phrase";
import { DEFAULT_FACE_BOX, zonesFor } from "../zones";
import type {
  CutawaysFile, GraphicSpec, Moment, ResolvedMoment, ResolvedSection, ResolvedVideo, Storyboard, TakesFile, WordsFile, ZoneName,
} from "../types";
import { validateStoryboard } from "./validate";

const DEFAULT_HOLD_SECONDS: Record<GraphicSpec["kind"], number> = {
  bigNumber: 3, punchList: 4, iconStack: 3, ctaSaveShare: 3, counter: 3, flashCard: 0,
};
const FLASH_FRAMES = 3;
export const IMPACT_FRAMES = 2;
export const CRASH_ZOOM_DEFAULT = { scale: 1.35, shake: false };
const DUCK_PAD = 2;
const MISSING_CUTAWAYS = (id: string) => `Run: npm run prep -- ${id}`;

export const resolveStoryboard = (sb: Storyboard, takesFile: TakesFile, wordsFile: WordsFile, cutaways?: CutawaysFile): ResolvedVideo => {
  validateStoryboard(sb);
  const faceBox = sb.faceBox ?? DEFAULT_FACE_BOX;
  const z = zonesFor(faceBox, { captionY: sb.captionY, graphicsBox: sb.graphicsBox });
  // Left is preferred unless the right side is clearly wider (default box: 0.15 vs 0.17 stays left).
  const primary: ZoneName = sb.graphicsBox ? "graphics" : z.left.w + 0.05 >= z.right.w ? "left" : "right";
  const primaryRect = z.graphicsBox ?? z[primary as "left" | "right"];
  if (primaryRect.w < 0.10 && sb.moments.some((m) => m.show && m.show.kind !== "flashCard")) {
    throw new Error(
      `${sb.id}: the graphics zone ${sb.graphicsBox ? "(graphicsBox)" : "(the wider side zone next to the face)"} is only ${(primaryRect.w * 100).toFixed(0)}% of the frame; graphics need >= 10%. Narrow faceBox (currently x ${faceBox.x} w ${faceBox.w}) or use only flashCard/emphasis moments`
    );
  }
  const boxLeftOfFace = primaryRect.x + primaryRect.w / 2 < faceBox.x + faceBox.w / 2;
  const other: ZoneName = primary === "graphics" ? (boxLeftOfFace ? "right" : "left") : primary === "left" ? "right" : "left";
  const secondary: ZoneName = z[other].w >= 0.12 ? other : primary;
  const zoneFor = (m: Moment): ZoneName => {
    if (m.cutaway || m.freeze) return "full";
    if (m.emphasis && !m.show) return "captions";
    switch (m.show?.kind) {
      case "iconStack":
      case "ctaSaveShare": return secondary;
      case "flashCard": return "full";
      default: return primary;
    }
  };
  const { fps, width, height, takes } = takesFile;
  const durationInFrames = takes[takes.length - 1].endFrame;
  // Whisper can report a last word that ends a couple of frames past the video.
  const words = wordsFile.words.map((w) => ({
    ...w,
    endFrame: Math.min(w.endFrame, durationInFrames),
    startFrame: Math.min(w.startFrame, durationInFrames - 1),
  }));

  for (const s of sb.sections) {
    if (s.take > takes.length) {
      throw new Error(`${sb.id}: section "${s.title}" uses take ${s.take} but there are only ${takes.length} takes`);
    }
  }
  const hookTakes = sb.hookTakes ?? 1;
  if (!Number.isInteger(hookTakes) || hookTakes < 1 || hookTakes > takes.length) {
    throw new Error(`${sb.id}: hookTakes ${hookTakes} must be an integer between 1 and the number of takes (${takes.length})`);
  }
  for (const s of sb.sections) {
    if (s.take <= hookTakes) throw new Error(`${sb.id}: section "${s.title}" targets take ${s.take}, which is covered by the hook (hookTakes ${hookTakes})`);
  }
  const sections: ResolvedSection[] = takes.map((t, i) => {
    if (i === 0) return { startFrame: t.startFrame, endFrame: takes[hookTakes - 1].endFrame, title: sb.hook, isHook: true };
    if (i < hookTakes) return null;
    const s = sb.sections.find((x) => x.take === i + 1);
    return { startFrame: t.startFrame, endFrame: t.endFrame, title: s?.title ?? "", isHook: false };
  }).filter((s): s is ResolvedSection => s !== null && s.title !== "");

  let cursor = 0;
  let lastPhrase = "";
  let lastStart = -1;
  const moments: ResolvedMoment[] = sb.moments.map((m, i) => {
    let enterFrame: number;
    let wordEnd: number | undefined;
    if (m.on !== undefined) {
      const phrase = m.on.split(/\s+/).map(normaliseToken).filter(Boolean).join(" ");
      let { start, end } = findPhrase(words, m.on, cursor);
      // Repeating the previous phrase means its next occurrence; a different phrase may share the start word.
      if (phrase === lastPhrase && start === lastStart) ({ start, end } = findPhrase(words, m.on, start + 1));
      cursor = start;
      lastPhrase = phrase;
      lastStart = start;
      enterFrame = words[start].startFrame;
      wordEnd = words[end].endFrame;
    } else {
      enterFrame = Math.round((m.at as number) * fps);
      if (enterFrame < 0 || enterFrame >= durationInFrames) {
        throw new Error(`${sb.id}: moment ${i} at ${m.at}s is outside the video (${(durationInFrames / fps).toFixed(2)}s)`);
      }
    }

    let cutaway: ResolvedMoment["cutaway"];
    if (m.cutaway) {
      if (!cutaways) throw new Error(`${sb.id}: moment ${i} uses a cutaway but cutaways.json was not loaded. ${MISSING_CUTAWAYS(sb.id)}`);
      const clip = cutaways.clips[m.cutaway.file];
      if (!clip) throw new Error(`${sb.id}: moment ${i} cutaway "${m.cutaway.file}" is not in cutaways.json (known: ${Object.keys(cutaways.clips).join(", ") || "none"}). ${MISSING_CUTAWAYS(sb.id)}`);
      if (m.cutaway.to > clip.durationSeconds + 1e-6) {
        throw new Error(`${sb.id}: moment ${i} cutaway "${m.cutaway.file}" range ends at ${m.cutaway.to}s but the clip is only ${clip.durationSeconds}s long`);
      }
      cutaway = { file: m.cutaway.file, fromFrame: Math.round(m.cutaway.from * fps), toFrame: Math.round(m.cutaway.to * fps) };
      if (cutaway.toFrame <= cutaway.fromFrame) throw new Error(`${sb.id}: moment ${i} cutaway range ${m.cutaway.from}-${m.cutaway.to}s is under one frame`);
    }
    let exitFrame: number;
    if (cutaway) {
      exitFrame = enterFrame + (cutaway.toFrame - cutaway.fromFrame);
    } else if (m.freeze) {
      exitFrame = enterFrame + 1; // replaced by the real length during expansion
    } else if (m.impact && !m.crashZoom) {
      exitFrame = enterFrame + IMPACT_FRAMES;
    } else if (typeof m.hold === "string") {
      const phrase = m.hold.slice("until:".length);
      const fromIdx = words.findIndex((w) => w.startFrame > enterFrame);
      const notSaid = new Error(`${sb.id}: moment ${i} "until:${phrase}" was not said after its start (frame ${enterFrame})`);
      if (fromIdx === -1) throw notSaid;
      try {
        exitFrame = words[findPhrase(words, phrase, fromIdx).start].startFrame;
      } catch (e) {
        if (e instanceof PhraseNotFoundError) throw notSaid;
        throw e;
      }
    } else if (typeof m.hold === "number") {
      exitFrame = enterFrame + Math.round(m.hold * fps);
    } else if (m.show?.kind === "flashCard") {
      exitFrame = enterFrame + FLASH_FRAMES;
    } else if (m.show) {
      exitFrame = enterFrame + Math.round(DEFAULT_HOLD_SECONDS[m.show.kind] * fps);
    } else {
      exitFrame = wordEnd ?? enterFrame + Math.round(0.5 * fps);
    }
    exitFrame = Math.min(exitFrame, durationInFrames);
    if (exitFrame <= enterFrame) exitFrame = enterFrame + 1;

    const crashZoom = m.crashZoom
      ? { scale: (m.crashZoom === true ? undefined : m.crashZoom.scale) ?? CRASH_ZOOM_DEFAULT.scale, shake: (m.crashZoom === true ? undefined : m.crashZoom.shake) ?? CRASH_ZOOM_DEFAULT.shake }
      : undefined;
    return {
      enterFrame, exitFrame, show: m.show, emphasis: m.emphasis, sfx: m.sfx ?? (m.freeze ? "record-scratch" : undefined),
      zone: zoneFor(m), stack: m.stack, cutaway, crashZoom, impact: m.impact,
      freeze: m.freeze ? { lengthFrames: Math.round(m.freeze.seconds * fps), text: m.freeze.text } : undefined,
    };
  });

  // A later graphic in the same zone cuts the earlier one short (sfx-only/emphasis moments never do).
  moments.forEach((m, i) => {
    if (!m.show) return;
    const next = moments.slice(i + 1).find((n) => n.show && !n.stack && n.zone === m.zone && n.enterFrame > m.enterFrame);
    if (next && next.enterFrame < m.exitFrame) m.exitFrame = next.enterFrame;
  });

  // Freeze expansion: everything above is on the ORIGINAL timeline. Each freeze inserts its length at its frame.
  const freezeAts = moments
    .map((m, idx) => ({ idx, at: m.enterFrame, len: m.freeze?.lengthFrames ?? 0 }))
    .filter((f) => f.len > 0)
    .sort((a, b) => a.at - b.at || a.idx - b.idx);
  moments.forEach((m, idx) => {
    if (!m.cutaway) return;
    const hit = freezeAts.find((f) => f.at > m.enterFrame && f.at < m.exitFrame);
    if (hit) throw new Error(`${sb.id}: moment ${idx} (cutaway) overlaps the freeze of moment ${hit.idx} (frame ${hit.at}); a freeze must not start inside a cutaway`);
  });
  // A thing starting at a freeze frame happens after the freeze; a thing ending at it does not stretch over it.
  const shiftStart = (f: number) => f + freezeAts.reduce((n, z) => (z.at <= f ? n + z.len : n), 0);
  const shiftEnd = (f: number) => f + freezeAts.reduce((n, z) => (z.at < f ? n + z.len : n), 0);
  const freezes: ResolvedVideo["freezes"] = [];
  const freezeStart = new Map<number, number>();
  let acc = 0;
  for (const z of freezeAts) {
    const atFrame = z.at + acc;
    freezeStart.set(z.idx, atFrame);
    freezes.push({ atFrame, lengthFrames: z.len, text: moments[z.idx].freeze!.text });
    acc += z.len;
  }
  const total = acc;
  const shiftedMoments: ResolvedMoment[] = moments.map((m, idx) =>
    freezeStart.has(idx)
      ? { ...m, enterFrame: freezeStart.get(idx)!, exitFrame: freezeStart.get(idx)! + m.freeze!.lengthFrames }
      : { ...m, enterFrame: shiftStart(m.enterFrame), exitFrame: shiftEnd(m.exitFrame) },
  );
  const shiftedWords = words.map((w) => ({ ...w, startFrame: shiftStart(w.startFrame), endFrame: shiftEnd(w.endFrame) }));
  const shiftedSections = sections.map((x) => ({ ...x, startFrame: shiftStart(x.startFrame), endFrame: shiftEnd(x.endFrame) }));
  const totalFrames = durationInFrames + total;

  const windows: { from: number; to: number }[] = [];
  for (const m of shiftedMoments) {
    if (m.cutaway || m.freeze) windows.push({ from: m.enterFrame, to: m.exitFrame });
    if (m.impact) windows.push({ from: m.enterFrame, to: m.enterFrame + IMPACT_FRAMES });
  }
  const ducking: { from: number; to: number }[] = [];
  for (const w of windows.map((x) => ({ from: Math.max(0, x.from - DUCK_PAD), to: Math.min(totalFrames, x.to + DUCK_PAD) })).sort((a, b) => a.from - b.from)) {
    const last = ducking[ducking.length - 1];
    if (last && w.from <= last.to) last.to = Math.max(last.to, w.to);
    else ducking.push({ ...w });
  }

  return {
    id: sb.id, fps, width, height, durationInFrames: totalFrames, faceBox, captionY: z.captions.y, graphicsBox: primaryRect, hookBox: sb.hookBox ?? z.topBand,
    takes, words: shiftedWords, sections: shiftedSections, moments: shiftedMoments, freezes, ducking,
    music: sb.music ? { file: sb.music.file, volume: sb.music.volume ?? 0.1 } : undefined,
  };
};
