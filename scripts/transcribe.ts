import fs from "node:fs/promises";
import path from "node:path";
import {
  downloadWhisperModel,
  installWhisperCpp,
  toCaptions,
  transcribe,
} from "@remotion/install-whisper-cpp";
import { ffmpeg } from "./ffmpeg";
import { HEAD_PAD } from "./silence";
import { captionsToWords, snapWordsToTakes } from "../src/captionFixes";
import type { TakesFile, WordsFile } from "../src/types";

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

  const wav = path.join(dir, "audio16k.wav");
  await ffmpeg(["-i", face, "-vn", "-ar", "16000", "-ac", "1", "-c:a", "pcm_s16le", wav]);

  const output = await transcribe({
    inputPath: wav,
    whisperPath: whisperDir,
    whisperCppVersion: WHISPER_VERSION,
    model: MODEL,
    tokenLevelTimestamps: true,
    language: "en",
  });
  const { captions } = toCaptions({ whisperCppOutput: output });
  const words = snapWordsToTakes(captionsToWords(captions, fps), takes, Math.round(HEAD_PAD * fps));
  if (words.length === 0) throw new Error("Whisper returned no words");

  const file: WordsFile = { words };
  await fs.writeFile(path.join(dir, "words.json"), JSON.stringify(file, null, 2));
  await fs.rm(wav);

  console.log(`\n${words.map((w) => w.text).join(" ")}\n`);
  console.log(`Wrote ${words.length} words to ${path.join(dir, "words.json")}`);
};

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
