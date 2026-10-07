import fs from "node:fs/promises";
import path from "node:path";
import { SDR_FILTER, ffmpeg, probe, streamDurations } from "./ffmpeg";
import { keptSegments } from "./cuts";
import { storyboards } from "../src/videos";
import { parseSilence } from "./silence";
import { buildTakes } from "./takes";
import type { TakesFile } from "../src/types";

const FPS = 30;
const WIDTH = 1080;
const HEIGHT = 1920;
const SYNC_TOLERANCE = 0.04; // seconds; AAC frames are ~21ms so exact frame equality is not achievable
const DEFAULT_SOURCE_ROOT = "/Users/mattdev/Projects/ugc-renderer/reposts/7 Oct - v2 and v3 originals";

const [, , id, sourceRootArg] = process.argv;
if (!id) {
  console.error("Usage: npm run prep -- <videoId> [sourceRoot]");
  process.exit(1);
}

const sourceDir = path.join(sourceRootArg ?? DEFAULT_SOURCE_ROOT, id);
const workDir = path.resolve("work", id);
const outDir = path.resolve("public", "videos", id);

const main = async () => {
  await fs.mkdir(workDir, { recursive: true });
  await fs.mkdir(outDir, { recursive: true });

  // Numbered takes only: "1 hook_b.mp4", "2 tip1.mp4", ... sorted by the leading number.
  const files = (await fs.readdir(sourceDir))
    .filter((f) => /^\d+ .+\.(mp4|mov)$/i.test(f))
    .sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
  if (files.length === 0) throw new Error(`No numbered takes found in ${sourceDir}`);

  if (!storyboards[id]) console.log(`No storyboard registered for ${id}; no cuts applied.`);
  const cuts = storyboards[id]?.cuts ?? [];
  for (const c of cuts) {
    if (c.take > files.length) throw new Error(`${id}: cut references take ${c.take} but only ${files.length} takes exist`);
  }

  const trimmed: { file: string; frames: number; path: string }[] = [];
  for (const [i, file] of files.entries()) {
    const src = path.join(sourceDir, file);
    const info = await probe(src);
    if (info.width !== WIDTH || info.height !== HEIGHT) {
      throw new Error(`${file} is ${info.width}x${info.height}; expected ${WIDTH}x${HEIGHT}`);
    }
    if (Math.abs(info.fps - FPS) > 0.01) {
      throw new Error(`${file} is ${info.fps} fps; expected ${FPS}`);
    }
    const isHdr = info.colorTrc === "arib-std-b67" || info.colorTrc === "smpte2084";

    const { stderr } = await ffmpeg(["-i", src, "-map", "0:a", "-af", "silencedetect=noise=-35dB:d=0.3", "-f", "null", "-"]);
    const { speechStart, speechEnd } = parseSilence(stderr, info.duration);

    const takeSeconds = Math.round((speechEnd - speechStart) * FPS) / FPS;
    const out = path.join(workDir, `take_${String(i + 1).padStart(2, "0")}.mp4`);
    await ffmpeg([
      "-ss", String(speechStart), "-to", String(speechEnd), "-i", src,
      ...(isHdr ? ["-vf", SDR_FILTER] : ["-vf", "format=yuv420p"]),
      "-r", String(FPS), "-c:v", "libx264", "-preset", "medium", "-crf", "18",
      "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709",
      // iPhone audio runs ~0.3s shorter than video; pad so copy-concat cannot drift sync.
      // Pad past the end, then -t clamps both streams to the same frame-aligned length (AAC frames are 21ms).
      "-af", `apad=whole_dur=${(takeSeconds + 0.2).toFixed(3)}`, "-t", takeSeconds.toFixed(3),
      "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2",
      "-movflags", "+faststart", out,
    ]);
    let finalPath = out;
    const takeCuts = cuts.filter((c) => c.take === i + 1);
    if (takeCuts.length > 0) {
      const dur = (await streamDurations(out)).video;
      const segs = keptSegments(dur, takeCuts, FPS);
      const cutSeconds = segs.reduce((a, g) => a + (g.to - g.from), 0);
      const f = (n: number) => n.toFixed(3);
      const parts = segs.map((g, k) =>
        `[0:v]trim=start=${f(g.from)}:end=${f(g.to)},setpts=PTS-STARTPTS[v${k}];` +
        `[0:a]atrim=start=${f(g.from)}:end=${f(g.to)},asetpts=PTS-STARTPTS[a${k}]`);
      const inputs = segs.map((_, k) => `[v${k}][a${k}]`).join("");
      const cutPath = path.join(workDir, `take_${String(i + 1).padStart(2, "0")}_cut.mp4`);
      await ffmpeg([
        "-i", out,
        "-filter_complex", `${parts.join(";")};${inputs}concat=n=${segs.length}:v=1:a=1[v][ca];[ca]apad=whole_dur=${(cutSeconds + 0.2).toFixed(3)}[a]`,
        "-map", "[v]", "-map", "[a]",
        "-t", (Math.round(cutSeconds * FPS) / FPS).toFixed(3),
        "-r", String(FPS), "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p",
        "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709",
        "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2",
        "-movflags", "+faststart", cutPath,
      ]);
      finalPath = cutPath;
      console.log(`${file}: applied ${takeCuts.length} cut(s), kept ${segs.map((g) => `${f(g.from)}-${f(g.to)}`).join(", ")}`);
    }
    const d = await streamDurations(finalPath);
    if (d.audio === null || Math.abs(d.audio - d.video) > SYNC_TOLERANCE) {
      throw new Error(`${path.basename(finalPath)}: audio ${d.audio}s vs video ${d.video}s differ by more than ${SYNC_TOLERANCE}s`);
    }
    const outInfo = await probe(finalPath);
    const frames = Math.round(outInfo.duration * FPS);
    trimmed.push({ file, frames, path: finalPath });
    console.log(`${file}: ${speechStart}s–${speechEnd}s → ${frames} frames${isHdr ? " (HDR→SDR)" : ""}`);
  }

  const listFile = path.join(workDir, "concat.txt");
  await fs.writeFile(listFile, trimmed.map((t) => `file '${t.path.replace(/'/g, "'\\''")}'`).join("\n"));
  const joined = path.join(workDir, "joined.mp4");
  await ffmpeg(["-f", "concat", "-safe", "0", "-i", listFile, "-c", "copy", "-movflags", "+faststart", joined]);
  // Voice loudness: one pass over the whole joined audio; video is untouched.
  const face = path.join(outDir, "face.mp4");
  const joinedSeconds = (await streamDurations(joined)).video;
  await ffmpeg([
    "-i", joined, "-c:v", "copy",
    "-af", `loudnorm=I=-16:TP=-1.5:LRA=11,apad=whole_dur=${(joinedSeconds + 0.2).toFixed(3)}`, "-t", joinedSeconds.toFixed(3),
    "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-movflags", "+faststart", face,
  ]);
  const fd = await streamDurations(face);
  if (fd.audio === null || Math.abs(fd.audio - fd.video) > SYNC_TOLERANCE) {
    throw new Error(`face.mp4: audio ${fd.audio}s vs video ${fd.video}s differ by more than ${SYNC_TOLERANCE}s`);
  }

  const takes: TakesFile = {
    fps: FPS, width: WIDTH, height: HEIGHT,
    takes: buildTakes(trimmed.map(({ file, frames }) => ({ file, frames }))),
  };
  await fs.writeFile(path.join(outDir, "takes.json"), JSON.stringify(takes, null, 2));
  const total = takes.takes[takes.takes.length - 1].endFrame;
  console.log(`Wrote ${face} (${total} frames, ${(total / FPS).toFixed(1)}s) and takes.json`);
};

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
