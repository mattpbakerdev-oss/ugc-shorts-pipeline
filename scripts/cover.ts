import { spawnSync } from "node:child_process";

const [id, frameArg] = process.argv.slice(2);
if (!id) {
  console.error("Usage: npm run cover -- <id> [frame]");
  process.exit(1);
}
const frame = frameArg ?? "30";
if (!/^\d+$/.test(frame)) {
  console.error(`Frame must be a non-negative integer, got "${frame}"`);
  process.exit(1);
}
const out = `out/${id}_cover.png`;
const props = JSON.stringify({ id, showZones: false, cover: true });
const r = spawnSync("npx", ["remotion", "still", id.replace(/_/g, "-"), out, `--frame=${frame}`, `--props=${props}`], { stdio: "inherit" });
if (r.status !== 0) process.exit(r.status ?? 1);
console.log(out);
