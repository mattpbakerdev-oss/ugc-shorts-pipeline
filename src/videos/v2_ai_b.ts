import { bigNumber, ctaSaveShare, iconStack, punchList, video } from "../storyboard/dsl";

export default video({
  id: "v2_ai_b",
  hook: "Not using AI yet? // You're already // behind.",
  sections: [
    { take: 2, title: "1. Hooks" },
    { take: 3, title: "2. Repurpose" },
    { take: 4, title: "3. Post it" },
    { take: 5, title: "Save this" },
  ],
  moments: [
    { at: 0, sfx: "riser" },
    { on: "already behind", emphasis: "shake" },
    { on: "three ways", show: bigNumber(3, "WAYS I USE AI"), sfx: "slam", hold: 2.5 },
    { on: "10 hook ideas", show: bigNumber(10, "HOOK IDEAS"), sfx: "slam", hold: "until:30 seconds" },
    { on: "pick the best one", show: punchList(["Why nobody watches", "Stop doing this", "You're already behind"], { pick: 2 }), sfx: "tick", stack: true, hold: "until:30 seconds" },
    { on: "30 seconds", show: bigNumber(30, "SECONDS"), sfx: "slam", hold: 2.5 },
    { on: "one idea becomes", show: punchList(["Video", "Carousel", "Caption"]), sfx: "tick", hold: 4 },
    { on: "rewrite it for each format", emphasis: "pulse" },
    { on: "YouTube, TikTok, Facebook and Instagram", show: iconStack(["yt", "tt", "fb", "ig"]), sfx: "pop", hold: 4 },
    { on: "hit approve", show: punchList(["Approve"], { pick: 0 }), sfx: "tick", hold: 2 },
    { on: "save this", emphasis: "pulse" },
    { on: "send it to your friend", show: ctaSaveShare(), sfx: "pop" },
  ],
});
