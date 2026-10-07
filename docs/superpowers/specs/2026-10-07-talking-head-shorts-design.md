# Talking-head shorts in Remotion — design

Date: 2026-10-07
Project: `/Users/mattdev/Projects/UGC` (Remotion 4, Blank template, `remotion-best-practices` skill installed)

## Goal

Remake the two previously published UGC videos, `v2_ai_b` and `v3_plan_a`, from their raw
takes with a clearly better visual treatment: animated captions under the chin, bold
pop-up graphics that illustrate what is being said, and punchy cuts. The videos are being
re-posted from new, warmed-up accounts, so they must not read as a Postiz advert.

The project replaces the Python/ffmpeg `ugc-renderer` pipeline for this style of video.
It must be reusable for future recordings with different framing.

## Decisions made with Matt

| Topic | Decision |
|---|---|
| Build tool | Everything in Remotion, fresh project. Only ffmpeg for take prep. |
| Postiz branding | Keep the spoken mentions; do not amplify. No logo, no product screenshots, no CTA to it. Caption shows the word plainly. |
| Caption style | **Word pop**: 2–4 uppercase words, no box, spoken word highlighted and scaled. |
| Graphics style | **Bold kinetic**: slam-in numbers, punch lists, icon stacks, emphasis shakes. |
| Face | Must stay clear. Graphics are confined to zones derived from a per-video face box. |
| Colours | Accent ice blue `#4DE1FF`, ink navy `#0A1630`, text white. |
| Section titles | Pinned pill in the top band per take; hook text on the hook take. |
| v3 handwritten cards | Dropped. Numbers/titles announce sections instead. |
| Cuts | Alternate 100 % / 108 % punch-in on each take boundary plus a graphic slam on the same frame. No whoosh transitions. |
| Sound | SFX on graphics only, CC0 kit sourced from Pixabay/Freesound and auditioned by Matt. No music. Captions silent. |

## Source material

`/Users/mattdev/Projects/ugc-renderer/reposts/7 Oct - v2 and v3 originals/`

- `v2_ai_b/`: `1 hook_b.mp4`, `2 tip1.mp4`, `3 tip2.mp4`, `4 tip3.mp4`, `5 close.mp4` (~48 s total)
- `v3_plan_a/`: `1 hook_a.mp4`, `2 tip1.mp4` … `6 tip5.mp4`, `7 close.mp4` (~89 s total)

All takes are iPhone 1080×1920, 30 fps, HLG HDR (`arib-std-b67`). Each has ~1 s of
silence at the start and end. Chin sits at roughly 70–75 % of frame height; Matt sits
slightly right of centre; a mic occupies the bottom-right corner.

Transcripts of both videos exist in `ugc-renderer/work/<id>/transcript_*.json` and are
quoted in the storyboard drafts.

## Pipeline

One video goes through four steps. Steps 1–2 run once and cache; step 3 is the iteration loop.

### 1. Prep (`npm run prep -- <id>`)

`scripts/prep.ts`, Node + ffmpeg.

- Reads the numbered takes from the source folder (configurable path, default the
  `reposts` folder above).
- Converts each take HLG → BT.709 SDR. Use ffmpeg's `zscale`/`tonemap` if the installed
  ffmpeg has them; otherwise reuse the fitted 3D LUT approach from `ugc-renderer/ugc/hlg_lut.py`
  (`lut3d` filter), which is known to look right on this footage. The choice is made once
  and recorded in the README.
- Trims leading/trailing silence from each take (silence detection on the audio, with a
  small pad), then concatenates in filename order.
- Writes `public/videos/<id>/face.mp4` (1080×1920, 30 fps, H.264, AAC) and
  `public/videos/<id>/takes.json`:

  ```json
  { "fps": 30, "takes": [ { "file": "1 hook_b.mp4", "startFrame": 0, "endFrame": 141 }, … ] }
  ```

- Fails loudly if a take is not 1080×1920 or 30 fps.

### 2. Transcribe (`npm run transcribe -- <id>`)

`scripts/transcribe.ts`, using `@remotion/install-whisper-cpp` with a medium English
model, word-level timestamps.

- Input: audio extracted from `face.mp4`.
- Output: `public/videos/<id>/words.json`:

  ```json
  { "words": [ { "text": "If", "startFrame": 12, "endFrame": 15 }, … ] }
  ```

- Applies `src/captionFixes.ts` (a word → replacement map, case-insensitive) to correct
  brand and niche words, mirroring `CAPTION_FIXES` in the old pipeline.
- Prints the full transcript to the terminal so mis-hearings are visible immediately.

### 3. Storyboard (`src/videos/<id>.ts`)

A typed TypeScript file per video, written by Claude from the transcript and edited by
Matt. Example shape:

```ts
export default video({
  id: "v2_ai_b",
  faceBox: { x: 0.33, y: 0.22, w: 0.42, h: 0.52 },   // optional, fractions of frame; default in zones.ts
  hook: "Not using AI yet? // You're already behind",
  sections: [
    { take: 2, title: "1. Hooks" },
    { take: 3, title: "2. Repurpose" },
    { take: 4, title: "3. Post it" },
  ],
  moments: [
    { on: "10 hook ideas", show: bigNumber(10, "HOOK IDEAS"), sfx: "slam", hold: "until:pick the best one" },
    { on: "pick the best one", show: punchList(["Why nobody watches", "Stop doing this", "You're already behind"], { pick: 2 }), sfx: "tick" },
    { on: "YouTube, TikTok, Facebook and Instagram", show: iconStack(["yt", "tt", "fb", "ig"]), sfx: "pop", hold: 3 },
    { on: "already behind", emphasis: "shake" },
  ],
});
```

Semantics:

