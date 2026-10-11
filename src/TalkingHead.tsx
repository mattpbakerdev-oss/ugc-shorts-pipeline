import { AbsoluteFill, staticFile, type CalculateMetadataFunction } from "remotion";
import { Captions } from "./layers/Captions";
import { Face } from "./layers/Face";
import { Graphics } from "./layers/Graphics";
import { SectionTitles } from "./layers/SectionTitle";
import { Sfx } from "./layers/Sfx";
import { ZonesOverlay } from "./layers/ZonesOverlay";
import { resolveStoryboard } from "./storyboard/resolve";
import { storyboards } from "./videos";
import type { CutawaysFile, ResolvedVideo, TakesFile, WordsFile } from "./types";

export type TalkingHeadProps = {
  id: string;
  showZones: boolean;
  cover: boolean;
  resolved?: ResolvedVideo;
};

const loadJson = async <T,>(url: string, abortSignal: AbortSignal, hint: string): Promise<T> => {
  const res = await fetch(url, { signal: abortSignal });
  if (!res.ok) throw new Error(`Missing ${url}. ${hint}`);
  return (await res.json()) as T;
};

export const calculateMetadata: CalculateMetadataFunction<TalkingHeadProps> = async ({ props, abortSignal }) => {
  const sb = storyboards[props.id];
  if (!sb) throw new Error(`No storyboard for "${props.id}" in src/videos/index.ts`);
  const takes = await loadJson<TakesFile>(staticFile(`videos/${props.id}/takes.json`), abortSignal, `Run: npm run prep -- ${props.id}`);
  const words = await loadJson<WordsFile>(staticFile(`videos/${props.id}/words.json`), abortSignal, `Run: npm run transcribe -- ${props.id}`);
  const cutaways = sb.source?.cutawayDir
    ? await loadJson<CutawaysFile>(staticFile(`videos/${props.id}/cutaways.json`), abortSignal, `Run: npm run prep -- ${props.id}`)
    : undefined;
  const resolved = resolveStoryboard(sb, takes, words, cutaways);
  return {
    durationInFrames: resolved.durationInFrames,
    width: resolved.width,
    height: resolved.height,
    fps: resolved.fps,
    defaultOutName: props.id,
    props: { ...props, resolved },
  };
};

export const TalkingHead: React.FC<TalkingHeadProps> = ({ resolved, showZones, cover }) => {
  if (!resolved) return null;
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <Face resolved={resolved} />
      <SectionTitles resolved={resolved} forceHookIn={cover} />
      {cover ? null : <Graphics resolved={resolved} />}
      {cover ? null : <Captions resolved={resolved} emphasis={resolved.moments.filter((m) => m.emphasis)} />}
      {showZones ? <ZonesOverlay faceBox={resolved.faceBox} captionY={resolved.captionY} graphicsBox={resolved.graphicsBox} /> : null}
      {cover ? null : <Sfx resolved={resolved} />}
    </AbsoluteFill>
  );
};
