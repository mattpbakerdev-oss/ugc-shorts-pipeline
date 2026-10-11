import { video } from "../storyboard/dsl";

export default video({
  id: "w1_viral",
  source: {
    dir: "/Users/mattdev/Projects/ugc-renderer/takes/Batch 16",
    parts: [
      "viral/v00_cold.mp4",
      "viral/v01_hook_a.mp4",
      "viral/v02b_money.mp4",
      "viral/v03_hook_b.mp4",
      "viral/v04_tip1.mp4",
      "viral/v05_tip2_a.mp4",
      "viral/v06_money.mp4",
      "viral/v07_tip2_b.mp4",
      "viral/v08_tip3_a.mp4",
      "viral/v09_morethanyou.mp4",
      "viral/v10_tip3_b.mp4",
      "viral/v11_close_a.mp4",
      "viral/v02_nomoney.mp4",
      "viral/v13b_close_b.mp4",
      "viral/v14_endflash.mp4",
    ],
    trim: false,
    cutawayDir: "jcuts",
  },
  hook: "$500,000 // + 1M followers // in ONE week",
  sections: [
    { take: 5, title: "1. Stop being slow" },
    { take: 6, title: "2. Reply to everything" },
    { take: 9, title: "3. Make the robots do it" },
    { take: 12, title: "Comment P" },
  ],
  moments: [],
});
