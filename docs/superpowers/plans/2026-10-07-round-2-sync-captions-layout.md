# Round 2: Sync, bloopers, captions, layout, hook chips, CTA, cover

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. The codebase from round 1 exists and is documented in `README.md`; implementers read the files they touch before changing them.

**Goal:** Fix A/V drift and remove bloopers in the joined takes, stop captions reflowing, let each video place captions and graphics where its framing has room, replace the hook pill with staircase chips, add a save/share CTA graphic and a cover-frame export, then re-render `v2_ai_b` and `v3_plan_a`.

**Architecture:** Prep gains audio padding, loudness normalisation and per-take cut ranges read from the storyboard. Captions are pre-split into fixed lines with reserved pop space. Storyboards gain `captionY`, `graphicsBox` and `cuts`. A `HookChips` component renders the hook take's title. A `bloopers` script proposes cuts from the transcript. A `cover` script exports a still.

**Tech Stack:** unchanged (Remotion 4.0.534, Vitest, tsx, ffmpeg 9).

**Spec:** `docs/superpowers/specs/2026-10-07-talking-head-shorts-design.md` plus the decisions in this plan's Global Constraints (Matt's round-2 feedback, 2026-10-07).

## Global Constraints

- Everything from round 1 still binds: palette from `src/theme.ts` (accent `#4DE1FF`, ink `#0A1630`, text `#FFFFFF`), fonts via `@remotion/google-fonts`, Remotion markup rules (inline `interpolate`/`spring`, individual `scale`/`translate`/`rotate`, `@remotion/media` + `premountFor`), fail loudly, tests next to code, commit trailer `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
- Composition ids are hyphenated (`v2-ai-b`, `v3-plan-a`); `props.id` keeps underscores.
- A/V: every prepped take must have audio duration == video duration (±1 frame); the joined `face.mp4` must too.
- Voice loudness target: integrated −16 LUFS, true peak −1.5 dBTP (`loudnorm=I=-16:TP=-1.5:LRA=11`), applied once to the joined audio.
- Cuts are expressed in **take-local seconds of the trimmed take as prep produced it before cutting** (so authors read times off `work/<id>/take_NN.mp4`), never in joined-video frames.
- Captions: lines pre-split at ≤ 18 characters, max 2 lines per group; new group after `.`, `!`, `?`; the currently spoken word's extra width is reserved for every word from the start so nothing reflows.
- Storyboard overrides are optional and validated: `captionY` (0.3–0.88, top of the caption band), `graphicsBox` (a `Rect` that must not overlap the face box), `cuts` (`{ take, from, to }` with `1 ≤ take ≤ takes`, `0 ≤ from < to`).
- Hook chips: the hook string splits on `//` into 1–3 chips; colours cycle white → accent → ink (text ink on white/accent, white on ink); chips step right by 0.03 of the frame each; tilt −2°, +1°, −1.5°; each pops in 8 frames after the previous. Section titles on later takes keep the pill.
- Keep Studio running on port 3000; don't start a second one. Bash timeouts: prep 600 000, render 600 000.
- Never render both videos in the same task until the final task.

---

### Task 1: Prep — audio padding, loudness, per-take cuts

**Files:** modify `scripts/prep.ts`, `scripts/ffmpeg.ts`, `src/types.ts` (add `Cut`, `Storyboard.cuts?`), `src/storyboard/validate.ts` (+ test), create `scripts/cuts.ts` (+ test).

