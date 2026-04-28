import { execFile } from "child_process";
import { stat } from "fs/promises";
import { unlinkBestEffort } from "./fs-best-effort.js";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

/** Ignore empty/trivial files so deleted or truncated thumbnails are regenerated. */
const MIN_VIDEO_THUMB_BYTES = 64;

function logFfmpegFailure(err: unknown, label: string): void {
  if (typeof err !== "object" || err === null) {
    console.error({ err, label }, "ffmpeg thumbnail failed");
    return;
  }
  const e = err as { stderr?: Buffer | string; message?: string };
  const stderr =
    typeof e.stderr === "string"
      ? e.stderr
      : e.stderr != null
        ? e.stderr.toString("utf8")
        : "";
  console.error(
    { label, message: e.message, stderr: stderr.trim() || undefined },
    "ffmpeg thumbnail failed",
  );
}

export async function isUsableVideoThumbnailFile(
  thumbPath: string,
): Promise<boolean> {
  try {
    const s = await stat(thumbPath);
    return s.size >= MIN_VIDEO_THUMB_BYTES;
  } catch {
    return false;
  }
}

const ffmpegBaseArgs = [
  "-hide_banner",
  "-loglevel",
  "error",
  "-nostdin",
  "-y",
] as const;

/**
 * Extract one JPEG frame. Tries several strategies: `-ss` before `-i` breaks
 * clips shorter than the seek offset (previously 0.5s), so we try first frame
 * first, then small seeks after `-i`.
 */
export async function generateVideoThumbnailWithFfmpeg(
  srcPath: string,
  destPath: string,
): Promise<void> {
  const attempts: readonly (readonly string[])[] = [
    [
      ...ffmpegBaseArgs,
      "-i",
      srcPath,
      "-frames:v",
      "1",
      "-f",
      "image2",
      "-an",
      destPath,
    ],
    [
      ...ffmpegBaseArgs,
      "-i",
      srcPath,
      "-ss",
      "0.1",
      "-frames:v",
      "1",
      "-f",
      "image2",
      "-an",
      destPath,
    ],
    [
      ...ffmpegBaseArgs,
      "-i",
      srcPath,
      "-ss",
      "1",
      "-frames:v",
      "1",
      "-f",
      "image2",
      "-an",
      destPath,
    ],
  ];

  let lastErr: unknown;
  for (const [i, args] of attempts.entries()) {
    await unlinkBestEffort(
      destPath,
      "[video-thumbnail] clear dest before ffmpeg attempt",
    );
    try {
      await execFileAsync("ffmpeg", [...args], {
        maxBuffer: 10 * 1024 * 1024,
      });
      if (await isUsableVideoThumbnailFile(destPath)) {
        return;
      }
    } catch (err) {
      lastErr = err;
      logFfmpegFailure(err, `attempt ${i + 1}/${attempts.length}`);
    }
  }
  if (lastErr != null) {
    throw lastErr;
  }
  throw new Error("ffmpeg produced no usable thumbnail");
}
