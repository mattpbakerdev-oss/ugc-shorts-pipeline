import fs from "node:fs/promises";
import path from "node:path";
import { SDR_FILTER, ffmpeg, probe, streamDurations } from "./ffmpeg";
import { keptSegments } from "./cuts";
import { storyboards } from "../src/videos";
import { parseSilence } from "./silence";
import { buildTakes } from "./takes";
import { partsPlan } from "./parts";
import type { CutawaysFile, TakesFile } from "../src/types";

import { checkSource, FPS, HEIGHT, WIDTH } from "./source";
const SYNC_TOLERANCE = 0.04; // seconds; AAC frames are ~21ms so exact frame equality is not achievable
const DEFAULT_SOURCE_ROOT = "/Users/mattdev/Projects/ugc-renderer/reposts/7 Oct - v2 and v3 originals";

const [, , id, sourceRootArg] = process.argv;
if (!id) {
  console.error("Usage: npm run prep -- <videoId> [sourceRoot]");
  process.exit(1);
}

const sourceDir = path.join(sourceRootArg ?? DEFAULT_SOURCE_ROOT, id);
const sb = storyboards[id];
const workDir = path.resolve("work", id);
const outDir = path.resolve("public", "videos", id);

/** Convert every *.mp4 in the cutaway folder to public/videos/<id>/cutaways/<label>.mp4 (SDR, same encode, untrimmed) and write cutaways.json. */
const convertCutaways = async (dir: string) => {
  let names: string[];
  try {
    names = (await fs.readdir(dir)).filter((f) => /\.mp4$/i.test(f)).sort();
  } catch {
    throw new Error(`${id}: cutaway directory not found: ${dir}`);
  }
  if (names.length === 0) throw new Error(`${id}: no .mp4 cutaway clips in ${dir}`);
  const outCut = path.join(outDir, "cutaways");
  await fs.mkdir(outCut, { recursive: true });
  const clips: CutawaysFile["clips"] = {};
  for (const name of names) {
    const src = path.join(dir, name);
    const label = path.basename(name, path.extname(name));
    const info = await probe(src);
    const isHdr = info.colorTrc === "arib-std-b67" || info.colorTrc === "smpte2084";
    const out = path.join(outCut, `${label}.mp4`);
    await ffmpeg([
      "-i", src,
      ...(isHdr ? ["-vf", SDR_FILTER] : ["-vf", "format=yuv420p"]),
      "-r", String(FPS), "-c:v", "libx264", "-preset", "medium", "-crf", "18",
      "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709",
      "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2",
      "-movflags", "+faststart", out,
    ]);
    const o = await probe(out);
    clips[label] = { file: `cutaways/${label}.mp4`, durationSeconds: Math.round(o.duration * 1000) / 1000 };
    console.log(`cutaway ${label}: ${o.duration.toFixed(2)}s${isHdr ? " (HDR→SDR)" : ""}`);
  }
  const file: CutawaysFile = { fps: FPS, clips };
  await fs.writeFile(path.join(outDir, "cutaways.json"), JSON.stringify(file, null, 2));
  console.log(`Wrote cutaways.json (${names.length} clips)`);
};

const main = async () => {
  if (sb?.music?.file) {
    const musicPath = path.resolve("public", "music", sb.music.file);
    try {
      await fs.access(musicPath);
    } catch {
      throw new Error(`${id}: music file not found: ${musicPath}`);
    }
  }

  await fs.mkdir(workDir, { recursive: true });
  await fs.mkdir(outDir, { recursive: true });

  // Either the storyboard's explicit ordered `source.parts` (pre-cut clips) or numbered takes: "1 hook_b.mp4", "2 tip1.mp4", ...
  const plan: { name: string; src: string }[] = sb?.source
    ? partsPlan(sb.source).map((p) => ({ name: p.label, src: p.absPath }))
    : (await fs.readdir(sourceDir))
        .filter((f) => /^\d+ .+\.(mp4|mov)$/i.test(f))
        .sort((a, b) => parseInt(a, 10) - parseInt(b, 10))
        .map((f) => ({ name: f, src: path.join(sourceDir, f) }));
  if (plan.length === 0) throw new Error(`No numbered takes found in ${sourceDir}`);
  for (const p of plan) {
    try {
      await fs.access(p.src);
    } catch {
      throw new Error(`${id}: source file not found: ${p.src}`);
    }
  }
  const noTrim = sb?.source?.trim === false;

  if (!sb) console.log(`No storyboard registered for ${id}; no cuts applied.`);
  const cuts = sb?.cuts ?? [];
  for (const c of cuts) {
    if (c.take > plan.length) throw new Error(`${id}: cut references take ${c.take} but only ${plan.length} takes exist`);
  }

  const trimmed: { file: string; frames: number; path: string }[] = [];
  for (const [i, { name: file, src }] of plan.entries()) {
    const info = await probe(src);
    const { scale } = checkSource(file, info);
    const isHdr = info.colorTrc === "arib-std-b67" || info.colorTrc === "smpte2084";

    let speechStart = 0;
    let speechEnd = info.duration;
    if (!noTrim) {
      const { stderr } = await ffmpeg(["-i", src, "-map", "0:a:0", "-af", "silencedetect=noise=-35dB:d=0.3", "-f", "null", "-"]);
      // Audio ends ~0.3s before video on iPhone takes; detect trailing silence against the audio length.
      const audioLen = (await streamDurations(src)).audio ?? info.duration;
      const parsed = parseSilence(stderr, audioLen);
      speechStart = parsed.speechStart;
      speechEnd = Math.min(parsed.speechEnd, info.duration);
    }

    const takeSeconds = Math.round((speechEnd - speechStart) * FPS) / FPS;
    const out = path.join(workDir, `take_${String(i + 1).padStart(2, "0")}.mp4`);
    await ffmpeg([
      "-ss", String(speechStart), "-to", String(speechEnd), "-i", src,
      // First video and first audio only: newer iPhones add a spatial (APAC) track ffmpeg cannot decode, plus data streams.
      "-map", "0:v:0", "-map", "0:a:0",
      // ffmpeg auto-rotates on decode; scale 4K (2160x3840 displayed) takes to 1080x1920 before the LUT.
      "-vf", (scale ? `scale=${WIDTH}:${HEIGHT}:flags=lanczos+accurate_rnd,` : "") + (isHdr ? SDR_FILTER : "format=yuv420p"),
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

  if (sb?.source?.cutawayDir) await convertCutaways(path.join(sb.source.dir, sb.source.cutawayDir));
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
