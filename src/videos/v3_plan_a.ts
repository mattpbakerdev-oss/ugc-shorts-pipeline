import { bigNumber, counter, flashCard, iconStack, punchList, video } from "../storyboard/dsl";

export default video({
  id: "v3_plan_a",
  hook: "33 followers → 1,000 // my 5-step plan",
  // Chin sits ~0.49 of frame height; default bottom (0.78) would push captions too low.
  faceBox: { x: 0.2, y: 0.36, w: 0.56, h: 0.3 },
  sections: [
    { take: 2, title: "1. One topic" },
    { take: 3, title: "2. Engage" },
    { take: 4, title: "3. Reply with video" },
    { take: 5, title: "4. Post everywhere" },
    { take: 6, title: "5. Watch time" },
    { take: 7, title: "Save this" },
  ],
  moments: [
    { at: 0, sfx: "riser" },
    { on: "33 followers", show: counter(33, 1000, "FOLLOWERS"), sfx: "slam", hold: "until:five things" },
    { on: "five things", show: bigNumber(5, "THINGS"), sfx: "slam", hold: 2.5 },
    { on: "whole month", show: bigNumber(30, "DAYS, ONE TOPIC"), sfx: "slam", hold: 3 },
    { on: "content creation tips", show: punchList(["Content creation tips"], { pick: 0 }), sfx: "tick", hold: 3 },
    { on: "liking and I'm commenting", show: punchList(["Like", "Comment", "Repeat"]), sfx: "tick", hold: 4 },
    { on: "reply with video", show: flashCard("REPLY"), sfx: "thud" },
    { on: "hook is really written", emphasis: "pulse" },
    { on: "posting everywhere", show: bigNumber(4, "CHANNELS"), sfx: "slam", hold: "until:four channels" },
    { on: "TikTok, Facebook, Instagram and YouTube", show: iconStack(["tt", "fb", "ig", "yt"]), sfx: "pop", hold: 4 },
    { on: "four times", emphasis: "shake" },
    { on: "watch time", show: punchList(["Likes", "Watch time"], { pick: 1 }), sfx: "tick", hold: 4 },
    { on: "save this", emphasis: "pulse" },
  ],
});