- `on` is a spoken phrase. Resolved against `words.json` with fuzzy matching (number
  words ↔ digits, punctuation and case ignored, first occurrence after the previous
  moment). The moment starts at the first word's `startFrame`. **A phrase that cannot be
  found fails the build with a message naming it.**
- `at` (seconds) may be used instead of `on` when no phrase fits.
- `hold` is seconds, `until:<phrase>`, or omitted for the component's default.
- `emphasis` applies an effect to the caption group containing the phrase (`shake`,
  `pulse`, `flash`) instead of adding a graphic.
- `sections` map takes to pinned titles. The hook take shows `hook` instead. `//` in a
  title forces a line break.
- No moment may reference the word "Postiz"; the storyboard validator rejects it.

### 4. Render

`npx remotion render <id>` → `out/<id>.mp4`, 1080×1920, 30 fps, H.264 high profile,
CRF ~18, AAC 192 k. `npm run dev` opens Remotion Studio for live preview.

## Composition

A single composition `TalkingHead` with props `{ id }`. Duration and all timings come
from `takes.json`, `words.json` and the storyboard, resolved in `calculateMetadata`.

Layers, bottom to top:

1. **Face** — `OffthreadVideo` of `face.mp4`. Punch-in: takes alternate 100 % / 108 %
   scale, switching on each take boundary from `takes.json`. The hook take additionally
   has a slow 2 % push-in across its length. Scale origin is the centre of the face box.
2. **Captions** — word pop. Groups of 2–4 words built from `words.json` (max ~18
   characters per line, max two lines). Montserrat Black, uppercase, white, navy
   `#0A1630` outline + drop shadow, centred horizontally, vertical centre at the caption
   zone. Each group springs in (scale 0.9 → 1, ~6 frames). The currently spoken word is
   ice blue `#4DE1FF`, scaled to 118 % with a 3-frame overshoot. A group holds up to
   1 s after its last word during a pause, then exits.
3. **Section title** — slanted (−2°) ice-blue pill with navy Montserrat Black text in
   the top band, springing in on the take's first frame and out on its last. Hook text
   on the hook take.
4. **Graphics** — bold kit components, each taking `{ enterFrame, exitFrame, zone }`:
   - `BigNumber` — number + small label, rotated −6°, slams in (scale 1.6 → 1 with
     overshoot, 8 frames), left zone.
   - `PunchList` — items appear one per ~8 frames, skewed −6°, navy chips with ice-blue
     text; supports `strike` and `pick` states; left zone under the number.
   - `IconStack` — platform tiles (TikTok, Instagram, YouTube, Facebook) as simple
     drawn glyphs, not brand logos; stack in the right zone with staggered pops.
   - `Counter` — rolling-digit number, e.g. 33 → 1,000, left zone.
   - `WordShake` — caption emphasis effects (`shake`, `pulse`, `flash`).
   - `FlashCard` — 2-frame full-frame ice-blue flash with one word, for the biggest
     beats; the only component allowed to cover the face, and only for ≤ 3 frames.
5. **SFX** — each moment's `sfx` name maps to a file in `public/sfx/`; an `<Audio>`
   is placed at the moment's enter frame. Face audio passes through unchanged.

## Zones

`src/zones.ts` exports a function `zonesFor(faceBox)` returning rectangles (fractions of
frame):

- `topBand` — fixed, y 0.03–0.22, x 0.06–0.94.
- `face` — the input face box (default `{ x: 0.33, y: 0.22, w: 0.42, h: 0.52 }`).
- `left` — from x 0.03 to `face.x − 0.02`, y spanning the face box.
- `right` — from `face.x + face.w + 0.02` to x 0.97, same y.
- `captions` — y starts at `face.y + face.h + 0.02`, height 0.12, full width with 4 % margins.
- `platformUi` — bottom 12 %, reserved; nothing is placed there.

Graphics are positioned by zone name. A dev-only **zones overlay** (toggle via a
composition prop in Studio) draws the rectangles so a new video's face box can be
checked by eye. Automatic face detection is deliberately left for later; `takes.json`
has room for a `faceBox` field the prep step could fill in.

## Palette and type

- Accent `#4DE1FF`, ink `#0A1630`, text `#FFFFFF`. Defined once in `src/theme.ts`.
- Montserrat Black (900) for captions, titles and numbers; Inter 800 for list items.
  Fonts loaded with `@remotion/google-fonts`.

## Testing

Vitest unit tests for the pure logic:

- phrase matching (`findPhrase(words, "10 hook ideas")` finds "ten hook ideas"; missing
  phrase throws with the phrase in the message; occurrences are consumed in order),
- caption grouping (2–4 words, line-length cap, no group spans a take boundary),
- punch-in schedule from `takes.json`,
- `zonesFor` derivation (zones never overlap the face box; captions sit below it),
- storyboard validation (rejects "Postiz" references, rejects unknown sfx names).

Visual checks: `npx remotion still` at each moment's enter frame + 6 frames, reviewed
before handing over a render. End-to-end: render `v2_ai_b` first (shorter), review,
then `v3_plan_a`.

## Errors

Build fails with a clear message for: storyboard phrase not found; take missing or
wrong resolution/fps; sfx file missing; graphic placed outside its zone; `words.json`
or `takes.json` missing (with the command to generate it).

## Out of scope (this round)

Automatic face detection; music beds; Postiz/Claude screen-recording cutaways from
the old pipeline; the no-camera `render.py` style; the v3 handwritten card clips.

## Deliverables

- `out/v2_ai_b.mp4` and `out/v3_plan_a.mp4` in the new style.
- The reusable project: prep and transcribe scripts, `TalkingHead` composition, bold
  graphics kit, zones, theme, CC0 SFX kit in `public/sfx/` with a licence note.
- `README.md` covering: prep, transcribe, write a storyboard, set the face box, render.
