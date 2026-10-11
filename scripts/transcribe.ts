import fs from "node:fs/promises";
import path from "node:path";
import {
  downloadWhisperModel,
  installWhisperCpp,
  toCaptions,
  transcribe,
} from "@remotion/install-whisper-cpp";
import { ffmpeg } from "./ffmpeg";
import { assertOverrideTakes } from "./takes";
import { captionsToWords, dropAfterSpeechEnd, offsetWords, spreadWords } from "../src/captionFixes";
import { storyboards } from "../src/videos";
import type { TakesFile, Word, WordsFile } from "../src/types";

const WHISPER_VERSION = "1.5.5";
const MODEL = "medium.en";
const whisperDir = path.resolve("whisper");

const [, , id] = process.argv;
if (!id) {
  console.error("Usage: npm run transcribe -- <videoId>");
  process.exit(1);
}

/** Seconds where speech ends in a wav: the start of a silence that reaches the end, else its duration. */
const speechEndSeconds = async (wav: string): Promise<number> => {
  const { stderr } = await ffmpeg(["-i", wav, "-af", "silencedetect=noise=-35dB:d=0.15", "-f", "null", "-"]);
  const dur = stderr.match(/Duration:\s*(\d+):(\d+):([\d.]+)/);
  if (!dur) throw new Error(`Cannot read duration of ${wav}`);
  const duration = Number(dur[1]) * 3600 + Number(dur[2]) * 60 + Number(dur[3]);
  let open: number | null = null;
  let lastStart: number | null = null;
  let lastEnd: number | null = null;
  for (const line of stderr.split("\n")) {
    const s = line.match(/silence_start:\s*(-?[\d.]+)/);
    const e = line.match(/silence_end:\s*([\d.]+)/);
    if (s) { open = Number(s[1]); lastStart = open; lastEnd = null; }
    if (e && open !== null) { lastEnd = Number(e[1]); open = null; }
  }
  // A silence still open at EOF, or ending within 50 ms of it, reaches the wav end.
  const reachesEnd = lastStart !== null && (open !== null || (lastEnd !== null && lastEnd >= duration - 0.05));
  return reachesEnd && lastStart !== null ? Math.max(0, lastStart) : duration;
};

const main = async () => {
  const dir = path.resolve("public", "videos", id);
  const face = path.join(dir, "face.mp4");
  const takesPath = path.join(dir, "takes.json");
  try {
    await fs.access(face);
    await fs.access(takesPath);
  } catch {
    throw new Error(`Missing ${face} or takes.json. Run: npm run prep -- ${id}`);
  }
  const { fps, takes } = JSON.parse(await fs.readFile(takesPath, "utf8")) as TakesFile;

  await installWhisperCpp({ to: whisperDir, version: WHISPER_VERSION });
  await downloadWhisperModel({ model: MODEL, folder: whisperDir });

  // Transcribe each take on its own: whisper smears a word across silence, so on the joined audio
  // a take's first word can start inside the previous take. Per take, words cannot cross a join.
  const overrides = (storyboards as Record<string, { transcriptOverrides?: { take: number; text: string }[] }>)[id]?.transcriptOverrides ?? [];
  assertOverrideTakes(id, overrides, takes.length);
  const words: Word[] = [];
  for (const [i, take] of takes.entries()) {
    const wav = path.join(dir, `take_${String(i + 1).padStart(2, "0")}_16k.wav`);
    const rawWav = path.join(dir, `take_${String(i + 1).padStart(2, "0")}_raw.wav`);
    await ffmpeg([
      "-ss", String(take.startFrame / fps), "-t", String((take.endFrame - take.startFrame) / fps),
      "-i", face, "-vn",
      // Trailing silence: whisper drops the last words when the audio ends right on them.
      "-af", "apad=pad_dur=1",
      "-ar", "16000", "-ac", "1", "-c:a", "pcm_s16le", wav,
    ]);
    // Speech end is measured on the unpadded take; words Whisper puts after it are hallucinations.
    await ffmpeg([
      "-ss", String(take.startFrame / fps), "-t", String((take.endFrame - take.startFrame) / fps),
      "-i", face, "-vn", "-ar", "16000", "-ac", "1", "-c:a", "pcm_s16le", rawWav,
    ]);
    const speechEndFrame = Math.round((await speechEndSeconds(rawWav)) * fps);
    await fs.rm(rawWav);
    const output = await transcribe({
      inputPath: wav,
      whisperPath: whisperDir,
      whisperCppVersion: WHISPER_VERSION,
      model: MODEL,
      tokenLevelTimestamps: true,
      language: "en",
    });
    const { captions } = toCaptions({ whisperCppOutput: output });
    const takeWords = captionsToWords(captions, fps);
    const kept = dropAfterSpeechEnd(takeWords, speechEndFrame);
    if (kept.length < takeWords.length) {
      console.log(`take ${i + 1}: dropped after speech end (frame ${speechEndFrame}): ${takeWords.slice(kept.length).map((w) => w.text).join(" ")}`);
    }
    const override = overrides.find((o) => o.take === i + 1);
    if (override) {
      const len = take.endFrame - take.startFrame;
      const pad = Math.round(0.2 * fps);
      const from = kept.length ? kept[0].startFrame : pad;
      const to = kept.length ? kept[kept.length - 1].endFrame : len - pad;
      const pinned = spreadWords(override.text, from, Math.max(to, from + 2));
      console.log(`take ${i + 1}: transcript pinned: ${override.text}`);
      words.push(...pinned.map((w) => ({ ...w, startFrame: w.startFrame + take.startFrame, endFrame: Math.min(w.endFrame + take.startFrame, take.endFrame) })));
    } else {
      words.push(...offsetWords(kept, take.startFrame, take.endFrame));
    }
    await fs.rm(wav);
  }
  if (words.length === 0) throw new Error("Whisper returned no words");

  const file: WordsFile = { words };
  await fs.writeFile(path.join(dir, "words.json"), JSON.stringify(file, null, 2));

  console.log(`\n${words.map((w) => w.text).join(" ")}\n`);
  console.log(`Wrote ${words.length} words to ${path.join(dir, "words.json")}`);
};

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
