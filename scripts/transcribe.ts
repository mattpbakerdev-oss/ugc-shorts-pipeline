import fs from "node:fs/promises";
import path from "node:path";
import {
  downloadWhisperModel,
  installWhisperCpp,
  toCaptions,
  transcribe,
} from "@remotion/install-whisper-cpp";
import { ffmpeg } from "./ffmpeg";
import { captionsToWords, offsetWords } from "../src/captionFixes";
import type { TakesFile, Word, WordsFile } from "../src/types";

const WHISPER_VERSION = "1.5.5";
const MODEL = "medium.en";
const whisperDir = path.resolve("whisper");

const [, , id] = process.argv;
if (!id) {
  console.error("Usage: npm run transcribe -- <videoId>");
  process.exit(1);
}

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
  const words: Word[] = [];
  for (const [i, take] of takes.entries()) {
    const wav = path.join(dir, `take_${String(i + 1).padStart(2, "0")}_16k.wav`);
    await ffmpeg([
      "-ss", String(take.startFrame / fps), "-t", String((take.endFrame - take.startFrame) / fps),
      "-i", face, "-vn",
      // Trailing silence: whisper drops the last words when the audio ends right on them.
      "-af", "apad=pad_dur=1",
      "-ar", "16000", "-ac", "1", "-c:a", "pcm_s16le", wav,
    ]);
    const output = await transcribe({
      inputPath: wav,
      whisperPath: whisperDir,
      whisperCppVersion: WHISPER_VERSION,
      model: MODEL,
      tokenLevelTimestamps: true,
      language: "en",
    });
    const { captions } = toCaptions({ whisperCppOutput: output });
    words.push(...offsetWords(captionsToWords(captions, fps), take.startFrame, take.endFrame));
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