**Interfaces:**
- `types.ts`: `export type Cut = { take: number; from: number; to: number }` (seconds, take-local, see constraints); `Storyboard.cuts?: Cut[]`.
- `validate.ts`: rejects `take < 1`, `from < 0`, `to <= from`.
- `scripts/cuts.ts`: `keptSegments(duration: number, cuts: { from: number; to: number }[]): { from: number; to: number }[]` — pure; merges overlapping cuts, clamps to `[0, duration]`, returns the kept ranges in order; throws if nothing is kept. Tests: no cuts → one full segment; one middle cut → two; overlapping cuts merge; cut past the end clamps; cut covering everything throws.
- `prep.ts`: after trimming each take (existing step), apply that take's cuts with one ffmpeg call using `filter_complex` `trim`/`atrim` + `concat` (re-encode as now), writing `work/<id>/take_NN_cut.mp4`; the concat list uses the cut file when cuts exist. Audio padding: add `-af apad -shortest`-free approach: use `-af "apad=whole_dur=<videoDurationSeconds>"` on every take encode so audio length == video length. Loudness: after concat, run a second pass that re-encodes audio only: `ffmpeg -i joined.mp4 -c:v copy -af loudnorm=I=-16:TP=-1.5:LRA=11 -c:a aac -b:a 192k face.mp4`. `takes.json` frames come from the **cut** files. Prep reads cuts from the storyboard: `import { storyboards } from "../src/videos"` (tsx can import it; the DSL has no browser-only imports — verify, and if `src/videos/index.ts` pulls in anything from `remotion`, move the cut lookup behind a small `src/videos/cuts.ts` that imports only the storyboard files' `cuts`).
- Verification: `npm run prep -- v2_ai_b` then `ffprobe -v error -show_entries stream=codec_type,duration -of csv=p=0 public/videos/v2_ai_b/face.mp4` → audio and video within 0.04 s; `ffmpeg -i face.mp4 -af loudnorm=print_format=json -f null -` → `input_i` ≈ −16.
- Commit: "Pad audio to video length, normalise loudness and apply storyboard cuts in prep".

### Task 2: Blooper detector

**Files:** create `scripts/bloopers.ts` (+ `scripts/bloopers.test.ts` for the pure part), add `"bloopers": "tsx scripts/bloopers.ts"` to `package.json`, README section.

**Interfaces:**
- Pure: `findRestarts(words: Word[], takes: Take[], fps: number, opts = { minWords: 3, windowSeconds: 4 }): Restart[]` where `Restart = { take: number; from: number; to: number; phrase: string }` — for each position, if the normalised n-gram (n = minWords) at `i` reappears starting at `j > i` with `words[j].startFrame - words[i].startFrame ≤ window`, propose cutting from `words[i].startFrame` up to `words[j].startFrame` (the first attempt), converted to take-local seconds using the take containing `i` (if `i` and `j` are in different takes, skip and report). Uses `normaliseToken` from `src/phrase.ts`. Tests with synthetic words: a repeated 3-gram within the window → one restart with the right range; same 3-gram 10 s apart → none; a 2-word repeat → none.
- CLI prints a table (take file, from, to, phrase) and a ready-to-paste `cuts: [...]` block.
- Commit: "Add blooper detector that proposes storyboard cuts".

### Task 3: Captions — fixed lines, reserved pop space, sentence breaks

**Files:** modify `src/captions/group.ts` (+ test), `src/layers/Captions.tsx`.

**Interfaces:**
- `CaptionGroup` gains `lines: Word[][]` (1–2 lines, each ≤ 18 chars incl. spaces); `groupWords` also starts a new group after a word ending in `.`, `!` or `?`. Tests: a 4-word group whose text is 30 chars splits into two lines of ≤ 18; a word ending in "." ends the group; no line exceeds 18 chars; a single word longer than 18 chars stays alone on its line.
- `Captions.tsx`: render `lines` as explicit rows (`white-space: nowrap` per row, rows stacked). Every word gets the same horizontal padding it would need at the pop scale (`(POP_SETTLED − 1) · text.length · 0.5 em`, where `POP_SETTLED = 1.18`) from the start; the current word animates `scale` only. Result: no reflow when the highlight moves. Keep colours/fonts. Verify with stills at frames 45, 400, 940 of `v2-ai-b` (no line change between a frame before and after a highlight moves; take two stills 2 frames apart around a word boundary and compare).
- Commit: "Fix caption lines and reserve pop space; break groups at sentence ends".

### Task 4: Storyboard overrides — captionY and graphicsBox

**Files:** modify `src/types.ts`, `src/storyboard/validate.ts` (+ test), `src/storyboard/resolve.ts` (+ test), `src/zones.ts` (+ test), `src/layers/Graphics.tsx`, `src/layers/Captions.tsx`, `src/layers/ZonesOverlay.tsx`, README.

**Interfaces:**
- `Storyboard.captionY?: number`, `Storyboard.graphicsBox?: Rect`. `ResolvedVideo.captionY: number` (resolved: override or `face.y + face.h + GAP`) and `ResolvedVideo.graphicsBox: Rect` (override or the primary side zone).
- `zonesFor(face, { captionY?, graphicsBox? })`: when `captionY` is given, `captions.y = captionY` (must be ≥ face bottom + GAP, else throw); when `graphicsBox` is given it must not overlap the face (throw) and replaces the primary zone; `secondary` stays the other side if ≥ 0.12 wide, else the graphics box. Overlay draws `graphicsBox` when present.
- Resolver: primary zone = `graphicsBox` when given (its width check ≥ 0.10 still applies). Graphics layer positions the primary column inside `graphicsBox`; alignment: left-aligned if the box's centre is left of the face centre, else right-aligned.
- Tests: captionY below the face is accepted and used; captionY above the chin throws; overlapping graphicsBox throws; non-overlapping box becomes the primary zone.
- Commit: "Add captionY and graphicsBox storyboard overrides".

