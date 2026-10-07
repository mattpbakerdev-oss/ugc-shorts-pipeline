import { findPhrase, PhraseNotFoundError, normaliseToken } from "../phrase";
import { DEFAULT_FACE_BOX, zonesFor } from "../zones";
import type {
  GraphicSpec, Moment, ResolvedMoment, ResolvedSection, ResolvedVideo, Storyboard, TakesFile, WordsFile, ZoneName,
} from "../types";
import { validateStoryboard } from "./validate";

const DEFAULT_HOLD_SECONDS: Record<GraphicSpec["kind"], number> = {
  bigNumber: 3, punchList: 4, iconStack: 3, counter: 3, flashCard: 0,
};
const FLASH_FRAMES = 3;


export const resolveStoryboard = (sb: Storyboard, takesFile: TakesFile, wordsFile: WordsFile): ResolvedVideo => {
  validateStoryboard(sb);
  const z = zonesFor(sb.faceBox ?? DEFAULT_FACE_BOX);
  // Left is preferred unless the right side is clearly wider (default box: 0.15 vs 0.17 stays left).
  const primary: ZoneName = z.left.w + 0.05 >= z.right.w ? "left" : "right";
  const faceBox = sb.faceBox ?? DEFAULT_FACE_BOX;
  if (z[primary].w < 0.10 && sb.moments.some((m) => m.show && m.show.kind !== "flashCard")) {
    throw new Error(
      `${sb.id}: the wider side zone next to the face is only ${(z[primary].w * 100).toFixed(0)}% of the frame; graphics need >= 10%. Narrow faceBox (currently x ${faceBox.x} w ${faceBox.w}) or use only flashCard/emphasis moments`
    );
  }
  const other: ZoneName = primary === "left" ? "right" : "left";
  const secondary: ZoneName = z[other].w >= 0.12 ? other : primary;
  const zoneFor = (m: Moment): ZoneName => {
    if (m.emphasis && !m.show) return "captions";
    switch (m.show?.kind) {
      case "iconStack": return secondary;
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
  const sections: ResolvedSection[] = takes.map((t, i) => {
    const s = sb.sections.find((x) => x.take === i + 1);
    return { startFrame: t.startFrame, endFrame: t.endFrame, title: i === 0 ? sb.hook : s?.title ?? "", isHook: i === 0 };
  }).filter((s) => s.title !== "");

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

    let exitFrame: number;
    if (typeof m.hold === "string") {
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

    return { enterFrame, exitFrame, show: m.show, emphasis: m.emphasis, sfx: m.sfx, zone: zoneFor(m), stack: m.stack };
  });

  // A later graphic in the same zone cuts the earlier one short (sfx-only/emphasis moments never do).
  moments.forEach((m, i) => {
    if (!m.show) return;
    const next = moments.slice(i + 1).find((n) => n.show && !n.stack && n.zone === m.zone && n.enterFrame > m.enterFrame);
    if (next && next.enterFrame < m.exitFrame) m.exitFrame = next.enterFrame;
  });

  return { id: sb.id, fps, width, height, durationInFrames, faceBox: sb.faceBox ?? DEFAULT_FACE_BOX, takes, words, sections, moments };
};
