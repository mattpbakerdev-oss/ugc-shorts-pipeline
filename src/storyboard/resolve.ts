import { findPhrase } from "../phrase";
import { DEFAULT_FACE_BOX } from "../zones";
import type {
  GraphicSpec, Moment, ResolvedMoment, ResolvedSection, ResolvedVideo, Storyboard, TakesFile, WordsFile, ZoneName,
} from "../types";
import { validateStoryboard } from "./validate";

const DEFAULT_HOLD_SECONDS: Record<GraphicSpec["kind"], number> = {
  bigNumber: 3, punchList: 4, iconStack: 3, counter: 3, flashCard: 0,
};
const FLASH_FRAMES = 3;

const zoneFor = (m: Moment): ZoneName => {
  if (m.emphasis && !m.show) return "captions";
  switch (m.show?.kind) {
    case "iconStack": return "right";
    case "flashCard": return "full";
    default: return "left";
  }
};

export const resolveStoryboard = (sb: Storyboard, takesFile: TakesFile, wordsFile: WordsFile): ResolvedVideo => {
  validateStoryboard(sb);
  const { fps, width, height, takes } = takesFile;
  const durationInFrames = takes[takes.length - 1].endFrame;
  // Whisper can report a last word that ends a couple of frames past the video.
  const words = wordsFile.words.map((w) => ({
    ...w,
    endFrame: Math.min(w.endFrame, durationInFrames),
    startFrame: Math.min(w.startFrame, durationInFrames - 1),
  }));

  const sections: ResolvedSection[] = takes.map((t, i) => {
    const s = sb.sections.find((x) => x.take === i + 1);
    return { startFrame: t.startFrame, endFrame: t.endFrame, title: i === 0 ? sb.hook : s?.title ?? "", isHook: i === 0 };
  }).filter((s) => s.title !== "");

  let cursor = 0;
  const moments: ResolvedMoment[] = sb.moments.map((m) => {
    let enterFrame: number;
    let wordEnd: number | undefined;
    if (m.on !== undefined) {
      const { start, end } = findPhrase(words, m.on, cursor);
      cursor = start;
      enterFrame = words[start].startFrame;
      wordEnd = words[end].endFrame;
    } else {
      enterFrame = Math.round((m.at as number) * fps);
    }

    let exitFrame: number;
    if (typeof m.hold === "string") {
      const { start } = findPhrase(words, m.hold.slice("until:".length), cursor);
      exitFrame = words[start].startFrame;
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

    return { enterFrame, exitFrame, show: m.show, emphasis: m.emphasis, sfx: m.sfx, zone: zoneFor(m) };
  });

  // A later moment in the same zone cuts the earlier one short.
  moments.forEach((m, i) => {
    const next = moments.slice(i + 1).find((n) => n.zone === m.zone && n.enterFrame > m.enterFrame);
    if (next && next.enterFrame < m.exitFrame) m.exitFrame = next.enterFrame;
  });

  return { id: sb.id, fps, width, height, durationInFrames, faceBox: sb.faceBox ?? DEFAULT_FACE_BOX, takes, words, sections, moments };
};