### Task 5: Hook chips

**Files:** create `src/layers/HookChips.tsx`, modify `src/layers/SectionTitle.tsx` (hook section delegates to `HookChips`), `src/TalkingHead.tsx` if needed.

**Interfaces:** `HookChips: React.FC<{ section: ResolvedSection }>` — splits `title` on `//` (max 3 chips; more → throw naming the hook), renders chips per Global Constraints inside the top band, left-aligned column at x = band.x + 0.02 with each chip translated right by `i · 0.03 · width`; chip i springs in at frame `i · 8` (scale 0.6 → 1, overshoot); all exit together over the last 6 frames of the section. Font `fonts.display` 900, uppercase, 56 px, padding 14/28, radius 14, shadow `0 8px 0 ink`. Verify with stills of `v2-ai-b` at frames 4, 12, 24, 60 (chips appear one by one, stay inside the top band, clear of the hair).
- Commit: "Render the hook as staircase chips".

### Task 6: CTA graphic and cover export

**Files:** create `src/graphics/CtaSaveShare.tsx`, modify `src/types.ts` (`GraphicSpec` + `{ kind: "ctaSaveShare" }`), `src/storyboard/dsl.ts` (`ctaSaveShare()`), `src/storyboard/resolve.ts` (default hold 3 s, zone `secondary`), `src/layers/Graphics.tsx`; create `scripts/cover.ts`, add `"cover": "tsx scripts/cover.ts"`; modify `src/TalkingHead.tsx` (prop `cover: boolean` hides Captions/Graphics/Sfx and forces the hook chips fully in), `src/Root.tsx` (`defaultProps` gain `cover: false`), README.

**Interfaces:**
- `CtaSaveShare` renders two tiles like `IconStack` (bookmark glyph, share-arrow glyph), each popping in, then a tick drawn over each 10 frames later. Verify with a still.
- `scripts/cover.ts <id> [frame]`: runs `npx remotion still <hyphen-id> out/<id>_cover.png --frame=<frame|30> --props='{"id":"<id>","showZones":false,"cover":true}'` via `child_process` and prints the path. Verify on v2.
- Commit: "Add save/share CTA graphic and cover export".

### Task 7: Re-prep, cut lists, storyboards, re-render both

**Files:** modify `src/videos/v2_ai_b.ts`, `src/videos/v3_plan_a.ts`; regenerate `public/videos/*/{takes.json,words.json}`; `out/*.mp4`, `out/*_cover.png`.

- Run `npm run prep` + `npm run transcribe` for both (no cuts yet), then `npm run bloopers` for both; put the confirmed restarts into each storyboard's `cuts` (v3 at least has "First thing. / The first thing" at the start of take 2); re-run prep + transcribe with cuts; check every storyboard phrase still resolves (adjust phrases to the new transcript if a cut removed words).
- v2: hook `"Not using AI yet? // You're already // behind."`; add `{ on: "send it to your friend", show: ctaSaveShare(), sfx: "pop" }` as the last moment.
- v3: `captionY: 0.66`, `graphicsBox: { x: 0.48, y: 0.22, w: 0.47, h: 0.40 }`, hook `"33 followers // → 1,000 // my 5-step plan"`; CTA on "send it to a mate".
- Stills at every graphic moment for both; render both with `--audio-bitrate=192k`; `npm run cover` for both; ffprobe both renders (A/V durations equal within 0.04 s).
- Commit: "Round 2 storyboards, cuts and data".

## Self-review

Spec coverage: Matt's six points map to Tasks 1 (sync, bloopers), 3 (jumping captions), 4 (v3 captions lower, graphics centre-right), 5 (hook), 7 (renders); the five add-ons map to Tasks 3 (sentence breaks), 1 (loudness), 6 (CTA, cover), 2 (restart detector). Types used across tasks: `Cut`, `captionY`, `graphicsBox`, `ctaSaveShare` are each defined in the task that introduces them and consumed only afterwards. No placeholders; where code is not spelled out, the interface, behaviour and tests are.
