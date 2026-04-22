import { execFile } from "child_process";
import { stat } from "fs/promises";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

/** Ignore empty/trivial files so deleted or truncated thumbnails are regenerated. */
const MIN_VIDEO_THUMB_BYTES = 64;

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

export async function generateVideoThumbnailWithFfmpeg(
  srcPath: string,
  destPath: string,
): Promise<void> {
  await execFileAsync("ffmpeg", [
    "-ss",
    "0.5",
    "-i",
    srcPath,
    "-vframes",
    "1",
    "-f",
    "image2",
    "-an",
    "-y",
    destPath,
  ]);
}
