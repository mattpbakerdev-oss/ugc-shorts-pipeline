# UGC shorts pipeline

Turns numbered talking-head takes (iPhone, 9:16) into finished 1080x1920 / 30 fps shorts: silence trimmed, colour-corrected, captioned, with section titles, graphics and sound effects timed to what you say. You write a small storyboard per video; everything else is automatic. Built on Remotion 4.0.534.

## Why this exists

Paid short-form work for a SaaS client: a steady run of talking-head shorts for YouTube and TikTok. Editing each one by hand (trimming silence, captions, titles, graphics, sound) didn't scale past the first few. So each video is now a small storyboard, and everything else is automatic.

Output: [Short 1](https://youtube.com/shorts/S4q-Ie9Scps), [Short 2](https://youtube.com/shorts/p9sebfN-z20), [TikTok](https://www.tiktok.com/@postizwithmatt/video/7694395558743510274)

Built with Claude Code from a design spec and an implementation plan; see `docs/superpowers`.

Layers, bottom to top (`src/layers/`):

1. **Face**: the takes joined back to back, HLG to SDR through a LUT, with punch-ins, a slow push-in, crash zooms, camera shakes and freezes (the frame is held while the timeline extends).
2. **Cutaways** and **impact flashes**: full-frame muted inserts, and 2-frame white/black flashes (see "Comedy / meme edits").
3. **Section titles and hook chips**: the hook (take 1, or takes 1 to `hookTakes`) is up to three stacked chips (split on `//`, sized to fit the top band); later takes get one title each. Hidden during cutaways.
4. **Graphics**: big numbers, punch lists, icon stacks, counters, flash cards and the save/share CTA, placed in zones around the face. Hidden during cutaways.
5. **Freeze captions**: the big chip over a frozen frame.
6. **Captions**: Whisper word timings, at most 2 lines of 13 characters each, broken at sentence ends, above the platform UI.
7. **SFX**: short sounds fired from storyboard moments.
8. **Music**: an optional looping bed that ducks under cutaways, freezes and impacts.
9. **Zones overlay** (debug only): shows the face box and zones.

## New video, start to finish

1. Put the takes in a folder named after the video id, e.g. `<sourceRoot>/v4_topic/`, named `<n> <name>.mp4` (`1 hook.mp4`, `2 tip1.mp4`, ...). Take 1 is the hook. Ids use underscores. Any 9:16 portrait source at 30 fps or more is accepted (`scripts/source.ts`): 4K / 60 fps iPhone clips, stored landscape with a rotation tag, are scaled to 1080x1920 at 30 fps in prep. Only the first video and first audio stream are used, so the spatial-audio (APAC) track newer iPhones add is ignored.
2. Prep (trims silence, applies the LUT, writes `public/videos/<id>/` and `takes.json`):
   ```
   npm run prep -- v4_topic [sourceRoot]
   ```
   Without `sourceRoot` it uses the folder set in `scripts/prep.ts`.
3. Transcribe (writes `public/videos/<id>/words.json`). Each take is transcribed separately and offset onto the joined timeline, because whisper stretches a word over silence and, on the joined audio, would start a take's first word inside the previous take. When `work/<id>/take_NN.mp4` exists (it does after prep), Whisper hears that **uncut** take and the word times are mapped through the storyboard's `cuts` afterwards (`mapWordsThroughKept` in `scripts/cuts.ts`): Whisper aligns words badly when a clip starts or ends tight on speech, which is exactly the air the cuts remove. Words inside a removed range (a false start, a click) are dropped and logged; a word stretched into a cut is clamped to it. On a checkout without `work/`, the cut take is sliced from `face.mp4` instead. Words Whisper places more than a frame after a take's measured speech end (trailing silence below -35 dB) are dropped as hallucinations; a word starting at the boundary is kept (Whisper stretches the previous word up to the speech end and starts the real last word there) and clamped to 2 frames past it. The first run downloads whisper.cpp 1.5.5 and the medium.en model (about 1.5 GB) into `./whisper/`:
   ```
   npm run transcribe -- v4_topic
   ```
4. Create `src/videos/v4_topic.ts` from the template below.
5. Register it. In `src/videos/index.ts` import it and add it to `storyboards`. In `src/Root.tsx` add a `<Composition>` with a **hyphenated** id (Remotion rejects underscores) and the underscored id in props:
   ```tsx
   <Composition id="v4-topic" component={TalkingHead} durationInFrames={30} fps={30}
     width={1080} height={1920} defaultProps={{ id: "v4_topic", showZones: false, cover: false }}
     calculateMetadata={calculateMetadata} />
   ```
6. Preview and tune: `npm run dev`, then open the composition `/v4-topic` in the Studio.
7. Render:
   ```
   npx remotion render v4-topic out/v4_topic.mp4 --codec=h264 --crf=18 --audio-bitrate=192k
   ```

Checks: `npm test` (vitest) and `npx tsc --noEmit`.

### Storyboard template

```ts
import { video, bigNumber, punchList, iconStack, counter, flashCard } from "../storyboard/dsl";

export default video({
  id: "my_video",
  // faceBox: { x: 0.22, y: 0.36, w: 0.54, h: 0.42 },
  hook: "First line // second line",
  sections: [{ take: 2, title: "1. First tip" }],
  moments: [
    { at: 0, sfx: "riser" },
    { on: "a phrase you said", show: bigNumber(3, "THINGS"), sfx: "slam", hold: 3 },
    // stack: true adds this below the previous graphic in the same zone instead of replacing it
    { on: "the next phrase", show: punchList(["Option A", "Option B"], { pick: 1 }), sfx: "tick", stack: true, hold: "until:a later phrase" },
    { on: "something important", emphasis: "pulse" },
  ],
});
```

`src/videos/v2_ai_b.ts` is a full example (`src/videos/w1_viral.ts` for the comedy edit); `src/videos/v3_plan_a.ts` is a worked example of a different framing (custom `faceBox`).

## Storyboard reference

Types are in `src/types.ts`; helpers in `src/storyboard/dsl.ts`.

**Storyboard**: `id` (underscored, matches the data folder), `faceBox?` (fractions), `cuts?` (`{ take, from, to }[]`: take-local seconds of `work/<id>/take_NN.mp4` BEFORE cutting; prep removes them), `captionY?` (top of the caption band, 0.3 to 0.80, i.e. 1 - 0.10 platform UI - 0.10 caption height; must be at least the face bottom + 0.02), `graphicsBox?` (`{ x, y, w, h }` fractions; replaces the primary graphics zone, must keep a gap of at least 0.02 from `faceBox`, must not overlap the captions band or the top band, width >= 0.10), `hookBox?` (`{ x, y, w, h }` fractions; replaces the top band for the hook chips), `source?` and `music?` (see "Comedy / meme edits"), `hook` (shown on take 1, or takes 1 to `hookTakes` when `hookTakes` is set; sections must then target later takes), `sections` (`{ take, title }`, takes numbered from 1; take 1 is the hook so sections start at 2), `moments`.

**Transcript overrides**: `transcriptOverrides?` (`{ take, text?, drop?, replace? }[]`, takes numbered from 1). When Whisper mishears a short clip, pin its text: `npm run transcribe` replaces that take's words with `text` split on whitespace, spread evenly from the take's first transcribed word start to its last word end (or the whole take minus 0.2 s at each end if Whisper heard nothing), each word at least 2 frames. For a single bad word keep Whisper's timings instead: `drop: ["thank"]` removes every word with that text in the take (a phantom word Whisper hears in a breath, which starts inside the real last word so no silence rule catches it), and `replace: { too: "two" }` swaps a word's text keeping its punctuation and timing. `drop` and `replace` may be combined; neither may be given with `text`. Matching ignores case and punctuation.

**Moment** (each needs exactly one of `on` / `at`):

| Field | Meaning |
| --- | --- |
| `on` | Phrase from the transcript; the moment starts when it is said (fuzzy: case, punctuation and number words tolerated). |
| `at` | Seconds from the start of the video, instead of `on`. |
| `show` | A graphic (below). Omit for sfx-only or emphasis moments. |
| `emphasis` | `"shake"`, `"pulse"` or `"flash"` on the captions at that word. Lasts the matched phrase's duration. |
| `sfx` | One of the 13 names in the SFX section. A `freeze` moment defaults to `record-scratch`. |
| `hold` | How long the graphic stays: seconds, or `"until:<phrase>"`. |
| `stack` | `true` appends the graphic below the previous one in the same zone. |
| `cameraShake` | `true` or `{ frames?, px? }`: the whole face layer jolts from the phrase start (default 8 frames, 14 px, alternating and decaying), scaled up by just enough that the shifted edge never shows. Chips, graphics and captions stay still. Excludes `show`, `cutaway`, `crashZoom`, `freeze` and `hold`; may combine with `impact`. `v5_mistakes_a` uses it on the hook with a `thud`. |
| `cutaway`, `crashZoom`, `impact`, `freeze` | Comedy moment kinds; see "Comedy / meme edits". |

**Rules that bite**

- List moments in **spoken order**. The matcher's cursor only moves forward, so an out-of-order phrase fails to match.
- A repeated identical phrase means its next occurrence.
- `until:<phrase>` must be said **after** the moment starts, or the build errors.
- A later graphic in the same zone cuts the earlier one short, unless the later one has `stack: true`.
- A phrase that is not found fails the build with the missing phrase named.
- Any "Postiz" in a moment (phrase, hold, or graphic text) is rejected by the validator. Do not amplify the brand in graphics; captions are separate.
- `//` in `hook` or a section title is a line break.

**Cuts and prep**: prep reads `cuts` from the registered storyboard (if none is registered it logs that no cuts were applied), trims each take, applies the cuts, pads audio so it never ends before the video, and normalises the joined voice to -16 LUFS (true peak -1.5 dB).

**Removing retakes**

1. `npm run prep -- <id>` (no cuts yet), then `npm run transcribe -- <id>`.
2. `npm run bloopers -- <id>` on this UNCUT take: it prints take-local seconds that match `cuts`.
3. Check each proposal against the transcript and paste the `cuts: [...]` block into the storyboard.
4. Re-run `npm run prep -- <id>` to apply the cuts.
5. Delete `public/videos/<id>/words.json` and run `npm run transcribe -- <id>` again: the words are re-mapped through the new cuts (Whisper itself hears the same uncut take as before).

**Finding retakes (`npm run bloopers -- <id>`)**

Reads `takes.json` and `words.json`, and flags any 3-word phrase that is repeated within 4 seconds (a retake). It proposes cutting the first attempt, and prints a table plus a ready-to-paste `cuts: [...]` block with take-local seconds. Tune with `--min-words <n>` (default 3, integer >= 1; use 2 for short retakes like "First thing. The first thing") and `--window <seconds>` (default 4). Restarts that straddle a take boundary are skipped with a warning. These are proposals: check each against the transcript before pasting.

**Graphics**

| Helper | Zone | Default hold |
| --- | --- | --- |
| `bigNumber(value, label)` | wider side of the face (`left` unless the right is clearly wider) | 3 s |
| `punchList(items, { pick?, strike? })` | same | 4 s |
| `counter(from, to, label)` | same | 3 s |
| `iconStack(["yt","tt","fb","ig"])` | the other side, if at least 0.12 wide, else the same side | 3 s |
| `ctaSaveShare()` | the other side (like `iconStack`) | 3 s |
| `flashCard(word)` | full frame | 3 frames |
| emphasis only | captions | the matched phrase's duration |

`punchList`: `pick` is the index of the chosen item (ticked); every other item is struck through unless you pass `strike` (indices) explicitly. Icons: `tt`, `ig`, `yt`, `fb`.

`hold` forms: a number of seconds, `"until:<phrase>"`, or omitted for the default above.

`ctaSaveShare()` is a "save and share" call to action: a bookmark tile and a share-arrow tile pop in, then a tick is drawn over each.

## Comedy / meme edits

For a meme-cut edit (crash zooms, impact frames, freeze-frames, hard cutaways, meme SFX, a music bed) from pre-cut clips. `src/videos/w1_viral.ts` is the worked example: 15 hand-trimmed parts, nine cutaways, a crash zoom, impacts, one freeze and the guru beat. Everything below is optional per video.

### `source` mode

```ts
source: { dir: "/path/to/Batch 16", parts: ["viral/v00_cold.mp4", "viral/v01_hook_a.mp4", /* ... */], trim: false, cutawayDir: "jcuts" }
```

- `dir`: absolute folder; `parts`: clip paths relative to `dir`, **in play order**. This replaces the numbered-take scan, so there is no `sourceRoot`/`<id>` folder and no `<n> name.mp4` naming. Each part becomes a take, numbered 1..N in list order (so `sections`, `hookTakes`, `cuts` and `transcriptOverrides` all count parts). A part's label is its file name without extension and must be unique. A missing file fails prep.
- `trim: false` skips silence trimming (default is to trim); audio padding, -16 LUFS normalisation and the A/V guard still apply. `takes.json` lists the parts.
- `cutawayDir` (relative to `dir`): every `.mp4` in it is converted once (HDR to SDR, same encode, untrimmed) to `public/videos/<id>/cutaways/<clip>.mp4`, and `public/videos/<id>/cutaways.json` records each clip's duration. The converted mp4s are git-ignored; re-run `npm run prep -- <id>` on a fresh checkout.
- Run `npm run prep -- <id>` and `npm run transcribe -- <id>` as usual.

### Moment kinds

Each moment has exactly one of `on`/`at`, plus optionally `sfx`. The kinds below, together with `show` and `cameraShake`, are mutually exclusive in one moment, except that `impact` may be combined with `crashZoom` or `cameraShake`. A violation fails the build.

| Field | Meaning |
| --- | --- |
| `cutaway: { file, from, to }` | Muted full-frame insert. `file` is the clip id **without extension** (a name from `cutaways.json`, e.g. `"j_IMG_6162"`); `from`/`to` are seconds **within the clip** (`0 <= from < to`, and `to` must not exceed the clip length). Its length is `to - from`, so `hold` is rejected. The face audio keeps playing underneath. |
| `crashZoom: { scale?, shake? }` or `true` | 4-frame punch-in on the phrase start, snap back at the phrase end (or at `hold` if given). `scale` default **1.35** (must be > 1), `shake` default **false**. Multiplies with the face's punch-in. |
| `impact: "white" \| "black"` | 2-frame full-frame flash at the phrase start. May be combined with `crashZoom` (`{ on: "...", crashZoom: true, impact: "white" }`) or with `cameraShake`. |
| `freeze: { seconds, text }` | Holds the face frame at the phrase start for `seconds` (> 0), **extending the video**, and shows `text` (non-empty) as a big chip over it. The face is muted and the voice pauses (it resumes where it left off), and later moments, titles and caption words shift by the freeze length. `sfx` defaults to `record-scratch`. `hold` is rejected. A freeze cannot start inside a cutaway (the build names both moments). |

Notes:

- Titles, hook chips and graphics are hidden while a cutaway is on screen; titles and hook chips are also hidden during freezes (the freeze chip owns the top band). Captions stay. Cutaways never combine with `show`, render `objectFit: cover`, must fit before the video end, and must not overlap each other. `freeze.text` is at most 16 characters.
- `at:` seconds and `cuts` times are on the source (pre-freeze) timeline; freezes shift everything after them at render time.
- The matcher still needs moments in spoken order; use `at` for beats that are not words.
- `bigNumber(value, label, { prefix: "$" })` and `counter(from, to, label, { prefix: "$" })` take an optional prefix, and large values format with thousands separators.
- `hookTakes` (default 1): the hook chips span takes 1 to `hookTakes`; sections must then target later takes.
- `transcriptOverrides`: pins a take's text when Whisper mishears a short clip (details in the Storyboard reference). w1_viral uses it for the "I don't have money." part.

### Music

```ts
music: { file: "guru-beat.wav", volume: 0.1 }   // file in public/music/, volume in (0, 1], default 0.1
```

The file loops under the whole video; prep fails if it is missing. It ducks to silence (6-frame linear ramps either side) around three kinds of window: every cutaway, every freeze, and every impact (2 frames), each padded by 2 frames and merged when they touch. Voice, SFX and the other moments are never ducked.

`public/music/guru-beat.wav` is a synthesised 140 BPM, 8-bar seamless loop; regenerate it with `npm run music:guru`. The committed file had a separate `loudnorm` ffmpeg pass applied after `music:guru` (the script does not do it), so a regenerated file will be quieter until you re-run that pass. It is a placeholder: swap in a licensed track by dropping a file in `public/music/` and pointing `music.file` at it.

## Cover image

`npm run cover -- <id> [frame]` (e.g. `npm run cover -- v2_ai_b 30`) renders `out/<id>_cover.png` for the platform thumbnail: face and hook chips only, with captions, graphics and SFX hidden and the chips fully in. Default frame is 30. The hook renders larger on covers (box extended down toward 0.60 of the frame height, clear of the face, with chips up to 96 px). It is `remotion still` with props `{"id":"<id>","showZones":false,"cover":true}`; set `cover` in the props panel to preview it in Studio.

## Setting the face box

There is no face detection. Each video can set `faceBox` as fractions of the frame (`x`, `y`, `w`, `h`); the default is `{ x: 0.22, y: 0.36, w: 0.54, h: 0.42 }`. The box is the face proper (brow to chin, cheek to cheek); hair and shoulders may be overlapped by graphics. `y + h` must be at most 0.78 or the build throws, because captions need room below. Two more guards (a high face can instead keep the band for section titles and move the hook with `hookBox`): `y` must be at least 0.13 (title band) and the wider side zone next to the face must be at least 10% of the frame when the video uses any graphic other than a flash card.

Zones derived from it (`src/zones.ts`):

- **top band**: section titles and the hook; shrinks when the face is high.
- **left / right**: beside the face, same height as the face box; big graphics go to the wider side, icon stacks to the other.
- **captions**: starts at the face box bottom + 0.02.
- **platform UI**: bottom 10%, kept clear.

See where they land (Studio: set `showZones` to true in the props panel, or from the CLI):

```
npx remotion still v2-ai-b out/zones.png --frame=100 --props='{"id":"v2_ai_b","showZones":true}'
```

Two optional overrides decouple layout from the face box. `captionY` moves the caption band (its top edge as a fraction of frame height, 0.3 to 0.80); it throws if it sits above the chin line (`faceBox.y + h + 0.02`). `graphicsBox` replaces the primary graphics zone (big numbers, counters, punch lists) with an explicit rectangle that must keep a 0.02 gap from the face and stay clear of the captions and top bands; the 10% width rule still applies. Icon stacks stay in the opposite side zone if it is at least 12% wide, otherwise they share the graphics box. Graphics are left-aligned when the box centre is left of the face centre, else right-aligned. With `showZones` the graphics box is drawn in cyan. `hookBox` places the hook chips in an explicit rectangle instead of the top band; it must lie inside the frame and keep a 0.02 gap from the face box, but may overlap the top band. Chips size to fit the box (56 px at most, never below 36 px; the build throws naming the hook if they would be smaller, so enlarge the box or shorten the chips). Example: `hookBox: { x: 0.50, y: 0.03, w: 0.48, h: 0.19 }`, `captionY: 0.66, graphicsBox: { x: 0.50, y: 0.22, w: 0.45, h: 0.40 }`.

Adjust `faceBox` in the storyboard and re-check. Big numbers and counters shrink when the chosen side zone is narrow, so a tight face box is worth widening before accepting small graphics.

## Captions

Words come from Whisper (`public/videos/<id>/words.json`). Captions are fixed at two lines of at most 13 characters; a group also ends at a sentence end (. ! ?), a pause, or a take boundary. Mis-hearings and brand spellings are fixed in `src/captionFixes.ts`: add `"heard text": "Correct Text"` (lowercase, no punctuation). To re-transcribe a video, delete its `words.json` and run `npm run transcribe -- <id>` again.

## Colour

iPhones record HLG HDR (BT.2020). Compositing standard-colour graphics onto that, or letting the player tone-map it, gives washed-out or over-saturated skin, so every take is converted to BT.709 SDR in prep before Remotion draws anything on it. The conversion uses the LUT `scripts/lut/hlg_to_sdr.cube`, chosen because the installed ffmpeg lacks `zscale`/`tonemap`; the LUT was fitted numerically against how the phone itself displays the footage. The chain (`SDR_FILTER` in `scripts/ffmpeg.ts`) converts to 16-bit full-range RGB, applies the LUT, and goes back to tv-range yuv420p. One thing that went wrong before and must stay fixed: the BT.709 tags are stamped inside the filter chain with `setparams` (prep also sets them on the command line), because `-color_trc` on the command line alone was ignored by ffmpeg 9 and the next stage converted the file a second time (blown whites, magenta skin). Remotion then renders the composite in RGB and encodes its own yuv420p output. To change the look, replace the `.cube` file and re-run `npm run prep` for the videos you want.

## SFX

`public/sfx/*.wav`, 13 names: `slam`, `tick`, `pop`, `whoosh`, `riser`, `thud`, `vine-boom`, `record-scratch`, `bruh`, `xp-error`, `fah`, `boomer`, `quack`. Licences and sources (Kenney CC0 and remotion.media) are in `public/sfx/LICENSE.md`.

## Known limits

- No automatic face detection; set `faceBox` by hand.
- Cutaways are muted and full-frame only; there is no beat sync for music.
- Big numbers and counters get small when the chosen side zone is narrow.

## Local notes

- Any `npm install` on this machine needs `--cache ~/.npm-cache-remotion` (root-owned files in `~/.npm`).
