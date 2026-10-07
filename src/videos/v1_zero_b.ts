import { bigNumber, counter, ctaSaveShare, flashCard, iconStack, punchList, video } from "../storyboard/dsl";

export default video({
  id: "v1_zero_b",
  // Centred framing, mic bottom-right: face (brow to chin, ear to ear) x 0.31-0.74, y 0.34-0.57.
  faceBox: { x: 0.31, y: 0.34, w: 0.43, h: 0.23 },
  captionY: 0.62,
  hook: "Starting from zero? // 5 things // I'd do first",
  sections: [
    { take: 2, title: "1. Post daily for 30 days" },
    { take: 3, title: "2. Win the first 2 seconds" },
    { take: 4, title: "3. Copy formats, not content" },
    { take: 5, title: "4. Text on screen" },
    { take: 6, title: "5. Post everywhere" },
    { take: 7, title: "Save this" },
  ],
  moments: [
    { at: 0, sfx: "riser" },
    { on: "starting from zero", emphasis: "shake" },
    { on: "five things", show: bigNumber(5, "THINGS"), sfx: "slam", hold: 2.5 },
    { on: "30 days", show: bigNumber(30, "DAYS"), sfx: "slam", hold: 3 },
    { on: "first two seconds", show: bigNumber(2, "SECONDS"), sfx: "slam", hold: 2.5 },
    { on: "stop the scroll", emphasis: "pulse" },
    { on: "three viral videos", show: bigNumber(3, "VIRAL VIDEOS"), sfx: "slam", hold: 3 },
    { on: "their structure", show: punchList(["Their structure", "Your own spin"], { pick: 1 }), sfx: "tick", stack: true, hold: 3.5 },
    { on: "on mute", show: flashCard("MUTE"), sfx: "thud" },
    { on: "all platforms at once", emphasis: "pulse" },
    { on: "TikTok, Instagram, YouTube, Facebook", show: iconStack(["tt", "ig", "yt", "fb"]), sfx: "pop", hold: 4 },
    { on: "two minutes instead of 20", show: counter(20, 2, "MINUTES"), sfx: "slam", hold: 3 },
    { on: "no-brainer", emphasis: "pulse" },
    { on: "save this", emphasis: "pulse" },
    { on: "send it to a friend", show: ctaSaveShare(), sfx: "pop" },
  ],
});
