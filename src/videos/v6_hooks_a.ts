import { bigNumber, counter, ctaSaveShare, flashCard, punchList, video } from "../storyboard/dsl";

// "Nobody watches past 3 seconds? 4 fixes". Takes: 1 hook, 2-5 tips, 6 close. Centred framing, face high.
export default video({
  id: "v6_hooks_a",
  // Brow 0.30, chin 0.53, cheeks x 0.32-0.68 (measured at 20 s and 36 s); hair reaches 0.14.
  faceBox: { x: 0.31, y: 0.29, w: 0.38, h: 0.26 },
  captionY: 0.62,
  // Head/tail silence on every take (prep leaves ~0.3 s): heads trimmed to ~0.15 s, tails to 0.2 s (the transcriber
  // needs >= 0.15 s of trailing silence to measure the speech end, or Whisper's stretched last words get dropped).
  // Also the false start "Fix three," + 1.8 s pause at the top of take 4, the click + 1.3 s dead air on take 5, and
  // the stop-recording click after "guys" on take 6. Measured with silencedetect -35 dB on work/<id>/take_NN.mp4.
  cuts: [
    { take: 1, from: 0, to: 0.5 },
    { take: 1, from: 4.94, to: 5.1 },
    { take: 2, from: 0, to: 0.3 },
    { take: 2, from: 8.38, to: 8.533 },
    { take: 3, from: 0, to: 0.18 },
    { take: 3, from: 7.47, to: 7.633 },
    { take: 4, from: 0, to: 2.42 },
    { take: 4, from: 9.13, to: 9.3 },
    { take: 5, from: 0, to: 1.16 },
    { take: 5, from: 10.23, to: 10.4 },
    { take: 6, from: 0, to: 0.3 },
    { take: 6, from: 5.92, to: 5.96 },
  ],
  // Take 3: "Fix two" heard as "Fix too". Take 6: Whisper hears "Thank you guys" in the breath after the final
  // "guys"; it starts inside the real word, so no silence rule catches it.
  transcriptOverrides: [
    { take: 3, replace: { too: "two" } },
    { take: 6, drop: ["thank"] },
  ],
  hook: "Scrolled past // in 3 seconds? // 4 fixes",
  sections: [
    { take: 2, title: "1. Result first" },
    { take: 3, title: "2. Words on frame one" },
    { take: 4, title: "3. Cut the first second" },
    { take: 5, title: "4. One idea" },
    { take: 6, title: "Save this" },
  ],
  moments: [
    { at: 0, sfx: "riser" },
    { on: "3 seconds", crashZoom: true, impact: "white", sfx: "slam" },
    { on: "seconds", show: bigNumber(3, "SECONDS"), hold: "until:four things" },
    { on: "four things", show: bigNumber(4, "FIXES"), sfx: "slam", hold: 2.5 },
    // Tip 1
    { on: "say the result first", show: punchList(["Hey guys, today...", "The result"], { pick: 1 }), sfx: "tick", hold: "until:33" },
    { on: "33 to 1000 followers", show: counter(33, 1000, "FOLLOWERS"), sfx: "slam", hold: 3 },
    // Tip 2
    { on: "words on the first frame", emphasis: "pulse" },
    { on: "thumbnail", show: flashCard("THUMBNAIL"), sfx: "thud" },
    // Tip 3
    { on: "cut the first second", show: bigNumber(1, "SECOND, GONE"), sfx: "slam", hold: 3 },
    { on: "first real word", show: punchList(["Your face appearing", "First real word"], { pick: 1 }), sfx: "tick", hold: 4 },
    // Tip 4
    { on: "one idea", show: bigNumber(1, "IDEA"), sfx: "slam", hold: 4 },
    { on: "five different things", show: punchList(["Five different things"], { strike: [0] }), sfx: "tick", stack: true, hold: 3 },
    // Close
    { on: "stay", emphasis: "pulse" },
    { on: "save this", emphasis: "pulse" },
    { on: "send it to a friend", show: ctaSaveShare(), sfx: "pop" },
    { on: "hey guys", emphasis: "shake" },
  ],
});
