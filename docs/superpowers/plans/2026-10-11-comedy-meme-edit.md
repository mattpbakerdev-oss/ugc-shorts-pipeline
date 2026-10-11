# Comedy Meme Edit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax. The codebase exists (see `README.md`); implementers read the files they touch before changing them.

**Goal:** Add pre-cut parts, cutaways, crash zooms, impact frames, freeze-frames, meme SFX and a ducked music bed to the pipeline, then remake `w1_viral` with them.

**Architecture:** Prep gains a `source.parts` mode and cutaway conversion. The resolver gains four moment kinds and a timeline expansion for freezes. The composition gains a Cutaways layer, a Music layer and face-layer effects. Everything stays storyboard-driven.

**Tech Stack:** unchanged (Remotion 4.0.534 incl. `<Freeze>`, `@remotion/media`, Vitest, tsx, ffmpeg 9).

**Spec:** `docs/superpowers/specs/2026-10-11-comedy-meme-edit-design.md` (binding). The 2026-10-07 spec still binds everything it covers.

## Global Constraints
- All round-1/2 constraints still bind: theme palette only, Google fonts, Remotion markup rules (inline `interpolate`/`spring`, individual `scale`/`translate`/`rotate`, `@remotion/media` + `premountFor`), fail loudly, Vitest next to code, composition ids hyphenated (`w1-viral`, `props.id: "w1_viral"`), commit trailer `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
- A/V: every part and the joined `face.mp4` audio == video within 0.04 s; loudness pass unchanged.
- `source.parts` paths are relative to `source.dir`; `trim: false` means NO silence trimming (padding/loudness/guard still apply). `cutawayDir` is relative to `source.dir`; cutaway clips are converted to `public/videos/<id>/cutaways/<clipId>.mp4` and their durations written to `public/videos/<id>/cutaways.json`.
- New moment fields are mutually exclusive with `show` and with each other, except `impact` may combine with `crashZoom`. Validation enforces this.
- Freeze expansion: a freeze at frame F of length L shifts every later moment/section/word start by L; `durationInFrames` grows by the sum of freezes; the face video shows frame F for L frames (`<Freeze frame={F}>`), the audio is silent for L frames (the voice is paused, music ducked).
- Ducking: music volume ramps to 0 over 6 frames before, and back over 6 frames after, each cutaway/freeze/impact window.
- Studio stays on port 3000; never render both the old and new comps in one task; Bash timeouts prep/render 600 000.
- Downloads (music from Pixabay, meme SFX from remotion.media) only after Matt's explicit OK in chat (asked; wait for it in Task 4).

---

### Task 1: Source parts mode, cutaway conversion, music copy (prep)
**Files:** modify `src/types.ts` (`Storyboard.source?`, `Storyboard.music?`, `CutawaysFile`), `src/storyboard/validate.ts` (+test), `scripts/prep.ts`, `scripts/ffmpeg.ts` if needed; create `scripts/parts.ts` (+test).
**Interfaces:** `Storyboard.source?: { dir: string; parts: string[]; trim?: boolean; cutawayDir?: string }`; `Storyboard.music?: { file: string; volume?: number }`; `CutawaysFile = { fps: number; clips: Record<string, { file: string; durationSeconds: number }> }`; `partsPlan(source): { file: string; absPath: string; label: string }[]` (pure; label = basename without extension; throws on duplicates/empty).
- [ ] Validation: `source.parts` non-empty, `trim` boolean, `music.volume` in (0, 1]; tests.
- [ ] `prep.ts`: when the storyboard has `source`, iterate `parts` in order instead of scanning numbered takes; skip `parseSilence` when `trim === false` (speechStart 0, speechEnd = audio length); keep padding, cut application, concat, loudness, sync guard; write `takes.json` with `file = part label`. When `cutawayDir` is set, convert every `*.mp4` in it (SDR if HDR, same encode args, no trimming) to `public/videos/<id>/cutaways/<label>.mp4` and write `cutaways.json` (probe durations). When `music.file` is set, verify `public/music/<file>` exists (fail loudly with the path; copying is Task 4's job).
- [ ] Create `src/videos/w1_viral.ts` with `source: { dir: "/Users/mattdev/Projects/ugc-renderer/takes/Batch 16", parts: ["viral/v00_cold.mp4", …15 in spec order], trim: false, cutawayDir: "jcuts" }`, hook `"$500,000 // + 1M followers // in ONE week"`, sections per spec (parts 5, 6, 9, 12 — 1-based part numbers = `take` numbers), `moments: []`; register in `src/videos/index.ts` and `src/Root.tsx` (`w1-viral`, `defaultProps {id:"w1_viral", showZones:false, cover:false}`).
- [ ] Run `npm run prep -- w1_viral` then `npm run transcribe -- w1_viral`; verify 15 takes, A/V within 0.04 s, 12 cutaway clips + `cutaways.json`; paste the transcript. `npm test`, `npx tsc --noEmit`. Commit: "Add pre-cut parts source mode and cutaway conversion to prep".

### Task 2: Resolver — cutaway, crashZoom, impact, freeze, ducking, prefix numbers
**Files:** modify `src/types.ts` (Moment fields, `ResolvedMoment` fields, `ResolvedVideo.freezes`, `.ducking`, `.music`), `src/storyboard/validate.ts` (+test), `src/storyboard/resolve.ts` (+test), `src/storyboard/dsl.ts` (`bigNumber(value, label, { prefix })`, `counter(from, to, label, { prefix })`), `src/graphics/BigNumber.tsx`/`Counter.tsx` (prefix + thousands separators).
**Interfaces:** `Moment.cutaway?: { file: string; from: number; to: number }`, `Moment.crashZoom?: { scale?: number; shake?: boolean } | true`, `Moment.impact?: "white" | "black"`, `Moment.freeze?: { seconds: number; text: string }`; `ResolvedMoment` gains `cutaway?: { file; fromFrame; toFrame }` (zone `full`), `crashZoom?: { scale; shake }`, `impact?`, `freeze?: { lengthFrames; text }`; `ResolvedVideo.freezes: { atFrame: number; lengthFrames: number; text: string }[]`, `.ducking: { from: number; to: number }[]`, `.music?: { file; volume }`; `resolveStoryboard(sb, takes, words, cutaways?: CutawaysFile)`.
- [ ] Validation: mutual exclusivity; cutaway `to > from ≥ 0`; freeze seconds > 0 and text non-empty; new sfx names added to `SFX_NAMES` (`vine-boom, record-scratch, bruh, xp-error, fah, boomer, quack`).
- [ ] Resolution order: resolve all phrase/at frames in the ORIGINAL timeline, then apply freeze expansion in frame order (each freeze shifts later frames, incl. section boundaries and caption words, and `durationInFrames`). Cutaway: `fromFrame/toFrame` = round(seconds·fps); throw if `to` exceeds the clip's duration from `cutaways.json` or the clip is unknown; moment hold = range length; zone `full`. crashZoom default `{ scale: 1.35, shake: false }`, exit = phrase end or `hold`. impact: 2 frames. Ducking windows = union of cutaway/freeze/impact windows padded ±2 frames, merged.
- [ ] Tests: each kind resolves; freeze shifts a later moment, a section boundary and the words after it; a freeze before a cutaway shifts the cutaway; cutaway past clip end throws; ducking merges overlaps; prefix formatting ("$500,000", "1,000,000").
- [ ] `npm test`, `npx tsc --noEmit`. Commit: "Resolve cutaways, crash zooms, impacts, freezes and music ducking".

### Task 3: Layers — face effects, cutaways, freeze caption, music
**Files:** modify `src/layers/Face.tsx`, `src/layers/Captions.tsx` (words already shifted; no change expected — verify), `src/TalkingHead.tsx`; create `src/layers/Cutaways.tsx`, `src/layers/FreezeCaption.tsx`, `src/layers/Music.tsx`, `src/layers/Impacts.tsx`.
- [ ] Face: wrap the `<Video>` so that during each freeze the shown frame is held (`<Freeze frame={atFrame}>` around a Video positioned with `trimBefore`, or `<Sequence>` segments between freezes with `trimBefore` offsets — choose the approach that keeps A/V exact; document it). Audio: the face audio must also pause during freezes (segments with `trimBefore` naturally handle it when the Video is split into segments; use that). Crash zoom: per-moment `scale` factor multiplied into the existing punch-in, 4-frame ease-out in, snap out; optional 2-frame ±8 px shake via `translate`.
- [ ] `Cutaways`: for each cutaway moment a `<Sequence from durationInFrames>` with a muted `<Video src=staticFile(videos/<id>/cutaways/<file>.mp4) trimBefore={fromFrame} premountFor={fps}>` full-frame, `objectFit: cover`.
- [ ] `Impacts`: 2-frame `AbsoluteFill` white/black at each impact.
- [ ] `FreezeCaption`: during a freeze, a huge accent chip (fonts.display 900, 120 px, ink text, −3°) with the text, springing in; sits in the top band or centred if the face box is low — use the top band.
- [ ] `Music`: `<Audio src=staticFile(music/<file>) loop volume={f => interpolate over ducking windows}>` — compute per-frame volume from `resolved.ducking` with 6-frame ramps; `premountFor={fps}`.
- [ ] Wire in `TalkingHead` (order: Face, Cutaways, Impacts, SectionTitles, Graphics, FreezeCaption, Captions, overlay, Sfx, Music). `cover` mode hides Cutaways/Impacts/FreezeCaption/Music too.
- [ ] Verify with temporary moments on `w1-viral` (one of each kind) and stills at enter+1/enter+3 (impact, freeze caption, cutaway, crash zoom); remove temps. `npm test`, `npx tsc --noEmit`. Commit: "Add cutaway, impact, freeze and music layers; crash zoom on the face".

### Task 4: Assets — meme SFX and music (needs Matt's download OK)
- [ ] Download `https://remotion.media/{vine-boom,record-scratch,bruh,windows-xp-error,fah,dramatic-boomer,mac-quack}.wav` into `work/sfx-candidates/`, loudnorm as the kit does (`I=-18:TP=-2`), install as `public/sfx/{vine-boom,record-scratch,bruh,xp-error,fah,boomer,quack}.wav`; extend `public/sfx/LICENSE.md` (remotion.media terms quoted) and the `sfx.test.ts` list.
- [ ] Music: in the browser pane search Pixabay Music for "trap beat motivational hustle" (royalty-free, Pixabay licence); download 3 candidates (≤ 2 min each) to `work/music-candidates/`; audition page in the companion (restart it if stopped; flatten files into its content root — subfolders are not served) with `<audio>` per candidate; tell the controller the URL. After Matt picks: convert to 48 kHz stereo mp3/wav in `public/music/<name>.wav` (loudnorm I=-20), `public/music/LICENSE.md` with the Pixabay URL + licence.
- [ ] Commit: "Add meme SFX and the w1 music bed".

### Task 5: Storyboard, stills, render, cover
- [ ] Fill `src/videos/w1_viral.ts` moments per the spec draft, phrases from the real transcript; port the nine cutaways with their clip ranges; sfx per moment; `music: { file: "<picked>.wav", volume: 0.1 }`. `cuts` none unless the transcript shows a fluff.
- [ ] Stills at every moment (+1/+6), hook chips, cover; render `w1-viral` → `out/w1_viral.mp4` (`--codec=h264 --crf=18 --audio-bitrate=192k`); ffprobe (duration = parts + freezes; A/V within 0.04 s); `npm run cover -- w1_viral <frame>`. Send to Matt via the controller.
- [ ] Commit: "Storyboard and render w1_viral".

### Task 6: README
- [ ] Document `source` mode, cutaways, the four new moment kinds, freeze timeline behaviour, music + ducking, new sfx names, and the w1 example. Commit: "Document the comedy edit features".

## Self-review
Spec → tasks: source/prep (1), resolver incl. freezes/ducking/prefix (2), layers (3), assets (4), storyboard+render (5), docs (6). Interfaces named once in the task that introduces them. No placeholders beyond the music pick, which is Matt's decision.
