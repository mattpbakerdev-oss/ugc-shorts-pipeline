# Talking-Head Shorts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A reusable Remotion project that turns Matt's raw iPhone takes into 9:16 shorts with word-pop captions under the chin, bold ice-blue kinetic graphics confined to zones around his face, punch-in cuts and SFX; then use it to remake `v2_ai_b` and `v3_plan_a`.

**Architecture:** Two Node scripts prepare data once per video (`prep` → SDR joined `face.mp4` + `takes.json`; `transcribe` → `words.json` with per-word frames). A hand-written storyboard file per video keys graphics on spoken phrases. A single `TalkingHead` composition resolves storyboard + data in `calculateMetadata` and renders five layers: face video, captions, section title, graphics, SFX. All layout is derived from a per-video face box through `zonesFor()`.

**Tech Stack:** Remotion 4.0.534, React 19, TypeScript 5.9, `@remotion/media`, `@remotion/google-fonts`, `@remotion/install-whisper-cpp`, `@remotion/captions`, Vitest 5, tsx 4, system ffmpeg 9 (has `lut3d`, `silencedetect`; no `zscale`).

**Spec:** `docs/superpowers/specs/2026-10-07-talking-head-shorts-design.md`

## Global Constraints

- Project root: `/Users/mattdev/Projects/UGC`. Source takes: `/Users/mattdev/Projects/ugc-renderer/reposts/7 Oct - v2 and v3 originals/<id>/`.
- Output format: 1080×1920, 30 fps, H.264, AAC. Composition `fps` is always 30; use `useVideoConfig().fps` inside components.
- Palette (from `src/theme.ts` only): accent `#4DE1FF`, ink `#0A1630`, text `#FFFFFF`.
- Fonts: Montserrat 900 (captions, titles, numbers), Inter 800 (list items), via `@remotion/google-fonts`.
- Face must stay clear: every graphic is positioned by a zone name from `zonesFor(faceBox)`; only `FlashCard` may cover the face, for ≤ 3 frames.
- Brand: no moment may reference "Postiz"; the storyboard validator rejects it. Captions spell it plainly.
- Remotion markup rules (from `.claude/skills/remotion-best-practices`): drive animation with `useCurrentFrame()` + `interpolate()`/`spring()` inline in `style`; use `scale`/`translate`/`rotate` CSS properties, never `transform` strings; no CSS transitions; media via `<Video>`/`<Audio>` from `@remotion/media` with `premountFor={fps}`; assets in `public/` via `staticFile()`.
- Build fails loudly on: missing phrase, missing take/words/takes file, wrong take resolution/fps, unknown sfx, "Postiz" in a moment.
- Tests: Vitest, files next to the code as `*.test.ts`. Pure logic only; no DOM tests.
- Commit after every task. Commit messages end with `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
- Keep Remotion Studio running (`npm run dev`, http://localhost:3000) and look at it after each visual task.

---

## File structure

```
UGC/
├─ package.json                  scripts: dev, prep, transcribe, test, render
├─ vitest.config.ts
├─ remotion.config.ts            (exists) + public dir default
├─ scripts/
│  ├─ lut/hlg_to_sdr.cube        copied from ugc-renderer (known-good LUT)
│  ├─ ffmpeg.ts                  run ffmpeg/ffprobe, SDR filter chain string
│  ├─ silence.ts                 parseSilence() pure + detectSpeechBounds()
│  ├─ takes.ts                   buildTakes() pure
│  ├─ prep.ts                    CLI: takes → public/videos/<id>/face.mp4 + takes.json
│  └─ transcribe.ts              CLI: face.mp4 → public/videos/<id>/words.json
├─ public/
│  ├─ videos/<id>/{face.mp4,takes.json,words.json}
│  └─ sfx/{slam,tick,pop,whoosh,riser,thud}.wav + LICENSE.md
├─ src/
│  ├─ index.ts                   (exists) registerRoot
│  ├─ Root.tsx                   registers TalkingHead compositions
│  ├─ theme.ts                   colours, font loaders
│  ├─ types.ts                   Word, Take, Rect, Zones, GraphicSpec, Moment, Storyboard, Resolved*
│  ├─ zones.ts                   zonesFor(faceBox), DEFAULT_FACE_BOX, rectToStyle()
│  ├─ captionFixes.ts            FIXES map + applyFixes()
│  ├─ phrase.ts                  normaliseTokens(), findPhrase()
│  ├─ captions/group.ts          groupWords()
│  ├─ storyboard/dsl.ts          video(), bigNumber(), punchList(), iconStack(), counter(), flashCard()
│  ├─ storyboard/validate.ts     validateStoryboard()
│  ├─ storyboard/resolve.ts      resolveStoryboard() → ResolvedVideo
│  ├─ punchIn.ts                 punchInSchedule(takes), scaleAtFrame()
│  ├─ videos/index.ts            storyboards map
│  ├─ videos/v2_ai_b.ts
│  ├─ videos/v3_plan_a.ts
│  ├─ TalkingHead.tsx            composition + calculateMetadata + layer order
│  ├─ layers/Face.tsx
│  ├─ layers/Captions.tsx        word pop
│  ├─ layers/SectionTitle.tsx
│  ├─ layers/Graphics.tsx        maps ResolvedMoment → component
│  ├─ layers/Sfx.tsx
│  ├─ layers/ZonesOverlay.tsx
│  └─ graphics/{BigNumber,PunchList,IconStack,Counter,FlashCard,Emphasis}.tsx
├─ out/<id>.mp4
└─ README.md
```

---

### Task 1: Project setup — dependencies, scripts, theme, test runner

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`, `src/theme.ts`, `src/theme.test.ts`
- Delete: `src/Composition.tsx` (scaffold placeholder)

**Interfaces:**
- Produces: `theme.ts` exports `COLORS = { accent, ink, text }`, `fonts = { display: string, body: string }` (font-family strings, loaded on import).

- [ ] **Step 1: Install dependencies**

```bash
cd /Users/mattdev/Projects/UGC
npx remotion add @remotion/media @remotion/google-fonts @remotion/captions @remotion/install-whisper-cpp zod
npm i -D vitest@5 tsx@4 --cache ~/.npm-cache-remotion
```

Expected: `package.json` lists all six; `node_modules/@remotion/media` exists. (The `--cache` flag is needed because `~/.npm` has root-owned files.)

- [ ] **Step 2: Add scripts to package.json**

Edit the `scripts` block to:

```json
"scripts": {
  "dev": "remotion studio",
  "build": "remotion bundle",
  "upgrade": "remotion upgrade",
  "lint": "eslint src scripts && tsc",
  "test": "vitest run",
  "prep": "tsx scripts/prep.ts",
  "transcribe": "tsx scripts/transcribe.ts",
  "render": "remotion render"
}
```

- [ ] **Step 3: Create vitest.config.ts**

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts", "scripts/**/*.test.ts"],
  },
});
```

- [ ] **Step 4: Write the failing theme test**

`src/theme.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { COLORS } from "./theme";

describe("theme", () => {
  it("uses the agreed palette", () => {
    expect(COLORS).toEqual({ accent: "#4DE1FF", ink: "#0A1630", text: "#FFFFFF" });
  });
});
```

- [ ] **Step 5: Run it to verify it fails**

Run: `npm test -- src/theme.test.ts`
Expected: FAIL, cannot find module `./theme`.

- [ ] **Step 6: Create src/theme.ts**

```ts
import { loadFont as loadMontserrat } from "@remotion/google-fonts/Montserrat";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";

export const COLORS = {
  accent: "#4DE1FF",
  ink: "#0A1630",
  text: "#FFFFFF",
} as const;

const montserrat = loadMontserrat("normal", { weights: ["900"], subsets: ["latin"] });
const inter = loadInter("normal", { weights: ["800"], subsets: ["latin"] });

export const fonts = {
  display: montserrat.fontFamily,
  body: inter.fontFamily,
} as const;
```

If `loadFont` throws under Vitest (no DOM), move the two `loadFont` calls into `src/fonts.ts` and import that from the layer components instead; keep `COLORS` in `theme.ts`. The test must stay DOM-free.

- [ ] **Step 7: Run the test to verify it passes**

Run: `npm test -- src/theme.test.ts`
Expected: PASS.

- [ ] **Step 8: Remove the scaffold composition and make Root compile**

Delete `src/Composition.tsx`. Replace `src/Root.tsx` with:

```tsx
export const RemotionRoot: React.FC = () => {
  return <></>;
};
```

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 9: Commit**

```bash
git add package.json package-lock.json vitest.config.ts src/theme.ts src/theme.test.ts src/Root.tsx
git rm -q src/Composition.tsx
git commit -m "Set up deps, scripts, theme and vitest

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 2: Types and zones

**Files:**
- Create: `src/types.ts`, `src/zones.ts`, `src/zones.test.ts`

**Interfaces:**
- Produces:
  - `types.ts`: `Rect {x,y,w,h}` (fractions 0–1 of the frame), `Word {text,startFrame,endFrame}`, `Take {file,startFrame,endFrame}` (endFrame exclusive), `ZoneName = "topBand"|"left"|"right"|"captions"|"full"`, `Zones`.
  - `zones.ts`: `DEFAULT_FACE_BOX: Rect`, `zonesFor(faceBox: Rect): Zones`, `rectToStyle(r: Rect, width: number, height: number): React.CSSProperties` (absolute px box).

- [ ] **Step 1: Create src/types.ts**

```ts
export type Rect = { x: number; y: number; w: number; h: number };

export type Word = { text: string; startFrame: number; endFrame: number };

export type Take = { file: string; startFrame: number; endFrame: number };

export type TakesFile = { fps: number; width: number; height: number; takes: Take[] };

export type WordsFile = { words: Word[] };

export type ZoneName = "topBand" | "left" | "right" | "captions" | "full";

export type Zones = {
  topBand: Rect;
  face: Rect;
  left: Rect;
  right: Rect;
  captions: Rect;
  platformUi: Rect;
  full: Rect;
};
```

- [ ] **Step 2: Write the failing zones tests**

`src/zones.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { DEFAULT_FACE_BOX, rectToStyle, zonesFor } from "./zones";
import type { Rect } from "./types";

const overlaps = (a: Rect, b: Rect) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

describe("zonesFor", () => {
  const z = zonesFor(DEFAULT_FACE_BOX);

  it("keeps the face box as given", () => {
    expect(z.face).toEqual(DEFAULT_FACE_BOX);
  });

  it("never lets side zones overlap the face", () => {
    expect(overlaps(z.left, z.face)).toBe(false);
    expect(overlaps(z.right, z.face)).toBe(false);
  });

  it("puts captions below the face and above the platform UI", () => {
    expect(z.captions.y).toBeGreaterThanOrEqual(z.face.y + z.face.h);
    expect(z.captions.y + z.captions.h).toBeLessThanOrEqual(z.platformUi.y);
  });

  it("moves the side zones when the face moves", () => {
    const moved = zonesFor({ x: 0.2, y: 0.3, w: 0.4, h: 0.4 });
    expect(moved.left.w).toBeLessThan(z.left.w);
    expect(moved.right.w).toBeGreaterThan(z.right.w);
    expect(moved.captions.y).toBeCloseTo(0.72, 5);
  });

  it("clamps so a face at the edge still yields non-negative zones", () => {
    const edge = zonesFor({ x: 0, y: 0.2, w: 0.5, h: 0.5 });
    expect(edge.left.w).toBe(0);
  });
});

describe("rectToStyle", () => {
  it("converts fractions to absolute pixels", () => {
    expect(rectToStyle({ x: 0.1, y: 0.2, w: 0.5, h: 0.25 }, 1080, 1920)).toEqual({
      position: "absolute",
      left: 108,
      top: 384,
      width: 540,
      height: 480,
    });
  });
});
```

