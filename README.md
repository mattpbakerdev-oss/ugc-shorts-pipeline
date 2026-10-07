# UGC shorts pipeline

Turns numbered talking-head takes (iPhone, 9:16) into finished 1080x1920 / 30 fps shorts: silence trimmed, colour-corrected, captioned, with section titles, graphics and sound effects timed to what you say. You write a small storyboard per video; everything else is automatic. Built on Remotion 4.0.534.

Layers, bottom to top (`src/layers/`):

1. **Face**: the takes joined back to back, HLG to SDR through a LUT, with punch-ins and a slow push-in.
2. **Captions**: Whisper word timings grouped into short lines, above the platform UI.
3. **Section titles**: the hook (take 1) and one title per later take.
4. **Graphics**: big numbers, punch lists, icon stacks, counters, flash cards, placed in zones around the face.
5. **SFX**: short sounds fired from storyboard moments.
6. **Zones overlay** (debug only): shows the face box and zones.

Note: any `npm install` on this machine needs `--cache ~/.npm-cache-remotion` (root-owned files in `~/.npm`).

## New video, start to finish

1. Put the takes in a folder named after the video id, e.g. `<sourceRoot>/v4_topic/`, named `<n> <name>.mp4` (`1 hook.mp4`, `2 tip1.mp4`, ...). Take 1 is the hook. Ids use underscores.
2. Prep (trims silence, applies the LUT, writes `public/videos/<id>/` and `takes.json`):
   ```
   npm run prep -- v4_topic [sourceRoot]
   ```
   Without `sourceRoot` it uses the ugc-renderer reposts folder (`/Users/mattdev/Projects/ugc-renderer/reposts/7 Oct - v2 and v3 originals`).
3. Transcribe (writes `public/videos/<id>/words.json`). The first run downloads whisper.cpp 1.5.5 and the medium.en model (about 1.5 GB) into `./whisper/`:
   ```
   npm run transcribe -- v4_topic
   ```
4. Create `src/videos/v4_topic.ts` from the template below.
5. Register it. In `src/videos/index.ts` import it and add it to `storyboards`. In `src/Root.tsx` add a `<Composition>` with a **hyphenated** id (Remotion rejects underscores) and the underscored id in props:
   ```tsx
   <Composition id="v4-topic" component={TalkingHead} durationInFrames={30} fps={30}
     width={1080} height={1920} defaultProps={{ id: "v4_topic", showZones: false }}
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

`src/videos/v2_ai_b.ts` is a full example; `src/videos/v3_plan_a.ts` is a worked example of a different framing (custom `faceBox`).

## Storyboard reference

Types are in `src/types.ts`; helpers in `src/storyboard/dsl.ts`.

**Storyboard**: `id` (underscored, matches the data folder), `faceBox?` (fractions), `hook` (shown on take 1), `sections` (`{ take, title }`, takes numbered from 1; take 1 is the hook so sections start at 2), `moments`.

**Moment** (each needs exactly one of `on` / `at`):

| Field | Meaning |
| --- | --- |
| `on` | Phrase from the transcript; the moment starts when it is said (fuzzy: case, punctuation and number words tolerated). |
| `at` | Seconds from the start of the video, instead of `on`. |
| `show` | A graphic (below). Omit for sfx-only or emphasis moments. |
| `emphasis` | `"shake"`, `"pulse"` or `"flash"` on the captions at that word. Lasts the matched phrase's duration. |
| `sfx` | `slam`, `tick`, `pop`, `whoosh`, `riser`, `thud`. |
| `hold` | How long the graphic stays: seconds, or `"until:<phrase>"`. |
| `stack` | `true` appends the graphic below the previous one in the same zone. |

**Rules that bite**

- List moments in **spoken order**. The matcher's cursor only moves forward, so an out-of-order phrase fails to match.
- A repeated identical phrase means its next occurrence.
- `until:<phrase>` must be said **after** the moment starts, or the build errors.
- A later graphic in the same zone cuts the earlier one short, unless the later one has `stack: true`.
- A phrase that is not found fails the build with the missing phrase named.
- Any "Postiz" in a moment (phrase, hold, or graphic text) is rejected by the validator. Do not amplify the brand in graphics; captions are separate.
- `//` in `hook` or a section title is a line break.

