import { bigNumber, iconStack, video } from "../storyboard/dsl";

export default video({
  id: "v2_ai_b",
  hook: "Not using AI yet? // You're already behind",
  sections: [
    { take: 2, title: "1. Hooks" },
    { take: 3, title: "2. Repurpose" },
    { take: 4, title: "3. Post it" },
    { take: 5, title: "Save this" },
  ],
  moments: [
    { on: "already behind", emphasis: "shake" },
    { on: "10 hook ideas", show: bigNumber(10, "HOOK IDEAS"), sfx: "slam", hold: "until:pick the best one" },
    { on: "YouTube, TikTok, Facebook and Instagram", show: iconStack(["yt", "tt", "fb", "ig"]), sfx: "pop", hold: 3 },
  ],
});