- [ ] **Step 3: Run to verify failure**

Run: `npm test -- src/zones.test.ts`
Expected: FAIL, cannot find module `./zones`.

- [ ] **Step 4: Create src/zones.ts**

```ts
import type { CSSProperties } from "react";
import type { Rect, Zones } from "./types";

export const DEFAULT_FACE_BOX: Rect = { x: 0.33, y: 0.22, w: 0.42, h: 0.52 };

const GAP = 0.02;
const SIDE_MARGIN = 0.03;
const CAPTION_HEIGHT = 0.12;
const PLATFORM_UI_HEIGHT = 0.12;

export const zonesFor = (face: Rect): Zones => {
  const leftW = Math.max(0, face.x - GAP - SIDE_MARGIN);
  const rightX = Math.min(1 - SIDE_MARGIN, face.x + face.w + GAP);
  const rightW = Math.max(0, 1 - SIDE_MARGIN - rightX);
  const captionsY = Math.min(face.y + face.h + GAP, 1 - PLATFORM_UI_HEIGHT - CAPTION_HEIGHT);
  return {
    topBand: { x: 0.06, y: 0.03, w: 0.88, h: 0.19 },
    face,
    left: { x: SIDE_MARGIN, y: face.y, w: leftW, h: face.h },
    right: { x: rightX, y: face.y, w: rightW, h: face.h },
    captions: { x: 0.04, y: captionsY, w: 0.92, h: CAPTION_HEIGHT },
    platformUi: { x: 0, y: 1 - PLATFORM_UI_HEIGHT, w: 1, h: PLATFORM_UI_HEIGHT },
    full: { x: 0, y: 0, w: 1, h: 1 },
  };
};

export const rectToStyle = (r: Rect, width: number, height: number): CSSProperties => ({
  position: "absolute",
  left: Math.round(r.x * width),
  top: Math.round(r.y * height),
  width: Math.round(r.w * width),
  height: Math.round(r.h * height),
});
```

- [ ] **Step 5: Run to verify pass**

Run: `npm test -- src/zones.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 6: Commit**

```bash
git add src/types.ts src/zones.ts src/zones.test.ts
git commit -m "Add zone derivation from a face box

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 3: Prep script — HDR→SDR, silence trim, join, takes.json

**Files:**
- Create: `scripts/lut/hlg_to_sdr.cube` (copy), `scripts/ffmpeg.ts`, `scripts/silence.ts`, `scripts/silence.test.ts`, `scripts/takes.ts`, `scripts/takes.test.ts`, `scripts/prep.ts`
- Modify: `.gitignore` (add `work/`, `public/videos/*/face.mp4`, `out/`)

**Interfaces:**
- Produces: `public/videos/<id>/face.mp4`, `public/videos/<id>/takes.json` matching `TakesFile` from `src/types.ts` (`{ fps:30, width:1080, height:1920, takes:[{file,startFrame,endFrame}] }`, `endFrame` exclusive, takes contiguous from 0).
- `silence.ts`: `parseSilence(stderr: string, duration: number): { speechStart: number; speechEnd: number }` (seconds).
- `takes.ts`: `buildTakes(items: { file: string; frames: number }[]): Take[]`.

- [ ] **Step 1: Copy the LUT**

```bash
mkdir -p /Users/mattdev/Projects/UGC/scripts/lut
cp "/Users/mattdev/Projects/ugc-renderer/ugc/hlg_to_sdr_e0.80_s0.75_g1.00.cube" /Users/mattdev/Projects/UGC/scripts/lut/hlg_to_sdr.cube
head -2 /Users/mattdev/Projects/UGC/scripts/lut/hlg_to_sdr.cube
```

Expected: first line `TITLE "HLG BT.2020 to BT.709 SDR"`.

- [ ] **Step 2: Write the failing silence test**

`scripts/silence.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { parseSilence } from "./silence";

const stderr = `
[silencedetect @ 0x1] silence_start: 0
[silencedetect @ 0x1] silence_end: 1.02 | silence_duration: 1.02
[silencedetect @ 0x1] silence_start: 4.5
[silencedetect @ 0x1] silence_end: 4.9 | silence_duration: 0.4
[silencedetect @ 0x1] silence_start: 8.7
[silencedetect @ 0x1] silence_end: 9.8 | silence_duration: 1.1
`;

describe("parseSilence", () => {
  it("finds leading and trailing silence, with padding", () => {
    expect(parseSilence(stderr, 9.8)).toEqual({ speechStart: 0.72, speechEnd: 9.05 });
  });

  it("returns whole file when there is no silence", () => {
    expect(parseSilence("", 5)).toEqual({ speechStart: 0, speechEnd: 5 });
  });

  it("ignores a trailing silence that does not reach the end", () => {
    const s = `[x] silence_start: 3\n[x] silence_end: 3.6 | silence_duration: 0.6\n`;
    expect(parseSilence(s, 10)).toEqual({ speechStart: 0, speechEnd: 10 });
  });
});
```

Padding is 0.3 s kept before the first word and 0.35 s after the last (so `1.02 − 0.3 = 0.72`, `8.7 + 0.35 = 9.05`).

- [ ] **Step 3: Run to verify failure**

Run: `npm test -- scripts/silence.test.ts`
Expected: FAIL, cannot find module `./silence`.

- [ ] **Step 4: Create scripts/silence.ts**

```ts
const HEAD_PAD = 0.3;
const TAIL_PAD = 0.35;
const END_TOLERANCE = 0.25;

type Span = { start: number; end: number };

const parseSpans = (stderr: string): Span[] => {
  const spans: Span[] = [];
  let open: number | null = null;
  for (const line of stderr.split("\n")) {
    const s = line.match(/silence_start:\s*([\d.]+)/);
    const e = line.match(/silence_end:\s*([\d.]+)/);
    if (s) open = Number(s[1]);
    if (e && open !== null) {
      spans.push({ start: open, end: Number(e[1]) });
      open = null;
    }
  }
  return spans;
};

export const parseSilence = (
  stderr: string,
  duration: number,
): { speechStart: number; speechEnd: number } => {
  const spans = parseSpans(stderr);
  let speechStart = 0;
  let speechEnd = duration;
  const first = spans[0];
  if (first && first.start <= 0.05) speechStart = Math.max(0, first.end - HEAD_PAD);
  const last = spans[spans.length - 1];
  if (last && last.end >= duration - END_TOLERANCE) speechEnd = Math.min(duration, last.start + TAIL_PAD);
  return {
    speechStart: Number(speechStart.toFixed(3)),
    speechEnd: Number(speechEnd.toFixed(3)),
  };
};
```

- [ ] **Step 5: Run to verify pass**

Run: `npm test -- scripts/silence.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 6: Write the failing takes test**

`scripts/takes.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { buildTakes } from "./takes";

describe("buildTakes", () => {
  it("lays takes end to end from frame 0", () => {
    expect(
      buildTakes([
        { file: "1 hook.mp4", frames: 120 },
        { file: "2 tip1.mp4", frames: 300 },
      ]),
    ).toEqual([
      { file: "1 hook.mp4", startFrame: 0, endFrame: 120 },
      { file: "2 tip1.mp4", startFrame: 120, endFrame: 420 },
    ]);
  });

  it("rejects a take with no frames", () => {
    expect(() => buildTakes([{ file: "x.mp4", frames: 0 }])).toThrow(/x\.mp4/);
  });
});
```

- [ ] **Step 7: Run to verify failure**

Run: `npm test -- scripts/takes.test.ts`
Expected: FAIL, cannot find module `./takes`.

- [ ] **Step 8: Create scripts/takes.ts**

```ts
import type { Take } from "../src/types";

export const buildTakes = (items: { file: string; frames: number }[]): Take[] => {
  let cursor = 0;
  return items.map(({ file, frames }) => {
    if (!Number.isInteger(frames) || frames <= 0) {
      throw new Error(`Take ${file} has ${frames} frames; expected a positive integer`);
    }
    const take = { file, startFrame: cursor, endFrame: cursor + frames };
    cursor += frames;
    return take;
  });
};
```

- [ ] **Step 9: Run to verify pass**

Run: `npm test -- scripts/takes.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 10: Create scripts/ffmpeg.ts**

```ts
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";

const run = promisify(execFile);

const LUT = path.resolve(__dirname, "lut/hlg_to_sdr.cube").replace(/\\/g, "/").replace(/:/g, "\\:");

/** Same chain as ugc-renderer/ugc/video.py sdr_filter(): fitted LUT, composite-safe tags. */
export const SDR_FILTER =
  "scale=in_color_matrix=bt2020:in_range=tv:out_range=pc:flags=accurate_rnd+full_chroma_int," +
  `format=gbrp16le,lut3d=file=${LUT}:interp=tetrahedral,` +
  "scale=out_color_matrix=bt709:out_range=tv,format=yuv420p," +
  "setparams=color_primaries=bt709:color_trc=bt709:colorspace=bt709:range=tv";

export const ffmpeg = async (args: string[]): Promise<{ stdout: string; stderr: string }> => {
  try {
    return await run("ffmpeg", ["-hide_banner", "-nostdin", "-y", ...args], { maxBuffer: 64 * 1024 * 1024 });
  } catch (err) {
    const e = err as { stderr?: string; message: string };
    throw new Error(`ffmpeg ${args.join(" ")}\n${e.stderr ?? e.message}`);
  }
};

export type Probe = { width: number; height: number; fps: number; duration: number; colorTrc: string };

export const probe = async (file: string): Promise<Probe> => {
  const { stdout } = await run("ffprobe", [
    "-v", "error",
    "-select_streams", "v:0",
    "-show_entries", "stream=width,height,r_frame_rate,color_transfer:format=duration",
    "-of", "json",
    file,
  ]);
  const j = JSON.parse(stdout) as {
    streams: { width: number; height: number; r_frame_rate: string; color_transfer?: string }[];
    format: { duration: string };
  };
  const s = j.streams[0];
  const [n, d] = s.r_frame_rate.split("/").map(Number);
  return {
    width: s.width,
    height: s.height,
    fps: n / d,
    duration: Number(j.format.duration),
    colorTrc: s.color_transfer ?? "unknown",
  };
};
```

- [ ] **Step 11: Create scripts/prep.ts**

```ts
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
```

- [ ] **Step 12: Update .gitignore**

Append:

```
work/
public/videos/*/face.mp4
out/
```

- [ ] **Step 13: Run prep on v2 and check the output**

```bash
cd /Users/mattdev/Projects/UGC && npm run prep -- v2_ai_b
```

Expected: five lines like `1 hook_b.mp4: 0.7s–5.0s → 129 frames (HDR→SDR)`, then `Wrote … face.mp4`. Then:

```bash
cat public/videos/v2_ai_b/takes.json
ffprobe -v error -select_streams v:0 -show_entries stream=width,height,r_frame_rate,color_transfer -of default=nw=1 public/videos/v2_ai_b/face.mp4
ffmpeg -v error -y -ss 6 -i public/videos/v2_ai_b/face.mp4 -frames:v 1 work/v2_ai_b/check.jpg
```

