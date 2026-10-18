import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";

const run = promisify(execFile);

const LUT = path.resolve(__dirname, "lut/hlg_to_sdr.cube").replace(/\\/g, "/").replace(/:/g, "\\:");

/** Same chain as ugc-renderer/ugc/video.py sdr_filter(): fitted LUT, composite-safe tags. */
export const SDR_FILTER =
  "scale=in_color_matrix=bt2020:in_range=tv:out_range=pc:flags=accurate_rnd+full_chroma_int," +
  `format=gbrp16le,lut3d=file=${LUT}:interp=tetrahedral,` +
  "scale=out_color_matrix=bt709:out_range=tv,format=yuv420p," +
  "setparams=color_primaries=bt709:color_trc=bt709:colorspace=bt709:range=tv";

export const ffmpeg = async (args: string[]): Promise<{ stdout: string; stderr: string }> => {
  try {
    return await run("ffmpeg", ["-hide_banner", "-nostdin", "-y", ...args], { maxBuffer: 64 * 1024 * 1024 });
  } catch (err) {
    const e = err as { stderr?: string; message: string };
    throw new Error(`ffmpeg ${args.join(" ")}\n${e.stderr ?? e.message}`);
  }
};

export type Probe = { width: number; height: number; fps: number; duration: number; colorTrc: string; rotation: number };

export const probe = async (file: string): Promise<Probe> => {
  const { stdout } = await run("ffprobe", [
    "-v", "error",
    "-select_streams", "v:0",
    "-show_entries", "stream=width,height,r_frame_rate,color_transfer:stream_side_data=rotation:format=duration",
    "-of", "json",
    file,
  ]);
  const j = JSON.parse(stdout) as {
    streams: { width: number; height: number; r_frame_rate: string; color_transfer?: string; side_data_list?: { rotation?: number }[] }[];
    format: { duration: string };
  };
  const s = j.streams[0];
  const [n, d] = s.r_frame_rate.split("/").map(Number);
  return {
    width: s.width,
    height: s.height,
    fps: n / d,
    duration: Number(j.format.duration),
    colorTrc: s.color_transfer ?? "unknown",
    rotation: s.side_data_list?.find((d) => d.rotation !== undefined)?.rotation ?? 0,
  };
};

/** Per-stream durations (seconds); audio is null when the file has no audio stream. */
export const streamDurations = async (file: string): Promise<{ video: number; audio: number | null }> => {
  const { stdout } = await run("ffprobe", [
    "-v", "error", "-show_entries", "stream=codec_type,duration", "-of", "json", file,
  ]);
  const j = JSON.parse(stdout) as { streams: { codec_type: string; duration?: string }[] };
  const dur = (t: string) => {
    const s = j.streams.find((x) => x.codec_type === t);
    return s?.duration !== undefined ? Number(s.duration) : null;
  };
  const video = dur("video");
  if (video === null) throw new Error(`${file} has no video stream duration`);
  return { video, audio: dur("audio") };
};
