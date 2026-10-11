# Comedy meme edit (w1_viral) — design

Date: 2026-10-11. Project `/Users/mattdev/Projects/UGC`. Extends the talking-head pipeline (see the 2026-10-07 spec) with the building blocks for a meme-cut comedy edit, then remakes `w1_viral` ("$500,000 + 1M followers in ONE week", garden fake-guru video) with them.

## Decisions with Matt
| Topic | Decision |
|---|---|
| Style | Meme-cut: crash zooms, impact frames, freeze-frames with captions, meme SFX, hard cutaways. |
| Backbone | Same assembly as the old edit: the 15 hand-trimmed clips in `takes/Batch 16/viral/`, same order, same nine cutaway moments (tweakable). |
| Music | A cheesy royalty-free "guru" trap bed from Pixabay at ~10 %, ducked to silence under cutaways/freezes/impacts. |
| SFX | Remotion's public meme set (royalty-free, no attribution) added to `public/sfx/`. |
| Build | Extend the pipeline generically (reusable), not a one-off composition. |
| Brand | Unchanged: the spoken Postiz lines stay, no product graphics. |

## Source
- Parts (play order): `v00_cold, v01_hook_a, v02b_money, v03_hook_b, v04_tip1, v05_tip2_a, v06_money, v07_tip2_b, v08_tip3_a, v09_morethanyou, v10_tip3_b, v11_close_a, v02_nomoney, v13b_close_b, v14_endflash` from `/Users/mattdev/Projects/ugc-renderer/takes/Batch 16/viral/`. All 1080×1920 30 fps SDR.
- Cutaway footage: `/Users/mattdev/Projects/ugc-renderer/takes/Batch 16/jcuts/j_IMG_*.mp4` (12 clips, 10 s–64 s each).
- Old cutaway list (phrase → clip:start–end s): slow → 6162:8.3–8.9; reply → 6163:6.85–7.45; other people's → 6162:6.0–6.6; know who → 6161:52.0–52.6; Claude → 6157:13.7–14.3; wasting → 6158:8.6–9.2; I've got time → 6161:33.5–34.1; get Postiz → 6163:10.0–10.6; all done → 6157:3.0–3.5.
- Old transcript (for phrases): "This is how I make $500,000 Money. And 1 million followers in one week. If you're a bit slow, stop watching. Second thing I do is that you've got to reply to all your comments and you've got to like and comment on other people's posts because if you don't do that, no one's going to know who you are. The last thing I do is that I go and connect Postiz to my Claude so I can schedule all my content for me because I don't have time to be wasting scheduling my own posts. I've got time and that time is for money making money, not scheduling posts. And then building on top of the last point, time is money, right? I just realized I make more money than you. So I don't have time to write captions, so I get Postiz to do all of that for me and it's all done. If you want to know the rest, if you want a free use of this tool I used to make $500,000, I don't have money. Comment P and I'll send it to you."

## Storyboard additions
```ts
source?: { dir: string; parts: string[]; trim?: boolean; cutawayDir?: string }  // parts in play order; trim defaults true
music?: { file: string; volume?: number }                                        // public/music/<file>, default volume 0.1
// new moment fields (mutually exclusive with `show`):
cutaway?: { file: string; from: number; to: number }   // clip id without extension; seconds within the clip; muted full-frame insert
crashZoom?: { scale?: number; shake?: boolean }         // default 1.35, 4-frame punch-in on the phrase start, snap back at phrase end (or `hold`)
impact?: "white" | "black"                              // 2-frame full-frame flash at the phrase start
freeze?: { seconds: number; text: string }              // freeze the frame, extend the timeline, big caption, record scratch
```
- New sfx names: `vine-boom, record-scratch, bruh, xp-error, fah, boomer, quack` (files in `public/sfx/`).
- `bigNumber`/`counter` accept a `prefix` ("$") and large values format with thousands separators.

## Prep
- `source.parts` replaces the numbered-take scan: parts are converted/joined in order; with `trim: false` no silence trimming (audio padding, loudness and the A/V guard still apply). `takes.json` lists the parts.
- Cutaway clips are converted once to `public/videos/<id>/cutaways/<id>.mp4` (same encode settings) so Remotion can seek them.
- Music file copied to `public/music/`.

## Resolver
- Timeline expansion: freezes insert `seconds·fps` frames at their start; every later moment, section boundary and caption word shifts by the accumulated freeze length; the face video pauses (Remotion `Freeze`) during a freeze.
- Cutaway → zone `full`, hold = clip range length; must not overlap a freeze; range must fit inside the clip (probe at prep → `cutaways.json` with durations).
- crashZoom/impact → no zone, they attach to the face layer; music ducking windows = union of cutaways, freezes, impacts (±2 frames).

## Layers
- Face layer gains: crash-zoom scale (multiplied with punch-in), freeze (via `<Freeze>`), impact overlay.
- New `Cutaways` layer above Face: muted `<Video>` of the cutaway clip trimmed to the range, full frame.
- `Freeze` caption: big accent chip (text from the moment) centred over the frozen frame.
- Music layer: `<Audio>` loop at `volume` with `interpolate` dips to 0 across ducking windows (6-frame ramps).

## This video's storyboard (draft, Matt reviews before render)
Hook chips "$500,000 // + 1M followers // in ONE week" over parts 1–4; sections "1. Stop being slow" (part 5), "2. Reply to everything" (6), "3. Make the robots do it" (9), "Comment P" (12). Moments: riser; crashZoom + `bigNumber("$500,000")` on "$500,000"; `counter(0, 1_000_000, "FOLLOWERS")` on "1 million"; impact + vine-boom on "stop watching"; the nine cutaways with record-scratch/bruh/quack where they land; freeze "WAIT, WHAT?" on "I make more money than you"; crashZoom on "money making money"; icon stack on "all your comments"? (no — keep to the kit where it fits); "Comment P" chip + save/share on the close; xp-error on "I don't have money".

## Testing
Vitest: part timeline → frames; cutaway resolution and range check; freeze expansion shifting later moments/sections/words; ducking windows; prefix/large-number formatting. Stills at every moment; one render; Matt reviews with timestamps.

## Out of scope
Re-cutting from the raw `w_IMG_*` takes; automatic joke detection; music beat-sync.