Expected: `color_transfer=bt709`, 1080×1920, 30/1. Open `work/v2_ai_b/check.jpg` with the Read tool: skin should look natural, not pink or washed out, matching the old `finished video (old).mp4` colour. If the joins sound clipped (a word cut), raise `HEAD_PAD`/`TAIL_PAD` in `silence.ts` and rerun.

- [ ] **Step 14: Commit**

```bash
git add scripts/ .gitignore public/videos/v2_ai_b/takes.json
git commit -m "Add prep script: HDR to SDR, silence trim, join takes

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 4: Transcribe script — whisper.cpp → words.json, with caption fixes

**Files:**
- Create: `src/captionFixes.ts`, `src/captionFixes.test.ts`, `scripts/transcribe.ts`
- Modify: `.gitignore` (add `whisper/`)

**Interfaces:**
- Produces: `public/videos/<id>/words.json` matching `WordsFile` (`{ words: Word[] }`), frames at 30 fps, words free of leading whitespace, no empty words.
- `captionFixes.ts`: `FIXES: Record<string,string>`, `applyFixes(text: string): string`, `captionsToWords(captions: {text,startMs,endMs}[], fps: number): Word[]`.

- [ ] **Step 1: Write the failing fixes test**

`src/captionFixes.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { applyFixes, captionsToWords } from "./captionFixes";

describe("applyFixes", () => {
  it("corrects known mis-hearings case-insensitively, keeping punctuation", () => {
    expect(applyFixes("postees")).toBe("Postiz");
    expect(applyFixes("Postees,")).toBe("Postiz,");
    expect(applyFixes("hello")).toBe("hello");
  });
});

