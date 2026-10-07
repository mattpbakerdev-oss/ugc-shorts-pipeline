import { bigNumber, ctaSaveShare, flashCard, iconStack, punchList, video } from "../storyboard/dsl";

export default video({
  id: "v4_ai_a",
  // Desk shot, face centre-left and close: brow 0.37, chin 0.60, cheeks x 0.22-0.68; hand/room to the right.
  faceBox: { x: 0.22, y: 0.37, w: 0.46, h: 0.23 },
  captionY: 0.66,
  graphicsBox: { x: 0.71, y: 0.24, w: 0.25, h: 0.36 },
  hook: "Post a week // of content // in 5 minutes",
  sections: [
    { take: 2, title: "1. AI writes 10 hooks" },
    { take: 3, title: "2. One take" },
    { take: 4, title: "3. AI writes captions" },
    { take: 5, title: "4. Schedule the lot" },
    { take: 6, title: "Save this" },
  ],
  moments: [
    { at: 0, sfx: "riser" },
    { on: "wasting hours", emphasis: "shake" },
    { on: "10 hooks", show: bigNumber(10, "HOOKS"), sfx: "slam", hold: "until:30 seconds" },
    { on: "I choose one", show: punchList(["Hook A", "Hook B", "Hook C"], { pick: 1 }), sfx: "tick", stack: true, hold: "until:30 seconds" },
    { on: "30 seconds", show: bigNumber(30, "SECONDS"), sfx: "slam", hold: 2.5 },
    { on: "in one take", show: flashCard("ONE TAKE"), sfx: "thud" },
    { on: "writes captions", show: punchList(["Caption 1", "Caption 2", "Caption 3"]), sfx: "tick", hold: 3.5 },
    { on: "post at 8pm", show: punchList(["Post at 8pm"], { pick: 0 }), sfx: "tick", hold: 3 },
    { on: "all of my channels", show: iconStack(["tt", "ig", "yt", "fb"]), sfx: "pop", hold: 3.5 },
    { on: "hit approve", show: punchList(["Approve"], { pick: 0 }), sfx: "tick", hold: 2 },
    { on: "nothing else to do", emphasis: "pulse" },
    { on: "save this", emphasis: "pulse" },
    { on: "send it to somebody", show: ctaSaveShare(), sfx: "pop" },
  ],
});
