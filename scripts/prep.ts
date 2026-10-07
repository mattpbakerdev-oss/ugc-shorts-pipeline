import fs from "node:fs/promises";
import path from "node:path";
import { SDR_FILTER, ffmpeg, probe } from "./ffmpeg";
import { parseSilence } from "./silence";
import { buildTakes } from "./takes";
import type { TakesFile } from "../src/types";

const FPS = 30;
const WIDTH = 1080;
const HEIGHT = 1920;
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

    const out = path.join(workDir, `take_${String(i + 1).padStart(2, "0")}.mp4`);
    await ffmpeg([
      "-ss", String(speechStart), "-to", String(speechEnd), "-i", src,
      ...(isHdr ? ["-vf", SDR_FILTER] : ["-vf", "format=yuv420p"]),
      "-r", String(FPS), "-c:v", "libx264", "-preset", "medium", "-crf", "18",
      "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709",
      "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2",
      "-movflags", "+faststart", out,
    ]);
    const outInfo = await probe(out);
    const frames = Math.round(outInfo.duration * FPS);
    trimmed.push({ file, frames, path: out });
    console.log(`${file}: ${speechStart}s–${speechEnd}s → ${frames} frames${isHdr ? " (HDR→SDR)" : ""}`);
  }

  const listFile = path.join(workDir, "concat.txt");
  await fs.writeFile(listFile, trimmed.map((t) => `file '${t.path.replace(/'/g, "'\\''")}'`).join("\n"));
  const face = path.join(outDir, "face.mp4");
  await ffmpeg(["-f", "concat", "-safe", "0", "-i", listFile, "-c", "copy", "-movflags", "+faststart", face]);

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