describe("captionsToWords", () => {
  it("converts ms to frames and trims whitespace", () => {
    expect(
      captionsToWords(
        [
          { text: " If", startMs: 0, endMs: 100 },
          { text: " you're", startMs: 100, endMs: 433 },
          { text: "  ", startMs: 433, endMs: 500 },
        ],
        30,
      ),
    ).toEqual([
      { text: "If", startFrame: 0, endFrame: 3 },
      { text: "you're", startFrame: 3, endFrame: 13 },
    ]);
  });

  it("guarantees every word lasts at least one frame", () => {
    expect(captionsToWords([{ text: "a", startMs: 1000, endMs: 1005 }], 30)).toEqual([
      { text: "a", startFrame: 30, endFrame: 31 },
    ]);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- src/captionFixes.test.ts`
Expected: FAIL, cannot find module.

- [ ] **Step 3: Create src/captionFixes.ts**

```ts
import type { Word } from "./types";

/** transcript word (lowercase, no punctuation) → what the caption should say */
export const FIXES: Record<string, string> = {
  postees: "Postiz",
  posties: "Postiz",
  postis: "Postiz",
  posters: "Postiz",
  "post is": "Postiz",
  tiktok: "TikTok",
  "tik tok": "TikTok",
  youtube: "YouTube",
  instagram: "Instagram",
  facebook: "Facebook",
};

export const applyFixes = (text: string): string => {
  const m = text.match(/^(\W*)(.*?)(\W*)$/);
  if (!m) return text;
  const [, lead, core, trail] = m;
  const fixed = FIXES[core.toLowerCase()];
  return fixed ? `${lead}${fixed}${trail}` : text;
};

export const captionsToWords = (
  captions: { text: string; startMs: number; endMs: number }[],
  fps: number,
): Word[] => {
  const out: Word[] = [];
  for (const c of captions) {
    const text = applyFixes(c.text.trim());
    if (!text) continue;
    const startFrame = Math.round((c.startMs / 1000) * fps);
    const endFrame = Math.max(startFrame + 1, Math.round((c.endMs / 1000) * fps));
    out.push({ text, startFrame, endFrame });
  }
  return out;
};
```

- [ ] **Step 4: Run to verify pass**

Run: `npm test -- src/captionFixes.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Create scripts/transcribe.ts**

```ts
import fs from "node:fs/promises";
import path from "node:path";
import {
  downloadWhisperModel,
  installWhisperCpp,
  toCaptions,
  transcribe,
} from "@remotion/install-whisper-cpp";
import { ffmpeg } from "./ffmpeg";
import { captionsToWords } from "../src/captionFixes";
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
  const { fps } = JSON.parse(await fs.readFile(takesPath, "utf8")) as TakesFile;

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
  const words = captionsToWords(captions, fps);
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
```

If the `transcribe()` option names differ in the installed version, check `node_modules/@remotion/install-whisper-cpp/dist/transcribe.d.ts` and adjust; the required behaviour is per-token timestamps on a 16 kHz mono WAV.

- [ ] **Step 6: Update .gitignore**

Append `whisper/` and `public/videos/*/audio16k.wav`.

- [ ] **Step 7: Run on v2 and read the transcript**

```bash
cd /Users/mattdev/Projects/UGC && npm run transcribe -- v2_ai_b
```

Expected: first run downloads whisper.cpp and the medium.en model (~1.5 GB), then prints the transcript, which should read close to: "If you're not using AI for your content you're already behind. Here are three ways I use it. Hooks. …". Compare against the old transcript in the spec. Add any new mis-hearing to `FIXES` and rerun (it is fast once the model is cached).

- [ ] **Step 8: Commit**

```bash
git add scripts/transcribe.ts src/captionFixes.ts src/captionFixes.test.ts .gitignore public/videos/v2_ai_b/words.json
git commit -m "Add whisper.cpp transcription to words.json

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 5: Phrase matching

**Files:**
- Create: `src/phrase.ts`, `src/phrase.test.ts`

**Interfaces:**
- Produces: `findPhrase(words: Word[], phrase: string, fromIndex = 0): { start: number; end: number }` (word indices, `end` inclusive); throws `PhraseNotFoundError` with the phrase in the message. `normaliseToken(t: string): string`.

- [ ] **Step 1: Write the failing tests**

`src/phrase.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { findPhrase, normaliseToken, PhraseNotFoundError } from "./phrase";
import type { Word } from "./types";

const w = (texts: string): Word[] =>
  texts.split(" ").map((text, i) => ({ text, startFrame: i * 10, endFrame: i * 10 + 8 }));

describe("normaliseToken", () => {
  it("lowercases, strips punctuation and maps number words", () => {
    expect(normaliseToken("Hooks.")).toBe("hooks");
    expect(normaliseToken("ten")).toBe("10");
    expect(normaliseToken("1,000")).toBe("1000");
    expect(normaliseToken("thousand")).toBe("1000");
    expect(normaliseToken("You're")).toBe("you're");
  });
});

describe("findPhrase", () => {
  const words = w("I ask for ten hook ideas and then I pick the best one. I ask again");

  it("finds a phrase and returns inclusive word indices", () => {
    expect(findPhrase(words, "10 hook ideas")).toEqual({ start: 3, end: 5 });
  });

  it("ignores case and punctuation in both phrase and words", () => {
    expect(findPhrase(words, "Pick the best one")).toEqual({ start: 9, end: 12 });
  });

  it("searches from an index so repeated phrases resolve in order", () => {
    expect(findPhrase(words, "I ask")).toEqual({ start: 0, end: 1 });
    expect(findPhrase(words, "I ask", 2)).toEqual({ start: 13, end: 14 });
  });

  it("throws a named error naming the phrase", () => {
    expect(() => findPhrase(words, "never said this")).toThrow(PhraseNotFoundError);
    expect(() => findPhrase(words, "never said this")).toThrow(/never said this/);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- src/phrase.test.ts`
Expected: FAIL, cannot find module.

- [ ] **Step 3: Create src/phrase.ts**

```ts
import type { Word } from "./types";

const NUMBER_WORDS: Record<string, string> = {
  zero: "0", one: "1", two: "2", three: "3", four: "4", five: "5", six: "6", seven: "7",
  eight: "8", nine: "9", ten: "10", eleven: "11", twelve: "12", thirteen: "13", fourteen: "14",
  fifteen: "15", sixteen: "16", seventeen: "17", eighteen: "18", nineteen: "19", twenty: "20",
  thirty: "30", forty: "40", fifty: "50", sixty: "60", seventy: "70", eighty: "80", ninety: "90",
  hundred: "100", thousand: "1000",
};

export const normaliseToken = (t: string): string => {
  const core = t.toLowerCase().replace(/[^a-z0-9']/g, "");
  return NUMBER_WORDS[core] ?? core;
};

export class PhraseNotFoundError extends Error {
  constructor(phrase: string) {
    super(`Phrase not found in transcript: "${phrase}"`);
    this.name = "PhraseNotFoundError";
  }
}

export const findPhrase = (
  words: Word[],
  phrase: string,
  fromIndex = 0,
): { start: number; end: number } => {
  const target = phrase.split(/\s+/).map(normaliseToken).filter(Boolean);
  if (target.length === 0) throw new PhraseNotFoundError(phrase);
  const tokens = words.map((w) => normaliseToken(w.text));
  for (let i = fromIndex; i <= tokens.length - target.length; i++) {
    let ok = true;
    for (let j = 0; j < target.length; j++) {
      if (tokens[i + j] !== target[j]) { ok = false; break; }
    }
    if (ok) return { start: i, end: i + target.length - 1 };
  }
  throw new PhraseNotFoundError(phrase);
};
```

- [ ] **Step 4: Run to verify pass**

Run: `npm test -- src/phrase.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/phrase.ts src/phrase.test.ts
git commit -m "Add phrase matching against transcript words

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 6: Caption grouping

**Files:**
- Create: `src/captions/group.ts`, `src/captions/group.test.ts`

**Interfaces:**
- Produces: `CaptionGroup = { startFrame: number; endFrame: number; words: Word[] }`; `groupWords(words: Word[], opts: { fps: number; takeBoundaries: number[] }): CaptionGroup[]`.
- Rules: 1–4 words per group; ≤ 30 characters total; a new group starts at a gap > 0.6 s or at a take boundary; `endFrame` = last word's end + min(gap to next word, 1 s hold); the last group holds 1 s.

- [ ] **Step 1: Write the failing tests**

`src/captions/group.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { groupWords } from "./group";
import type { Word } from "../types";

const seq = (texts: string[], gapFrames = 2, lenFrames = 8, start = 0): Word[] => {
  let f = start;
  return texts.map((text) => {
    const w = { text, startFrame: f, endFrame: f + lenFrames };
    f += lenFrames + gapFrames;
    return w;
  });
};

describe("groupWords", () => {
  it("caps groups at four words", () => {
    const g = groupWords(seq(["a", "b", "c", "d", "e", "f"]), { fps: 30, takeBoundaries: [] });
    expect(g.map((x) => x.words.length)).toEqual([4, 2]);
  });

  it("caps groups at 30 characters", () => {
    const g = groupWords(seq(["repurposing", "everything", "instead", "of"]), { fps: 30, takeBoundaries: [] });
    expect(g.map((x) => x.words.map((w) => w.text).join(" "))).toEqual(["repurposing everything", "instead of"]);
  });

  it("breaks on a pause longer than 0.6s", () => {
    const words = [...seq(["one", "two"]), ...seq(["three"], 2, 8, 100)];
    const g = groupWords(words, { fps: 30, takeBoundaries: [] });
    expect(g.length).toBe(2);
  });

  it("breaks at take boundaries", () => {
    const words = seq(["a", "b", "c", "d"]);
    const g = groupWords(words, { fps: 30, takeBoundaries: [20] });
    expect(g[0].words.map((w) => w.text)).toEqual(["a", "b"]);
    expect(g[1].words.map((w) => w.text)).toEqual(["c", "d"]);
  });

  it("holds until the next group or at most one second", () => {
    const words = [...seq(["a"]), ...seq(["b"], 2, 8, 100)];
    const g = groupWords(words, { fps: 30, takeBoundaries: [] });
    expect(g[0].endFrame).toBe(8 + 30);
    expect(g[1].endFrame).toBe(108 + 30);
  });

  it("does not hold past the next group's start", () => {
    const words = [...seq(["a"]), ...seq(["b"], 2, 8, 25)];
    const g = groupWords(words, { fps: 30, takeBoundaries: [] });
    expect(g[0].endFrame).toBe(25);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npm test -- src/captions/group.test.ts`
Expected: FAIL, cannot find module.

- [ ] **Step 3: Create src/captions/group.ts**

```ts
import type { Word } from "../types";

export type CaptionGroup = { startFrame: number; endFrame: number; words: Word[] };

const MAX_WORDS = 4;
const MAX_CHARS = 30;
const PAUSE_SECONDS = 0.6;
const HOLD_SECONDS = 1;

export const groupWords = (
  words: Word[],
  opts: { fps: number; takeBoundaries: number[] },
): CaptionGroup[] => {
  const pause = Math.round(PAUSE_SECONDS * opts.fps);
  const hold = Math.round(HOLD_SECONDS * opts.fps);
  const boundaries = [...opts.takeBoundaries].sort((a, b) => a - b);
  const crossesBoundary = (prev: Word, next: Word) =>
    boundaries.some((b) => prev.startFrame < b && next.startFrame >= b);

  const chunks: Word[][] = [];
  let current: Word[] = [];
  let chars = 0;
  for (const w of words) {
    const prev = current[current.length - 1];
    const wouldBreak =
      current.length >= MAX_WORDS ||
      chars + w.text.length + (current.length ? 1 : 0) > MAX_CHARS ||
      (prev && w.startFrame - prev.endFrame > pause) ||
      (prev && crossesBoundary(prev, w));
    if (current.length && wouldBreak) {
      chunks.push(current);
      current = [];
      chars = 0;
    }
    current.push(w);
    chars += w.text.length + (current.length > 1 ? 1 : 0);
  }
  if (current.length) chunks.push(current);

  return chunks.map((ws, i) => {
    const last = ws[ws.length - 1];
    const next = chunks[i + 1]?.[0];
    const endFrame = next ? Math.min(last.endFrame + hold, next.startFrame) : last.endFrame + hold;
    return { startFrame: ws[0].startFrame, endFrame, words: ws };
  });
};
```

- [ ] **Step 4: Run to verify pass**

Run: `npm test -- src/captions/group.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/captions/
git commit -m "Add caption word grouping

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 7: Storyboard DSL, validation and resolution

**Files:**
- Modify: `src/types.ts` (append storyboard types)
- Create: `src/storyboard/dsl.ts`, `src/storyboard/validate.ts`, `src/storyboard/validate.test.ts`, `src/storyboard/resolve.ts`, `src/storyboard/resolve.test.ts`, `src/punchIn.ts`, `src/punchIn.test.ts`

**Interfaces:**
- Produces (in `types.ts`):

```ts
export type SfxName = "slam" | "tick" | "pop" | "whoosh" | "riser" | "thud";
export type IconName = "tt" | "ig" | "yt" | "fb";
export type GraphicSpec =
  | { kind: "bigNumber"; value: string; label: string }
  | { kind: "punchList"; items: string[]; pick?: number; strike?: number[] }
  | { kind: "iconStack"; icons: IconName[] }
  | { kind: "counter"; from: number; to: number; label: string }
  | { kind: "flashCard"; word: string };
export type Emphasis = "shake" | "pulse" | "flash";
export type Moment = {
  on?: string; at?: number; show?: GraphicSpec; emphasis?: Emphasis; sfx?: SfxName;
  hold?: number | `until:${string}`;
};
export type Section = { take: number; title: string };
export type Storyboard = { id: string; faceBox?: Rect; hook: string; sections: Section[]; moments: Moment[] };
export type ResolvedMoment = { enterFrame: number; exitFrame: number; show?: GraphicSpec; emphasis?: Emphasis; sfx?: SfxName; zone: ZoneName };
export type ResolvedSection = { startFrame: number; endFrame: number; title: string; isHook: boolean };
export type ResolvedVideo = {
  id: string; fps: number; width: number; height: number; durationInFrames: number;
  faceBox: Rect; takes: Take[]; words: Word[]; sections: ResolvedSection[]; moments: ResolvedMoment[];
};
```

- `dsl.ts`: `video(sb: Storyboard): Storyboard` (runs `validateStoryboard`), `bigNumber(value: string|number, label: string)`, `punchList(items: string[], opts?: {pick?: number; strike?: number[]})`, `iconStack(icons: IconName[])`, `counter(from: number, to: number, label: string)`, `flashCard(word: string)`.
- `validate.ts`: `validateStoryboard(sb: Storyboard): void` throws on: moment with neither `on` nor `at`; moment with both; any string in a moment (on/show text/hold) containing "postiz" case-insensitively; `sections` referencing take index < 1; sfx not in `SFX_NAMES`.
- `resolve.ts`: `resolveStoryboard(sb: Storyboard, takes: TakesFile, words: WordsFile): ResolvedVideo`. Defaults: `hold` per kind: bigNumber 3 s, punchList 4 s, iconStack 3 s, counter 3 s, flashCard 3 frames, emphasis = that caption word's duration; zone per kind: bigNumber/punchList/counter → `left`, iconStack → `right`, flashCard → `full`, emphasis → `captions`. `exitFrame` is clamped to the end of the video and to the start of the next moment **in the same zone**.
- `punchIn.ts`: `punchInSchedule(takes: Take[]): { startFrame: number; endFrame: number; scale: number }[]` alternating 1 / 1.08 starting at 1; `scaleAtFrame(takes: Take[], frame: number, fps: number): number` adds the hook push-in (take 0 goes 1.0→1.02 linearly across its length, multiplied in).

- [ ] **Step 1: Append the storyboard types to src/types.ts**

Append the block from the Interfaces section above, plus:

```ts
export const SFX_NAMES: SfxName[] = ["slam", "tick", "pop", "whoosh", "riser", "thud"];
```

- [ ] **Step 2: Write the failing validate tests**

`src/storyboard/validate.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { validateStoryboard } from "./validate";
import type { Storyboard } from "../types";

const base: Storyboard = {
  id: "t", hook: "Hi", sections: [{ take: 2, title: "1. One" }],
  moments: [{ on: "hello", show: { kind: "bigNumber", value: "1", label: "X" }, sfx: "slam" }],
};

describe("validateStoryboard", () => {
  it("accepts a valid storyboard", () => {
    expect(() => validateStoryboard(base)).not.toThrow();
  });
  it("rejects a moment with neither on nor at", () => {
    expect(() => validateStoryboard({ ...base, moments: [{ show: { kind: "flashCard", word: "x" } }] })).toThrow(/on.*at/);
  });
  it("rejects a moment with both on and at", () => {
    expect(() => validateStoryboard({ ...base, moments: [{ on: "a", at: 1 }] })).toThrow(/both/);
  });
  it("rejects any Postiz reference in a moment", () => {
    expect(() => validateStoryboard({ ...base, moments: [{ on: "I tell Postiz" }] })).toThrow(/Postiz/);
    expect(() => validateStoryboard({ ...base, moments: [{ at: 1, show: { kind: "punchList", items: ["postiz rocks"] } }] })).toThrow(/Postiz/);
  });
  it("rejects an unknown sfx", () => {
    expect(() => validateStoryboard({ ...base, moments: [{ at: 1, sfx: "boing" as never }] })).toThrow(/boing/);
  });
  it("rejects a section on take 0", () => {
    expect(() => validateStoryboard({ ...base, sections: [{ take: 0, title: "x" }] })).toThrow(/take/);
  });
});
```

- [ ] **Step 3: Run to verify failure**

Run: `npm test -- src/storyboard/validate.test.ts`
Expected: FAIL, cannot find module.

- [ ] **Step 4: Create src/storyboard/validate.ts**

```ts
import { SFX_NAMES, type Moment, type Storyboard } from "../types";

const stringsIn = (m: Moment): string[] => {
  const out: string[] = [];
  if (m.on) out.push(m.on);
  if (typeof m.hold === "string") out.push(m.hold);
  const s = m.show;
  if (s) {
    if (s.kind === "bigNumber") out.push(s.value, s.label);
    if (s.kind === "punchList") out.push(...s.items);
    if (s.kind === "counter") out.push(s.label);
    if (s.kind === "flashCard") out.push(s.word);
  }
  return out;
};

export const validateStoryboard = (sb: Storyboard): void => {
  sb.sections.forEach((s, i) => {
    if (!Number.isInteger(s.take) || s.take < 1) {
      throw new Error(`${sb.id}: section ${i} has take ${s.take}; takes are numbered from 1`);
    }
  });
  sb.moments.forEach((m, i) => {
    const label = `${sb.id}: moment ${i}`;
    if (m.on === undefined && m.at === undefined) throw new Error(`${label} needs "on" (a phrase) or "at" (seconds)`);
    if (m.on !== undefined && m.at !== undefined) throw new Error(`${label} has both "on" and "at"; use one`);
    for (const s of stringsIn(m)) {
      if (/postiz/i.test(s)) throw new Error(`${label} references Postiz ("${s}"); the brand must not be amplified`);
    }
    if (m.sfx && !SFX_NAMES.includes(m.sfx)) throw new Error(`${label} uses unknown sfx "${m.sfx}"; known: ${SFX_NAMES.join(", ")}`);
  });
};
```

- [ ] **Step 5: Run to verify pass**

Run: `npm test -- src/storyboard/validate.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 6: Create src/storyboard/dsl.ts**

```ts
import type { GraphicSpec, IconName, Storyboard } from "../types";
import { validateStoryboard } from "./validate";

export const video = (sb: Storyboard): Storyboard => {
  validateStoryboard(sb);
  return sb;
};

export const bigNumber = (value: string | number, label: string): GraphicSpec =>
  ({ kind: "bigNumber", value: String(value), label });

export const punchList = (items: string[], opts: { pick?: number; strike?: number[] } = {}): GraphicSpec =>
  ({ kind: "punchList", items, ...opts });

export const iconStack = (icons: IconName[]): GraphicSpec => ({ kind: "iconStack", icons });

export const counter = (from: number, to: number, label: string): GraphicSpec =>
  ({ kind: "counter", from, to, label });

export const flashCard = (word: string): GraphicSpec => ({ kind: "flashCard", word });
```

- [ ] **Step 7: Write the failing punch-in tests**

`src/punchIn.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { punchInSchedule, scaleAtFrame } from "./punchIn";
import type { Take } from "./types";

const takes: Take[] = [
  { file: "1", startFrame: 0, endFrame: 60 },
  { file: "2", startFrame: 60, endFrame: 120 },
  { file: "3", startFrame: 120, endFrame: 150 },
];

describe("punchInSchedule", () => {
  it("alternates 1 and 1.08 starting at 1", () => {
    expect(punchInSchedule(takes).map((s) => s.scale)).toEqual([1, 1.08, 1]);
  });
});

describe("scaleAtFrame", () => {
  it("pushes in across the hook take from 1.0 to 1.02", () => {
    expect(scaleAtFrame(takes, 0, 30)).toBeCloseTo(1.0, 5);
    expect(scaleAtFrame(takes, 59, 30)).toBeCloseTo(1.02, 2);
  });
  it("uses the take's punch scale after the hook", () => {
    expect(scaleAtFrame(takes, 90, 30)).toBeCloseTo(1.08, 5);
    expect(scaleAtFrame(takes, 140, 30)).toBeCloseTo(1, 5);
  });
});
```

- [ ] **Step 8: Run to verify failure**

Run: `npm test -- src/punchIn.test.ts`
Expected: FAIL.

- [ ] **Step 9: Create src/punchIn.ts**

```ts
import { interpolate } from "remotion";
import type { Take } from "./types";

export const PUNCH_SCALE = 1.08;
export const HOOK_PUSH = 1.02;

export const punchInSchedule = (takes: Take[]) =>
  takes.map((t, i) => ({ startFrame: t.startFrame, endFrame: t.endFrame, scale: i % 2 === 0 ? 1 : PUNCH_SCALE }));

export const scaleAtFrame = (takes: Take[], frame: number, _fps: number): number => {
  const i = takes.findIndex((t) => frame >= t.startFrame && frame < t.endFrame);
  const take = takes[Math.max(0, i)];
  const base = Math.max(0, i) % 2 === 0 ? 1 : PUNCH_SCALE;
  if (i === 0) {
    const push = interpolate(frame, [take.startFrame, take.endFrame - 1], [1, HOOK_PUSH], {
      extrapolateLeft: "clamp", extrapolateRight: "clamp",
    });
    return base * push;
  }
  return base;
};
```

- [ ] **Step 10: Run to verify pass**

Run: `npm test -- src/punchIn.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 11: Write the failing resolve tests**

`src/storyboard/resolve.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { resolveStoryboard } from "./resolve";
import { bigNumber, iconStack, flashCard } from "./dsl";
import type { Storyboard, TakesFile, Word, WordsFile } from "../types";

const words: Word[] = "not using AI yet hooks ten hook ideas pick the best one".split(" ")
  .map((text, i) => ({ text, startFrame: i * 10, endFrame: i * 10 + 8 }));
const wordsFile: WordsFile = { words };
const takes: TakesFile = {
  fps: 30, width: 1080, height: 1920,
  takes: [
    { file: "1", startFrame: 0, endFrame: 40 },
    { file: "2", startFrame: 40, endFrame: 120 },
  ],
};
const sb: Storyboard = {
  id: "t", hook: "Not using AI yet? // You're behind",
  sections: [{ take: 2, title: "1. Hooks" }],
  moments: [
    { on: "ten hook ideas", show: bigNumber(10, "HOOK IDEAS"), sfx: "slam", hold: "until:pick the best one" },
    { on: "pick the best one", show: iconStack(["tt", "ig"]), hold: 1 },
    { at: 3, show: flashCard("GO") },
    { on: "best", emphasis: "shake" },
  ],
};

describe("resolveStoryboard", () => {
  const r = resolveStoryboard(sb, takes, wordsFile);

  it("takes duration and dimensions from takes.json", () => {
    expect(r.durationInFrames).toBe(120);
    expect(r.width).toBe(1080);
  });

  it("maps sections to take frames and makes the first take the hook", () => {
    expect(r.sections).toEqual([
      { startFrame: 0, endFrame: 40, title: "Not using AI yet? // You're behind", isHook: true },
      { startFrame: 40, endFrame: 120, title: "1. Hooks", isHook: false },
    ]);
  });

  it("resolves a phrase moment to the first word's frame and until: to the phrase start", () => {
    expect(r.moments[0]).toMatchObject({ enterFrame: 50, exitFrame: 80, zone: "left", sfx: "slam" });
  });

  it("applies numeric hold in seconds", () => {
    expect(r.moments[1]).toMatchObject({ enterFrame: 80, exitFrame: 110, zone: "right" });
  });

  it("resolves at: seconds and flashCard default hold of 3 frames", () => {
    expect(r.moments[2]).toMatchObject({ enterFrame: 90, exitFrame: 93, zone: "full" });
  });

  it("gives emphasis the word's own duration in the captions zone", () => {
    expect(r.moments[3]).toMatchObject({ enterFrame: 100, exitFrame: 108, zone: "captions", emphasis: "shake" });
  });

  it("fails with the phrase name when a phrase is missing", () => {
    expect(() => resolveStoryboard({ ...sb, moments: [{ on: "nope nope" }] }, takes, wordsFile)).toThrow(/nope nope/);
  });

  it("uses the default face box when none is given", () => {
    expect(r.faceBox).toEqual({ x: 0.33, y: 0.22, w: 0.42, h: 0.52 });
  });
});
```

- [ ] **Step 12: Run to verify failure**

Run: `npm test -- src/storyboard/resolve.test.ts`
Expected: FAIL.

- [ ] **Step 13: Create src/storyboard/resolve.ts**

```ts
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
  const { words } = wordsFile;
  const durationInFrames = takes[takes.length - 1].endFrame;

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
```

- [ ] **Step 14: Run all tests**

Run: `npm test`
Expected: all PASS, including the 8 resolve tests.

- [ ] **Step 15: Commit**

```bash
git add src/types.ts src/storyboard/ src/punchIn.ts src/punchIn.test.ts
git commit -m "Add storyboard DSL, validation, resolution and punch-in schedule

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 8: Composition skeleton — Root, calculateMetadata, Face layer, zones overlay

**Files:**
- Create: `src/TalkingHead.tsx`, `src/layers/Face.tsx`, `src/layers/ZonesOverlay.tsx`, `src/videos/index.ts`, `src/videos/v2_ai_b.ts` (minimal, no moments yet)
- Modify: `src/Root.tsx`

**Interfaces:**
- `TalkingHead.tsx` exports `TalkingHead: React.FC<Props>` and `calculateMetadata`, where `Props = { id: string; showZones: boolean; resolved?: ResolvedVideo }`. `calculateMetadata` fetches `staticFile("videos/<id>/takes.json")` and `words.json`, looks up the storyboard in `src/videos/index.ts`, calls `resolveStoryboard`, and returns `{ durationInFrames, width, height, fps, props: { ...props, resolved }, defaultOutName: id }`.
- `videos/index.ts` exports `storyboards: Record<string, Storyboard>`.
- `Face.tsx` props `{ resolved: ResolvedVideo }`: full-frame `<Video>` of `face.mp4` with `scale: scaleAtFrame(...)` and `transformOrigin` at the face-box centre.

- [ ] **Step 1: Create the minimal v2 storyboard and index**

`src/videos/v2_ai_b.ts`:

```ts
import { video } from "../storyboard/dsl";

export default video({
  id: "v2_ai_b",
  hook: "Not using AI yet? // You're already behind",
  sections: [
    { take: 2, title: "1. Hooks" },
    { take: 3, title: "2. Repurpose" },
    { take: 4, title: "3. Post it" },
    { take: 5, title: "Save this" },
  ],
  moments: [],
});
```

`src/videos/index.ts`:

```ts
import type { Storyboard } from "../types";
import v2_ai_b from "./v2_ai_b";

export const storyboards: Record<string, Storyboard> = { v2_ai_b };
```

- [ ] **Step 2: Create src/layers/ZonesOverlay.tsx**

```tsx
import { AbsoluteFill, useVideoConfig } from "remotion";
import { rectToStyle, zonesFor } from "../zones";
import type { Rect } from "../types";

const colours: Record<string, string> = {
  topBand: "#FFD600", left: "#4cd964", right: "#4cd964", face: "#ff3b30", captions: "#ffffff", platformUi: "#999999",
};

export const ZonesOverlay: React.FC<{ faceBox: Rect }> = ({ faceBox }) => {
  const { width, height } = useVideoConfig();
  const zones = zonesFor(faceBox);
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {(Object.keys(colours) as (keyof typeof zones)[]).map((name) => (
        <div
          key={name}
          style={{
            ...rectToStyle(zones[name], width, height),
            border: `3px dashed ${colours[name]}`,
            boxSizing: "border-box",
            color: colours[name],
            fontFamily: "sans-serif",
            fontSize: 28,
            padding: 6,
          }}
        >
          {name}
        </div>
      ))}
    </AbsoluteFill>
  );
};
```

- [ ] **Step 3: Create src/layers/Face.tsx**

```tsx
import { Video } from "@remotion/media";
import { AbsoluteFill, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { scaleAtFrame } from "../punchIn";
import type { ResolvedVideo } from "../types";

export const Face: React.FC<{ resolved: ResolvedVideo }> = ({ resolved }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { faceBox } = resolved;
  const originX = `${(faceBox.x + faceBox.w / 2) * 100}%`;
  const originY = `${(faceBox.y + faceBox.h / 2) * 100}%`;
  return (
    <AbsoluteFill>
      <Video
        name="Face"
        src={staticFile(`videos/${resolved.id}/face.mp4`)}
        premountFor={fps}
        style={{
          width: "100%",
          height: "100%",
          scale: scaleAtFrame(resolved.takes, frame, fps),
          transformOrigin: `${originX} ${originY}`,
        }}
      />
    </AbsoluteFill>
  );
};
```

- [ ] **Step 4: Create src/TalkingHead.tsx**

```tsx
import { AbsoluteFill, staticFile, type CalculateMetadataFunction } from "remotion";
import { Face } from "./layers/Face";
import { ZonesOverlay } from "./layers/ZonesOverlay";
import { resolveStoryboard } from "./storyboard/resolve";
import { storyboards } from "./videos";
import type { ResolvedVideo, TakesFile, WordsFile } from "./types";

export type TalkingHeadProps = {
  id: string;
  showZones: boolean;
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
  const resolved = resolveStoryboard(sb, takes, words);
  return {
    durationInFrames: resolved.durationInFrames,
    width: resolved.width,
    height: resolved.height,
    fps: resolved.fps,
    defaultOutName: props.id,
    props: { ...props, resolved },
  };
};

export const TalkingHead: React.FC<TalkingHeadProps> = ({ resolved, showZones }) => {
  if (!resolved) return null;
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <Face resolved={resolved} />
      {showZones ? <ZonesOverlay faceBox={resolved.faceBox} /> : null}
    </AbsoluteFill>
  );
};
```

- [ ] **Step 5: Register compositions in src/Root.tsx**

```tsx
import { Composition } from "remotion";
import { TalkingHead, calculateMetadata } from "./TalkingHead";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="v2_ai_b"
        component={TalkingHead}
        durationInFrames={30}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{ id: "v2_ai_b", showZones: false }}
        calculateMetadata={calculateMetadata}
      />
    </>
  );
};
```

- [ ] **Step 6: Type-check and look at it in Studio**

Run: `npx tsc --noEmit` → no errors. Studio should already be running (`npm run dev`); otherwise start it. Open http://localhost:3000/v2_ai_b in the browser pane. Expected: the joined face video plays at the right duration (~44 s); scrubbing across a take boundary shows the 8 % punch-in. Flip `showZones` to `true` in the props panel: dashed boxes appear and the red `face` box frames the head with the chin at its bottom edge. If it doesn't, adjust `DEFAULT_FACE_BOX` in `zones.ts` and re-run `npm test`.

Also take a still to verify colour: `npx remotion still v2_ai_b work/v2_ai_b/still_face.png --frame=200` and view it with the Read tool.

- [ ] **Step 7: Commit**

```bash
git add src/
git commit -m "Add TalkingHead composition with face layer and zones overlay

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 9: Captions layer — word pop

**Files:**
- Create: `src/layers/Captions.tsx`
- Modify: `src/TalkingHead.tsx` (add layer)

**Interfaces:**
- `Captions: React.FC<{ resolved: ResolvedVideo; emphasis: ResolvedMoment[] }>` — renders `groupWords(resolved.words, …)` groups; each in its own `<Sequence from={startFrame} durationInFrames={endFrame-startFrame}>`. The `emphasis` prop is used in Task 11; accept and ignore it now.

- [ ] **Step 1: Create src/layers/Captions.tsx**

```tsx
import { AbsoluteFill, Easing, Sequence, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { groupWords, type CaptionGroup } from "../captions/group";
import { COLORS, fonts } from "../theme";
import { rectToStyle, zonesFor } from "../zones";
import type { ResolvedMoment, ResolvedVideo } from "../types";

const FONT_SIZE = 84;

const Group: React.FC<{ group: CaptionGroup; absoluteStart: number }> = ({ group, absoluteStart }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const absolute = absoluteStart + frame;
  const enter = spring({ frame, fps, config: { damping: 14, stiffness: 220, mass: 0.6 } });
  return (
    <div
      style={{
        width: "100%",
        textAlign: "center",
        fontFamily: fonts.display,
        fontWeight: 900,
        fontSize: FONT_SIZE,
        lineHeight: 1.05,
        textTransform: "uppercase",
        color: COLORS.text,
        WebkitTextStroke: `6px ${COLORS.ink}`,
        paintOrder: "stroke fill",
        textShadow: `0 8px 0 ${COLORS.ink}, 0 0 28px rgba(0,0,0,0.6)`,
        scale: interpolate(enter, [0, 1], [0.9, 1]),
        opacity: interpolate(enter, [0, 0.3], [0, 1], { extrapolateRight: "clamp" }),
      }}
    >
      {group.words.map((w, i) => {
        const spoken = absolute >= w.startFrame;
        const sinceStart = absolute - w.startFrame;
        const pop = interpolate(sinceStart, [0, 3, 7], [1, 1.26, 1.18], {
          extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic),
        });
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              margin: "0 0.12em",
              color: spoken ? COLORS.accent : COLORS.text,
              scale: spoken ? pop : 1,
            }}
          >
            {w.text}
          </span>
        );
      })}
    </div>
  );
};

export const Captions: React.FC<{ resolved: ResolvedVideo; emphasis: ResolvedMoment[] }> = ({ resolved }) => {
  const { width, height } = useVideoConfig();
  const zone = zonesFor(resolved.faceBox).captions;
  const groups = groupWords(resolved.words, {
    fps: resolved.fps,
    takeBoundaries: resolved.takes.slice(1).map((t) => t.startFrame),
  });
  return (
    <AbsoluteFill>
      <div style={{ ...rectToStyle(zone, width, height), display: "flex", alignItems: "center", justifyContent: "center" }}>
        {groups.map((g, i) => (
          <Sequence key={i} name={`Caption ${i}`} from={g.startFrame} durationInFrames={g.endFrame - g.startFrame} layout="none">
            <Group group={g} absoluteStart={g.startFrame} />
          </Sequence>
        ))}
      </div>
    </AbsoluteFill>
  );
};
```

- [ ] **Step 2: Add the layer in TalkingHead.tsx**

Between `<Face …/>` and the zones overlay:

```tsx
<Captions resolved={resolved} emphasis={resolved.moments.filter((m) => m.emphasis)} />
```

with `import { Captions } from "./layers/Captions";`.

- [ ] **Step 3: Check in Studio and with stills**

`npx tsc --noEmit` → clean. In Studio, play from the start: captions sit under the chin, inside the white `captions` zone when `showZones` is on, 2–4 words at a time, the spoken word in ice blue and bigger. Take two stills and view them:

```bash
npx remotion still v2_ai_b work/v2_ai_b/cap_a.png --frame=45
npx remotion still v2_ai_b work/v2_ai_b/cap_b.png --frame=400
```

Check: no caption wider than the frame minus 80 px each side (if one is, lower `MAX_CHARS` in `group.ts` to 26 and re-run tests), and the text is legible against the cream wall.

- [ ] **Step 4: Commit**

```bash
git add src/layers/Captions.tsx src/TalkingHead.tsx
git commit -m "Add word-pop captions layer

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 10: Section title layer

**Files:**
- Create: `src/layers/SectionTitle.tsx`
- Modify: `src/TalkingHead.tsx`

**Interfaces:**
- `SectionTitles: React.FC<{ resolved: ResolvedVideo }>` — one `<Sequence>` per `resolved.sections` entry. `//` in a title becomes a line break.

- [ ] **Step 1: Create src/layers/SectionTitle.tsx**

```tsx
import { AbsoluteFill, Sequence, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS, fonts } from "../theme";
import { rectToStyle, zonesFor } from "../zones";
import type { ResolvedSection, ResolvedVideo } from "../types";

const Pill: React.FC<{ section: ResolvedSection }> = ({ section }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const length = section.endFrame - section.startFrame;
  const enter = spring({ frame, fps, config: { damping: 12, stiffness: 180 } });
  const exit = interpolate(frame, [length - 6, length - 1], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const lines = section.title.split("//").map((s) => s.trim());
  return (
    <div
      style={{
        display: "inline-block",
        backgroundColor: COLORS.accent,
        color: COLORS.ink,
        fontFamily: fonts.display,
        fontWeight: 900,
        fontSize: section.isHook ? 64 : 56,
        lineHeight: 1.1,
        textTransform: "uppercase",
        textAlign: "center",
        padding: "18px 36px",
        borderRadius: 18,
        boxShadow: `0 12px 0 ${COLORS.ink}`,
        maxWidth: "100%",
        rotate: "-2deg",
        scale: interpolate(enter, [0, 1], [0.6, 1]) * exit,
        opacity: exit,
      }}
    >
      {lines.map((l, i) => <div key={i}>{l}</div>)}
    </div>
  );
};

export const SectionTitles: React.FC<{ resolved: ResolvedVideo }> = ({ resolved }) => {
  const { width, height } = useVideoConfig();
  const zone = zonesFor(resolved.faceBox).topBand;
  return (
    <AbsoluteFill>
      <div style={{ ...rectToStyle(zone, width, height), display: "flex", alignItems: "center", justifyContent: "center" }}>
        {resolved.sections.map((s, i) => (
          <Sequence key={i} name={`Title: ${s.title}`} from={s.startFrame} durationInFrames={s.endFrame - s.startFrame} layout="none">
            <Pill section={s} />
          </Sequence>
        ))}
      </div>
    </AbsoluteFill>
  );
};
```

- [ ] **Step 2: Add to TalkingHead.tsx** above the captions layer: `<SectionTitles resolved={resolved} />`.

- [ ] **Step 3: Check in Studio**

`npx tsc --noEmit` → clean. Scrub to frame 10 (hook pill, two lines) and to the first frame of take 2 ("1. HOOKS" springs in as the punch-in snaps). Still: `npx remotion still v2_ai_b work/v2_ai_b/title.png --frame=10` and view it. The pill must stay inside the top band and not touch the hairline.

- [ ] **Step 4: Commit**

```bash
git add src/layers/SectionTitle.tsx src/TalkingHead.tsx
git commit -m "Add pinned section title layer

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 11: Graphics kit and emphasis

**Files:**
- Create: `src/graphics/BigNumber.tsx`, `src/graphics/PunchList.tsx`, `src/graphics/IconStack.tsx`, `src/graphics/Counter.tsx`, `src/graphics/FlashCard.tsx`, `src/graphics/enter.ts`, `src/layers/Graphics.tsx`
- Modify: `src/layers/Captions.tsx` (emphasis), `src/TalkingHead.tsx`, `src/videos/v2_ai_b.ts` (two test moments)

**Interfaces:**
- Every graphic is `React.FC<{ spec: <its GraphicSpec variant>; length: number }>` rendered inside a `<Sequence from={enterFrame} durationInFrames={exitFrame-enterFrame}>` positioned by zone in `Graphics.tsx`.
- `enter.ts`: `useEnterExit(length: number): { enter: number; exit: number }` — `enter` is a spring 0→1 from frame 0; `exit` goes 1→0 over the last 6 frames.

- [ ] **Step 1: Create src/graphics/enter.ts**

```ts
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

export const useEnterExit = (length: number, stiffness = 200) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 11, stiffness, mass: 0.7 } });
  const exit = interpolate(frame, [length - 6, length - 1], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return { enter, exit, frame, fps };
};
```

- [ ] **Step 2: Create src/graphics/BigNumber.tsx**

```tsx
import { interpolate } from "remotion";
import { COLORS, fonts } from "../theme";
import { useEnterExit } from "./enter";

export const BigNumber: React.FC<{ spec: { value: string; label: string }; length: number }> = ({ spec, length }) => {
  const { enter, exit } = useEnterExit(length);
  return (
    <div
      style={{
        fontFamily: fonts.display,
        fontWeight: 900,
        color: COLORS.accent,
        WebkitTextStroke: `8px ${COLORS.ink}`,
        paintOrder: "stroke fill",
        textShadow: `0 18px 0 ${COLORS.ink}`,
        lineHeight: 0.9,
        rotate: "-6deg",
        scale: interpolate(enter, [0, 1], [1.8, 1]) * exit,
        opacity: Math.min(1, enter * 3) * exit,
      }}
    >
      <div style={{ fontSize: 260 }}>{spec.value}</div>
      <div style={{ fontSize: 56, color: COLORS.text, WebkitTextStroke: `4px ${COLORS.ink}`, marginTop: 10, letterSpacing: "0.02em" }}>
        {spec.label}
      </div>
    </div>
  );
};
```

- [ ] **Step 3: Create src/graphics/PunchList.tsx**

```tsx
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS, fonts } from "../theme";
import { useEnterExit } from "./enter";

const STAGGER = 8;

export const PunchList: React.FC<{ spec: { items: string[]; pick?: number; strike?: number[] }; length: number }> = ({ spec, length }) => {
  const { exit } = useEnterExit(length);
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const strike = new Set(spec.strike ?? spec.items.map((_, i) => i).filter((i) => spec.pick !== undefined && i !== spec.pick));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, opacity: exit }}>
      {spec.items.map((item, i) => {
        const s = spring({ frame: frame - i * STAGGER, fps, config: { damping: 12, stiffness: 220 } });
        const picked = spec.pick === i;
        const struck = strike.has(i);
        const strikeProgress = interpolate(frame, [i * STAGGER + 14, i * STAGGER + 22], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        return (
          <div
            key={i}
            style={{
              position: "relative",
              alignSelf: "flex-start",
              fontFamily: fonts.body,
              fontWeight: 800,
              fontSize: 40,
              padding: "12px 22px",
              borderRadius: 12,
              backgroundColor: picked ? COLORS.accent : COLORS.ink,
              color: picked ? COLORS.ink : COLORS.text,
              boxShadow: `0 8px 0 ${picked ? COLORS.ink : COLORS.accent}`,
              transform: "skewX(-6deg)",
              translate: `${interpolate(s, [0, 1], [-80, 0])}px 0px`,
              opacity: s,
            }}
          >
            {picked ? "✓ " : ""}{item}
            {struck ? (
              <div style={{ position: "absolute", left: 16, right: 16, top: "50%", height: 6, backgroundColor: COLORS.accent, scale: `${strikeProgress} 1`, transformOrigin: "left" }} />
            ) : null}
          </div>
        );
      })}
    </div>
  );
};
```

- [ ] **Step 4: Create src/graphics/IconStack.tsx**

Glyphs are simple drawn shapes, not brand logos: a musical note (tt), a rounded square with a circle (ig), a rounded rectangle with a play triangle (yt), a bold lowercase f (fb).

```tsx
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { COLORS, fonts } from "../theme";
import { useEnterExit } from "./enter";
import type { IconName } from "../types";

const Glyph: React.FC<{ name: IconName }> = ({ name }) => {
  const c = COLORS.accent;
  switch (name) {
    case "tt":
      return <svg viewBox="0 0 48 48" width="70%"><path d="M27 6v22a7 7 0 1 1-7-7v6a1 1 0 1 0 1 1V6h6c1 5 4 8 9 9v6c-3 0-6-1-9-3v10a13 13 0 1 1-13-13v6a7 7 0 1 0 7 7V6z" fill={c} /></svg>;
    case "ig":
      return <svg viewBox="0 0 48 48" width="70%"><rect x="8" y="8" width="32" height="32" rx="9" fill="none" stroke={c} strokeWidth="5" /><circle cx="24" cy="24" r="7" fill="none" stroke={c} strokeWidth="5" /><circle cx="33" cy="15" r="2.5" fill={c} /></svg>;
    case "yt":
      return <svg viewBox="0 0 48 48" width="70%"><rect x="5" y="12" width="38" height="24" rx="8" fill={c} /><path d="M21 18v12l10-6z" fill={COLORS.ink} /></svg>;
    case "fb":
      return <div style={{ fontFamily: fonts.display, fontWeight: 900, fontSize: 64, color: c, lineHeight: 1 }}>f</div>;
  }
};

export const IconStack: React.FC<{ spec: { icons: IconName[] }; length: number }> = ({ spec, length }) => {
  const { exit } = useEnterExit(length);
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22, alignItems: "center", opacity: exit }}>
      {spec.icons.map((icon, i) => {
        const s = spring({ frame: frame - i * 6, fps, config: { damping: 10, stiffness: 260 } });
        return (
          <div
            key={icon}
            style={{
              width: 150, height: 150, borderRadius: 36,
              backgroundColor: COLORS.ink,
              boxShadow: `0 10px 0 ${COLORS.accent}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              rotate: "5deg",
              scale: interpolate(s, [0, 1], [0, 1]),
            }}
          >
            <Glyph name={icon} />
          </div>
        );
      })}
    </div>
  );
};
```

- [ ] **Step 5: Create src/graphics/Counter.tsx**

```tsx
import { Easing, interpolate } from "remotion";
import { COLORS, fonts } from "../theme";
import { useEnterExit } from "./enter";

export const Counter: React.FC<{ spec: { from: number; to: number; label: string }; length: number }> = ({ spec, length }) => {
  const { enter, exit, frame, fps } = useEnterExit(length);
  const value = Math.round(
    interpolate(frame, [6, 6 + fps * 1.2], [spec.from, spec.to], {
      extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic),
    }),
  );
  return (
    <div
      style={{
        fontFamily: fonts.display, fontWeight: 900, color: COLORS.accent,
        WebkitTextStroke: `8px ${COLORS.ink}`, paintOrder: "stroke fill",
        textShadow: `0 18px 0 ${COLORS.ink}`, lineHeight: 0.9, rotate: "-6deg",
        scale: interpolate(enter, [0, 1], [1.6, 1]) * exit, opacity: Math.min(1, enter * 3) * exit,
      }}
    >
      <div style={{ fontSize: 220, fontVariantNumeric: "tabular-nums" }}>{value.toLocaleString("en-GB")}</div>
      <div style={{ fontSize: 56, color: COLORS.text, WebkitTextStroke: `4px ${COLORS.ink}`, marginTop: 10 }}>{spec.label}</div>
    </div>
  );
};
```

- [ ] **Step 6: Create src/graphics/FlashCard.tsx**

```tsx
import { AbsoluteFill } from "remotion";
import { COLORS, fonts } from "../theme";

export const FlashCard: React.FC<{ spec: { word: string }; length: number }> = ({ spec }) => (
  <AbsoluteFill style={{ backgroundColor: COLORS.accent, alignItems: "center", justifyContent: "center" }}>
    <div style={{ fontFamily: fonts.display, fontWeight: 900, fontSize: 200, color: COLORS.ink, textTransform: "uppercase", rotate: "-4deg" }}>
      {spec.word}
    </div>
  </AbsoluteFill>
);
```

- [ ] **Step 7: Create src/layers/Graphics.tsx**

```tsx
import { AbsoluteFill, Sequence, useVideoConfig } from "remotion";
import { BigNumber } from "../graphics/BigNumber";
import { Counter } from "../graphics/Counter";
import { FlashCard } from "../graphics/FlashCard";
import { IconStack } from "../graphics/IconStack";
import { PunchList } from "../graphics/PunchList";
import { rectToStyle, zonesFor } from "../zones";
import type { ResolvedMoment, ResolvedVideo } from "../types";

const Graphic: React.FC<{ m: ResolvedMoment }> = ({ m }) => {
  const length = m.exitFrame - m.enterFrame;
  const s = m.show;
  if (!s) return null;
  switch (s.kind) {
    case "bigNumber": return <BigNumber spec={s} length={length} />;
    case "punchList": return <PunchList spec={s} length={length} />;
    case "iconStack": return <IconStack spec={s} length={length} />;
    case "counter": return <Counter spec={s} length={length} />;
    case "flashCard": return <FlashCard spec={s} length={length} />;
  }
};

export const Graphics: React.FC<{ resolved: ResolvedVideo }> = ({ resolved }) => {
  const { width, height } = useVideoConfig();
  const zones = zonesFor(resolved.faceBox);
  return (
    <AbsoluteFill>
      {resolved.moments.filter((m) => m.show).map((m, i) => {
        const rect = zones[m.zone === "captions" ? "left" : m.zone];
        const alignLeft = m.zone === "left";
        return (
          <Sequence key={i} name={`${m.show!.kind} @${m.enterFrame}`} from={m.enterFrame} durationInFrames={m.exitFrame - m.enterFrame} layout="none">
            <div
              style={{
                ...rectToStyle(rect, width, height),
                display: "flex",
                flexDirection: "column",
                justifyContent: m.zone === "full" ? "center" : "flex-start",
                alignItems: alignLeft ? "flex-start" : m.zone === "right" ? "flex-end" : "center",
                paddingTop: m.zone === "full" ? 0 : 40,
                overflow: "visible",
              }}
            >
              <Graphic m={m} />
            </div>
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
```

- [ ] **Step 8: Add emphasis to Captions.tsx**

In `Group`, accept an `emphasis` prop: `emphasis?: { kind: "shake" | "pulse" | "flash"; from: number; to: number }` (absolute frames). In `Captions`, for each group find `emphasis.find(e => e.enterFrame >= g.startFrame && e.enterFrame < g.endFrame)` and pass `{ kind: e.emphasis, from: e.enterFrame, to: e.exitFrame }`. In `Group`'s outer `div` style, add:

```tsx
translate: emphasis && emphasis.kind === "shake" && absolute >= emphasis.from && absolute < emphasis.to
  ? `${Math.sin((absolute - emphasis.from) * 2.6) * 14}px 0px`
  : "0px 0px",
```

and multiply `scale` by `emphasis && emphasis.kind === "pulse" && absolute >= emphasis.from && absolute < emphasis.to ? 1.1 : 1`. For `flash`, add a sibling `<AbsoluteFill>` in `Captions` that renders white at `opacity: 0.85` for frames `[from, from+2)`.

- [ ] **Step 9: Wire Graphics into TalkingHead.tsx** between `SectionTitles` and `Captions`:

```tsx
<Graphics resolved={resolved} />
```

- [ ] **Step 10: Add two trial moments to v2_ai_b.ts and look**

```ts
moments: [
  { on: "10 hook ideas", show: bigNumber(10, "HOOK IDEAS"), sfx: "slam", hold: "until:pick the best one" },
  { on: "YouTube, TikTok, Facebook and Instagram", show: iconStack(["yt", "tt", "fb", "ig"]), sfx: "pop", hold: 3 },
  { on: "already behind", emphasis: "shake" },
],
```

(import `bigNumber`, `iconStack` from `../storyboard/dsl`). If a phrase fails to resolve, Studio shows the `PhraseNotFoundError`; check the words in `words.json` and adjust the phrase, not the matcher.

`npx tsc --noEmit` → clean. Stills at each moment's enter frame + 8 (read the frames from Studio's timeline or from `resolved.moments` by adding a temporary `console.log` in `calculateMetadata`):

```bash
npx remotion still v2_ai_b work/v2_ai_b/g_number.png --frame=<enter+8>
npx remotion still v2_ai_b work/v2_ai_b/g_icons.png --frame=<enter+12>
```

Check with the Read tool: the number sits in the left zone and does not touch the face; the icon stack is in the right zone; nothing is in the bottom 12 %. Tune sizes (`fontSize` 260 → smaller) if the number overflows the left zone.

- [ ] **Step 11: Commit**

```bash
git add src/graphics/ src/layers/Graphics.tsx src/layers/Captions.tsx src/TalkingHead.tsx src/videos/v2_ai_b.ts
git commit -m "Add bold graphics kit, graphics layer and caption emphasis

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 12: SFX kit (CC0) and SFX layer

**Files:**
- Create: `public/sfx/{slam,tick,pop,whoosh,riser,thud}.wav` (or `.mp3`), `public/sfx/LICENSE.md`, `src/layers/Sfx.tsx`
- Modify: `src/TalkingHead.tsx`

**Interfaces:**
- `Sfx: React.FC<{ resolved: ResolvedVideo }>` — for each moment with `sfx`, an `<Audio src={staticFile(`sfx/${sfx}.wav`)} />` inside a `<Sequence from={enterFrame}>`.

- [ ] **Step 1: Gather candidates**

Downloads need Matt's permission in chat; ask once for the batch, naming the source. Sources, in order of preference:

1. `https://github.com/kapishdima/soundcn/tree/main/assets` (linked by the Remotion skill). First read its LICENSE file; use only if it permits commercial reuse. Fetch raw files with `curl -L -o`.
2. `https://remotion.media/whoosh.wav`, `https://remotion.media/whip.wav`, `https://remotion.media/switch.wav`, `https://remotion.media/mouse-click.wav`, `https://remotion.media/vine-boom.wav` (Remotion's public SFX set).
3. Pixabay sound effects (CC0, no attribution): search "pop ui", "whoosh short", "deep impact", "riser short", "tick click" in the browser pane; download via the page's button after Matt says yes.

Put 2–3 candidates per role into `work/sfx-candidates/<role>_<n>.<ext>`. Roles: `slam` (deep impact for BigNumber/Counter), `tick` (short click for PunchList picks), `pop` (soft pop for IconStack items), `whoosh` (short for exits), `riser` (0.5–1 s for the hook pill), `thud` (FlashCard).

- [ ] **Step 2: Audition page**

Write `/Users/mattdev/Projects/UGC/.superpowers/brainstorm/78214-1791371395/content/sfx.html` (the companion server from brainstorming; restart it with `scripts/start-server.sh --project-dir /Users/mattdev/Projects/UGC` if `state/server-stopped` exists) listing each role with `<audio controls src="/files/sfx-candidates/…">` for every candidate and an option per candidate (`data-choice="slam:2"`). Copy `work/sfx-candidates/` into the content dir so `/files/` serves it. Tell Matt the URL and ask him to pick one per role.

- [ ] **Step 3: Install the picks**

Copy each chosen file to `public/sfx/<role>.wav` (convert with `ffmpeg -i in -ar 48000 -ac 2 out.wav` if not already WAV). Normalise loudness so they sit under speech: `ffmpeg -i in.wav -af loudnorm=I=-18:TP=-2 out.wav`. Write `public/sfx/LICENSE.md` listing each file, its source URL and licence.

- [ ] **Step 4: Create src/layers/Sfx.tsx**

```tsx
import { Audio } from "@remotion/media";
import { Sequence, staticFile, useVideoConfig } from "remotion";
import type { ResolvedVideo } from "../types";

export const Sfx: React.FC<{ resolved: ResolvedVideo }> = ({ resolved }) => {
  const { fps } = useVideoConfig();
  return (
    <>
      {resolved.moments.filter((m) => m.sfx).map((m, i) => (
        <Sequence key={i} name={`sfx ${m.sfx}`} from={m.enterFrame} durationInFrames={3 * fps} layout="none">
          <Audio src={staticFile(`sfx/${m.sfx}.wav`)} premountFor={fps} volume={0.8} />
        </Sequence>
      ))}
    </>
  );
};
```

- [ ] **Step 5: Wire into TalkingHead.tsx** as the last child: `<Sfx resolved={resolved} />`.

- [ ] **Step 6: Check**

`npx tsc --noEmit` → clean. In Studio with sound on, play through the "10 hook ideas" moment: the slam lands with the number. Verify every name in `SFX_NAMES` has a file: `ls public/sfx/`. If one is missing the render will fail with a 404 on that file; the storyboard validator already rejects unknown names.

- [ ] **Step 7: Commit**

```bash
git add public/sfx src/layers/Sfx.tsx src/TalkingHead.tsx
git commit -m "Add CC0 SFX kit and SFX layer

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 13: Storyboard and render v2_ai_b

**Files:**
- Modify: `src/videos/v2_ai_b.ts`
- Create: `out/v2_ai_b.mp4` (ignored by git)

- [ ] **Step 1: Write the full storyboard**

Based on the transcript (adjust phrases to what `words.json` actually contains):

```ts
import { video, bigNumber, punchList, iconStack } from "../storyboard/dsl";

export default video({
  id: "v2_ai_b",
  hook: "Not using AI yet? // You're already behind",
  sections: [
    { take: 2, title: "1. Hooks" },
    { take: 3, title: "2. Repurpose" },
    { take: 4, title: "3. Post it" },
    { take: 5, title: "Save this" },
  ],
  moments: [
    { on: "already behind", emphasis: "shake" },
    { on: "three ways", show: bigNumber(3, "WAYS I USE AI"), sfx: "slam", hold: 2.5 },
    { on: "10 hook ideas", show: bigNumber(10, "HOOK IDEAS"), sfx: "slam", hold: "until:pick the best one" },
    { on: "pick the best one", show: punchList(["Why nobody watches", "Stop doing this", "You're already behind"], { pick: 2 }), sfx: "tick", hold: 3 },
    { on: "30 seconds", show: bigNumber(30, "SECONDS"), sfx: "slam", hold: 2.5 },
    { on: "one idea becomes", show: punchList(["Video", "Carousel", "Caption"]), sfx: "tick", hold: 4 },
    { on: "rewrite it for each format", emphasis: "pulse" },
    { on: "YouTube, TikTok, Facebook and Instagram", show: iconStack(["yt", "tt", "fb", "ig"]), sfx: "pop", hold: 4 },
    { on: "hit approve", show: punchList(["Approve"], { pick: 0 }), sfx: "tick", hold: 2 },
    { on: "save this", emphasis: "pulse" },
  ],
});
```

Show this file to Matt before rendering and apply his edits.

- [ ] **Step 2: Resolve check**

Open http://localhost:3000/v2_ai_b. If a phrase isn't found, Studio shows `PhraseNotFoundError: "…"`; look the words up in `public/videos/v2_ai_b/words.json` and fix the phrase.

- [ ] **Step 3: Stills at every moment**

For each moment, `npx remotion still v2_ai_b work/v2_ai_b/m<i>.png --frame=<enterFrame+8>` and view with the Read tool. Fix overlaps with the face by moving the moment to a different kind/zone or shortening its hold; fix overflow by reducing `fontSize` in the component.

- [ ] **Step 4: Render**

```bash
cd /Users/mattdev/Projects/UGC && npx remotion render v2_ai_b out/v2_ai_b.mp4 --codec=h264 --crf=18
ffprobe -v error -show_entries stream=width,height,r_frame_rate,codec_name -of default=nw=1 out/v2_ai_b.mp4
```

Expected: 1080×1920, 30/1, h264 + aac. Send `out/v2_ai_b.mp4` to Matt with `SendUserFile` and ask for notes.

- [ ] **Step 5: Commit**

```bash
git add src/videos/v2_ai_b.ts
git commit -m "Storyboard v2_ai_b

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 14: Prep, transcribe, storyboard and render v3_plan_a

**Files:**
- Create: `src/videos/v3_plan_a.ts`, `public/videos/v3_plan_a/{takes.json,words.json}`, `out/v3_plan_a.mp4`
- Modify: `src/videos/index.ts`, `src/Root.tsx`

- [ ] **Step 1: Prep and transcribe**

```bash
cd /Users/mattdev/Projects/UGC && npm run prep -- v3_plan_a && npm run transcribe -- v3_plan_a
```

Expected: seven takes joined (~85 s), transcript printed; compare to the spec's transcript and extend `FIXES` if needed (e.g. "growing" → "going" was needed before: add it only if Whisper repeats the error).

- [ ] **Step 2: Storyboard**

```ts
import { video, bigNumber, punchList, iconStack, counter, flashCard } from "../storyboard/dsl";

export default video({
  id: "v3_plan_a",
  hook: "33 followers → 1,000 // my 5-step plan",
  sections: [
    { take: 2, title: "1. One topic" },
    { take: 3, title: "2. Engage" },
    { take: 4, title: "3. Reply with video" },
    { take: 5, title: "4. Post everywhere" },
    { take: 6, title: "5. Watch time" },
    { take: 7, title: "Save this" },
  ],
  moments: [
    { on: "33 followers", show: counter(33, 1000, "FOLLOWERS"), sfx: "slam", hold: "until:five things" },
    { on: "five things", show: bigNumber(5, "THINGS"), sfx: "slam", hold: 2.5 },
    { on: "whole month", show: bigNumber(30, "DAYS, ONE TOPIC"), sfx: "slam", hold: 3 },
    { on: "content creation tips", show: punchList(["Content creation tips"], { pick: 0 }), sfx: "tick", hold: 3 },
    { on: "liking and I'm commenting", show: punchList(["Like", "Comment", "Repeat"]), sfx: "tick", hold: 4 },
    { on: "reply with video", show: flashCard("REPLY"), sfx: "thud" },
    { on: "hook is already written", emphasis: "pulse" },
    { on: "posting everywhere", show: bigNumber(4, "CHANNELS"), sfx: "slam", hold: "until:tick all four" },
    { on: "TikTok, Facebook, Instagram and YouTube", show: iconStack(["tt", "fb", "ig", "yt"]), sfx: "pop", hold: 4 },
    { on: "four times", emphasis: "shake" },
    { on: "watch time", show: punchList(["Likes", "Watch time"], { pick: 1 }), sfx: "tick", hold: 4 },
    { on: "save this", emphasis: "pulse" },
  ],
});
```

Note "all of my videos go into Postiz" gets no moment, per the brand rule. Register in `videos/index.ts` and add a second `<Composition id="v3_plan_a" … defaultProps={{ id: "v3_plan_a", showZones: false }} />` in `Root.tsx`. Show the storyboard to Matt before rendering.

- [ ] **Step 3: Face box**

Toggle `showZones` in Studio on `v3_plan_a`. If the chin sits lower or higher than in v2, set `faceBox` in the storyboard and check captions still sit under the chin.

- [ ] **Step 4: Stills, render, deliver**

As in Task 13 steps 3–4, with `v3_plan_a`. Send `out/v3_plan_a.mp4` to Matt.

- [ ] **Step 5: Commit**

```bash
git add src/videos/ src/Root.tsx public/videos/v3_plan_a/takes.json public/videos/v3_plan_a/words.json
git commit -m "Storyboard and data for v3_plan_a

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 15: README

**Files:**
- Modify: `README.md` (replace the scaffold text)

- [ ] **Step 1: Write the README**

Cover, in this order, each with the exact command:

1. What this is (one paragraph) and the layer list.
2. New video, start to finish: drop numbered takes in a folder → `npm run prep -- <id> [sourceRoot]` → `npm run transcribe -- <id>` (first run downloads ~1.5 GB) → create `src/videos/<id>.ts` from the template below → add to `src/videos/index.ts` and `Root.tsx` → `npm run dev` → `npx remotion render <id> out/<id>.mp4`.
3. Storyboard reference: every field of `Storyboard`/`Moment`, each `GraphicSpec` kind with its zone and default hold, `hold` forms, `emphasis` values, `sfx` names, the Postiz rule.
4. Setting the face box: `showZones`, `faceBox` fractions, what each zone is for.
5. Captions: the fixes map, how to re-transcribe (delete `words.json`).
6. Colour: the LUT and why (link to the old README's section), how to swap it.
7. SFX: files and licences.
8. Known limits: no auto face detection, no music, no screen-recording cutaways.

Include a storyboard template:

```ts
import { video, bigNumber, punchList, iconStack, counter, flashCard } from "../storyboard/dsl";

export default video({
  id: "my_video",
  // faceBox: { x: 0.33, y: 0.22, w: 0.42, h: 0.52 },
  hook: "First line // second line",
  sections: [{ take: 2, title: "1. First tip" }],
  moments: [
    { on: "a phrase you said", show: bigNumber(3, "THINGS"), sfx: "slam", hold: 3 },
  ],
});
```

- [ ] **Step 2: Check the commands in the README actually run**

Run each listed command once against `v2_ai_b` (prep and transcribe will no-op quickly thanks to caching only if you skip them; otherwise they re-run, which is fine). `npm test` and `npx tsc --noEmit` must pass.

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "Document the pipeline and storyboard format

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

## Self-review

**Spec coverage.** Pipeline steps 1–4 → Tasks 3, 4, 7/13, 13–14. Composition layers → Tasks 8 (face, punch-in, push-in, zones overlay), 9 (captions), 10 (title), 11 (graphics incl. all six kinds and emphasis), 12 (sfx). Zones → Task 2. Palette/type → Task 1. Storyboard semantics incl. fuzzy numbers, `at`, `hold`, `until:`, Postiz rule, failing on missing phrase → Tasks 5, 7. Testing list → Tasks 2, 3, 4, 5, 6, 7. Errors list → Tasks 3 (resolution/fps), 7 (phrase, sfx, Postiz), 8 (missing takes/words with the command to run). Deliverables → Tasks 13, 14, 15. "Graphic outside its zone" is enforced structurally (positioned by zone) rather than by a runtime check; acceptable.

**Placeholders.** None; every code step has the code. Task 12 step 1 depends on an external licence check, stated explicitly.

**Type consistency.** `ResolvedMoment.zone` uses `ZoneName` which includes `"captions"` and `"full"`; `Graphics.tsx` maps `"captions"` to the left rect only for safety (emphasis moments have no `show`, so never reach it). `scaleAtFrame(takes, frame, fps)` signature matches between `punchIn.ts` and `Face.tsx`. `groupWords` options match between `group.ts` and `Captions.tsx`. `TakesFile` includes `width`/`height`, written by `prep.ts` and read by `resolveStoryboard`.