**Finding retakes (`npm run bloopers -- <id>`)**

Reads `takes.json` and `words.json`, and flags any 3-word phrase that is repeated within 4 seconds (a retake). It proposes cutting the first attempt, and prints a table plus a ready-to-paste `cuts: [...]` block with take-local seconds. Restarts that straddle a take boundary are skipped with a warning. These are proposals: check each against the transcript before pasting.

**Graphics**

| Helper | Zone | Default hold |
| --- | --- | --- |
| `bigNumber(value, label)` | wider side of the face (`left` unless the right is clearly wider) | 3 s |
| `punchList(items, { pick?, strike? })` | same | 4 s |
| `counter(from, to, label)` | same | 3 s |
| `iconStack(["yt","tt","fb","ig"])` | the other side, if at least 0.12 wide, else the same side | 3 s |
| `flashCard(word)` | full frame | 3 frames |
| emphasis only | captions | the matched phrase's duration |

`punchList`: `pick` is the index of the chosen item (ticked); every other item is struck through unless you pass `strike` (indices) explicitly. Icons: `tt`, `ig`, `yt`, `fb`.

`hold` forms: a number of seconds, `"until:<phrase>"`, or omitted for the default above.

## Setting the face box

There is no face detection. Each video can set `faceBox` as fractions of the frame (`x`, `y`, `w`, `h`); the default is `{ x: 0.22, y: 0.36, w: 0.54, h: 0.42 }`. The box is the face proper (brow to chin, cheek to cheek); hair and shoulders may be overlapped by graphics. `y + h` must be at most 0.78 or the build throws, because captions need room below. Two more guards: `y` must be at least 0.13 (title band) and the wider side zone next to the face must be at least 10% of the frame when the video uses any graphic other than a flash card.

Zones derived from it (`src/zones.ts`):

- **top band**: section titles and the hook; shrinks when the face is high.
- **left / right**: beside the face, same height as the face box; big graphics go to the wider side, icon stacks to the other.
- **captions**: starts at the face box bottom + 0.02.
- **platform UI**: bottom 10%, kept clear.

See where they land (Studio: set `showZones` to true in the props panel, or from the CLI):

```
npx remotion still v2-ai-b out/zones.png --frame=100 --props='{"id":"v2_ai_b","showZones":true}'
```

Adjust `faceBox` in the storyboard and re-check. Big numbers and counters shrink when the chosen side zone is narrow, so a tight face box is worth widening before accepting small graphics.

## Captions

Words come from Whisper (`public/videos/<id>/words.json`). Mis-hearings and brand spellings are fixed in `src/captionFixes.ts`: add `"heard text": "Correct Text"` (lowercase, no punctuation). To re-transcribe a video, delete its `words.json` and run `npm run transcribe -- <id>` again.

## Colour

iPhone footage is HLG HDR; it is converted to SDR with the LUT `scripts/lut/hlg_to_sdr.cube`, applied in prep. The LUT route was chosen because the installed ffmpeg lacks `zscale`/`tonemap`. Background and rationale: the "Colour: iPhone HDR footage" section of the old ugc-renderer README (`/Users/mattdev/Projects/ugc-renderer/README.md`). To change the look, replace that `.cube` file and re-run `npm run prep` for the videos you want.

## SFX

`public/sfx/*.wav`: `slam`, `tick`, `pop`, `whoosh`, `riser`, `thud`. Licences and sources (Kenney CC0 and remotion.media) are in `public/sfx/LICENSE.md`.

## Known limits

- No automatic face detection; set `faceBox` by hand.
- No music track.
- No screen-recording cutaways.
- Big numbers and counters get small when the chosen side zone is narrow.
