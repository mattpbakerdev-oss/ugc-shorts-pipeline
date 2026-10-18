import { bigNumber, ctaSaveShare, flashCard, iconStack, punchList, video } from "../storyboard/dsl";

// "4 mistakes killing your reach". Takes: 1 hook, 2-5 tips, 6 close. Centred framing, face high.
export default video({
  id: "v5_mistakes_a",
  // Brow 0.30, chin 0.54, cheeks x 0.33-0.68 (measured at 25 s and 48 s); hair reaches 0.14.
  faceBox: { x: 0.32, y: 0.29, w: 0.37, h: 0.26 },
  captionY: 0.62,
  // Record-button click then dead air at the start of takes 1, 2 and 4 (speech at 2.71 s, 0.85 s, 1.39 s), plus the
  // ~0.3 s of head/tail silence prep leaves on every take, trimmed to ~0.12-0.18 s so each join is about 0.3 s.
  // Measured with silencedetect -35 dB on work/<id>/take_NN.mp4. Beats under 0.5 s inside a take are kept.
  cuts: [
    { take: 1, from: 0, to: 2.55 },
    { take: 1, from: 6.3, to: 6.5 },
    { take: 2, from: 0, to: 0.7 },
    { take: 2, from: 11.08, to: 11.3 },
    { take: 3, from: 0, to: 0.18 },
    { take: 3, from: 9.75, to: 10 },
    { take: 4, from: 0, to: 1.2 },
    { take: 4, from: 10.55, to: 10.733 },
    { take: 5, from: 0, to: 0.18 },
    { take: 5, from: 10.58, to: 10.8 },
    { take: 6, from: 0, to: 0.18 },
    { take: 6, from: 7.95, to: 8.1 },
  ],
  hook: "Getting 200 views? // You're making // one of these",
  sections: [
    { take: 2, title: "1. One platform" },
    { take: 3, title: "2. Random times" },
    { take: 4, title: "3. No text" },
    { take: 5, title: "4. Ignoring comments" },
    { take: 6, title: "Save this" },
  ],
  moments: [
    { at: 0, sfx: "riser" },
    { on: "200 views", show: bigNumber(200, "VIEWS"), sfx: "slam", hold: "until:four mistakes" },
    { on: "one of these", cameraShake: true, sfx: "thud" },
    { on: "four mistakes", show: bigNumber(4, "MISTAKES"), sfx: "slam", hold: 2.5 },
    // Tip 1
    { on: "one platform", show: bigNumber(1, "PLATFORM"), sfx: "slam", hold: "until:TikTok" },
    { on: "TikTok, YouTube, Facebook, and Instagram", show: iconStack(["tt", "yt", "fb", "ig"]), sfx: "pop", hold: 4 },
    { on: "four times", show: bigNumber(4, "X THE REACH"), sfx: "slam", hold: 3 },
    // Tip 2
    { on: "whenever you feel like it", show: punchList(["Whenever you feel like it", "Same time every day"], { pick: 1 }), sfx: "tick", hold: "until:schedule it" },
    { on: "schedule it", show: flashCard("SCHEDULE"), sfx: "thud" },
    { on: "same time every day", emphasis: "pulse" },
    // Tip 3
    { on: "on mute", show: flashCard("MUTE"), sfx: "thud" },
    { on: "captions on", show: punchList(["Captions on"], { pick: 0 }), sfx: "tick", hold: 3 },
    { on: "they scroll", emphasis: "shake" },
    // Tip 4
    { on: "free", emphasis: "pulse" },
    { on: "reply to every single one", show: punchList(["Reply to every one"], { pick: 0 }), sfx: "tick", hold: 4 },
    { on: "with another video", show: punchList(["With another video"], { pick: 0 }), sfx: "tick", stack: true, hold: 3 },
    // Close
    { on: "ahead of 90", show: bigNumber(90, "% OF CREATORS"), sfx: "slam", hold: 2.5 },
    { on: "save this", emphasis: "pulse" },
    { on: "send it to a friend", show: ctaSaveShare(), sfx: "pop" },
  ],
});
