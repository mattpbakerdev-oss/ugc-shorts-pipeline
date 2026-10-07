import { readFileSync } from "node:fs";
import path from "node:path";
import { normaliseToken } from "../src/phrase";
import type { Take, TakesFile, Word, WordsFile } from "../src/types";

export type Restart = { take: number; from: number; to: number; phrase: string };
export type SkippedRestart = { atSeconds: number; phrase: string };
export type RestartOptions = { minWords: number; windowSeconds: number };

const round3 = (n: number) => Math.round(n * 1000) / 1000;

/** Restarts found, plus ones skipped because the two attempts straddle a take boundary. */
export const findRestartsDetailed = (
  words: Word[],
  takes: Take[],
  fps: number,
  opts: RestartOptions = { minWords: 3, windowSeconds: 4 },
): { restarts: Restart[]; skipped: SkippedRestart[] } => {
  const { minWords: n, windowSeconds } = opts;
  if (!Number.isInteger(n) || n < 1) throw new Error(`minWords must be an integer >= 1, got ${n}`);
  const window = windowSeconds * fps;
  const tokens = words.map((w) => normaliseToken(w.text));
  const takeIndexAt = (frame: number) => takes.findIndex((t) => frame >= t.startFrame && frame < t.endFrame);
  const restarts: Restart[] = [];
  const skipped: SkippedRestart[] = [];

  let i = 0;
  while (i + n <= words.length) {
    let hit = -1;
    if (tokens.slice(i, i + n).every(Boolean)) {
      for (let j = i + n; j + n <= words.length; j++) {
        if (words[j].startFrame - words[i].startFrame > window) break;
        if (tokens.slice(j, j + n).every((t, k) => t === tokens[i + k])) { hit = j; break; }
      }
    }
    if (hit < 0) { i++; continue; }
    const phrase = words.slice(i, hit).map((w) => w.text).join(" ").toLowerCase().replace(/[^a-z0-9' ]/g, "").replace(/\s+/g, " ").trim();
    const ti = takeIndexAt(words[i].startFrame);
    const tj = takeIndexAt(words[hit].startFrame);
    if (ti < 0 || ti !== tj) {
      skipped.push({ atSeconds: round3(words[i].startFrame / fps), phrase });
    } else {
      const base = takes[ti].startFrame;
      restarts.push({
        take: ti + 1,
        from: round3((words[i].startFrame - base) / fps),
        to: round3((words[hit].startFrame - base) / fps),
        phrase,
      });
    }
    i = hit; // continue from the retake so attempts don't overlap
  }
  return { restarts, skipped };
};

export const findRestarts = (
  words: Word[],
  takes: Take[],
  fps: number,
  opts: RestartOptions = { minWords: 3, windowSeconds: 4 },
): Restart[] => findRestartsDetailed(words, takes, fps, opts).restarts;

const main = () => {
  const args = process.argv.slice(2);
  const flag = (name: string, def: number): number => {
    const k = args.indexOf(name);
    if (k < 0) return def;
    const v = Number(args[k + 1]);
    if (!Number.isFinite(v) || v <= 0) {
      console.error(`${name} needs a positive number`);
      process.exit(1);
    }
    args.splice(k, 2);
    return v;
  };
  const minWords = flag("--min-words", 3);
  if (!Number.isInteger(minWords) || minWords < 1) {
    console.error("--min-words needs an integer >= 1");
    process.exit(1);
  }
  const windowSeconds = flag("--window", 4);
  const id = args[0];
  if (!id) {
    console.error("Usage: npm run bloopers -- <id> [--min-words <n>] [--window <seconds>]");
    process.exit(1);
  }
  const dir = path.join("public", "videos", id);
  const takesFile = JSON.parse(readFileSync(path.join(dir, "takes.json"), "utf8")) as TakesFile;
  const { words } = JSON.parse(readFileSync(path.join(dir, "words.json"), "utf8")) as WordsFile;
  const { restarts, skipped } = findRestartsDetailed(words, takesFile.takes, takesFile.fps, { minWords, windowSeconds });

  console.log(`${id}: minWords=${minWords}, window=${windowSeconds}s`);
  if (restarts.length === 0) console.log("No restarts found.");
  else {
    console.log("take file".padEnd(16) + "from".padStart(8) + "to".padStart(8) + "  phrase");
    for (const r of restarts) {
      const file = takesFile.takes[r.take - 1].file;
      console.log(file.padEnd(16) + r.from.toFixed(2).padStart(8) + r.to.toFixed(2).padStart(8) + `  ${r.phrase}`);
    }
    console.log("\ncuts: [");
    for (const r of restarts) console.log(`  { take: ${r.take}, from: ${r.from}, to: ${r.to} }, // ${r.phrase}`);
    console.log("],");
  }
  for (const s of skipped) console.warn(`Skipped (restart spans takes) at ${s.atSeconds}s: ${s.phrase}`);
};

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) main();
