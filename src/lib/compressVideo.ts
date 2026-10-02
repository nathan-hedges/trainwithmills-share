/**
 * In-browser video compression with ffmpeg.wasm (single-threaded core, so it
 * needs NO cross-origin-isolation headers - keeps Google sign-in popups and
 * YouTube thumbnails working). Transcodes to 720p H.264 to shrink phone footage
 * dramatically before it's uploaded to R2.
 *
 * The wasm core (~30 MB) is fetched on first use and the FFmpeg instance is
 * cached for subsequent compressions.
 */
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

const CORE_BASE = "https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd";

let ffmpegPromise: Promise<FFmpeg> | null = null;

function loadFFmpeg(): Promise<FFmpeg> {
  if (!ffmpegPromise) {
    ffmpegPromise = (async () => {
      const ff = new FFmpeg();
      await ff.load({
        coreURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.js`, "text/javascript"),
        wasmURL: await toBlobURL(`${CORE_BASE}/ffmpeg-core.wasm`, "application/wasm"),
      });
      return ff;
    })().catch((e) => {
      ffmpegPromise = null; // allow a retry on next attempt
      throw e;
    });
  }
  return ffmpegPromise;
}

/**
 * Returns a compressed mp4 Blob. Reports 0–100 progress via `onProgress`.
 * Throws if ffmpeg fails to load or transcode (caller should fall back / warn).
 */
export async function compressVideo(file: File, onProgress?: (pct: number) => void): Promise<Blob> {
  const ff = await loadFFmpeg();
  const handler = ({ progress }: { progress: number }) =>
    onProgress?.(Math.min(100, Math.max(0, Math.round(progress * 100))));
  ff.on("progress", handler);

  try {
    await ff.writeFile("input", await fetchFile(file));
    await ff.exec([
      "-i", "input",
      "-vf", "scale=-2:720", // cap height at 720p, keep aspect (width stays even)
      "-c:v", "libx264", "-crf", "28", "-preset", "veryfast",
      "-c:a", "aac", "-b:a", "128k",
      "-movflags", "+faststart", // lets playback start before the whole file loads
      "output.mp4",
    ]);
    const data = await ff.readFile("output.mp4");
    await ff.deleteFile("input").catch(() => {});
    await ff.deleteFile("output.mp4").catch(() => {});
    return new Blob([data as BlobPart], { type: "video/mp4" });
  } finally {
    ff.off("progress", handler);
  }
}
