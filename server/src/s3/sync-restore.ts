import { DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import path from "path";
import * as db from "../db/media.js";
import { mediaDir, thumbnailsDir } from "../config/paths.js";
import { unlinkBestEffort } from "../lib/fs-best-effort.js";
import { isUsableVideoThumbnailFile } from "../lib/video-thumbnail.js";
import { s3Client } from "./client.js";
import { S3_PREFIX } from "./sync-constants.js";
import { downloadS3ObjectToFile, fileExists } from "./sync-transfer.js";
import { S3_BUCKET } from "../config/env.js";

function isS3NoSuchKey(err: unknown): boolean {
  if (typeof err !== "object" || err === null) return false;
  const e = err as { name?: string; Code?: string };
  return e.name === "NoSuchKey" || e.Code === "NoSuchKey";
}

/** Remove a media blob and its video thumbnail (if any) from S3 after local delete. Best-effort; logs errors. */
export async function deleteMediaFromS3(item: {
  id: string;
  filename: string;
}): Promise<void> {
  const bucket = S3_BUCKET!;
  const keys = [
    `${S3_PREFIX}/media/${item.filename}`,
    `${S3_PREFIX}/thumbnails/${item.id}.jpg`,
  ];
  for (const Key of keys) {
    try {
      await s3Client.send(new DeleteObjectCommand({ Bucket: bucket, Key }));
    } catch (err) {
      console.error({ err, key: Key }, "[s3-sync] DeleteObject failed");
    }
  }
}

/** Download a single media file from S3 when the DB says it was backed up but the local file is missing. */
export async function tryRestoreMediaFromBackup(item: {
  id: string;
  filename: string;
  backedUpAt?: string | null;
}): Promise<boolean> {
  if (!item.backedUpAt) return false;
  const localPath = path.join(mediaDir, item.filename);
  if (await fileExists(localPath)) return true;
  const bucket = S3_BUCKET!;
  try {
    const getRes = await s3Client.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: `${S3_PREFIX}/media/${item.filename}`,
      }),
    );
    const body = getRes.Body;
    if (!body) return false;
    await downloadS3ObjectToFile(body, localPath);
    return true;
  } catch (err) {
    if (isS3NoSuchKey(err)) {
      db.clearMediaBackedUpAt(item.id);
      return false;
    }
    console.error(
      { err, mediaId: item.id },
      "restore: failed to download media from S3",
    );
    return false;
  }
}

/** Download a cached video thumbnail from S3 when present in backup. */
export async function tryRestoreVideoThumbnailFromBackup(
  mediaId: string,
): Promise<boolean> {
  const thumbPath = path.join(thumbnailsDir, `${mediaId}.jpg`);
  if (await isUsableVideoThumbnailFile(thumbPath)) return true;
  await unlinkBestEffort(
    thumbPath,
    "[restore] remove unusable video thumbnail before S3 download",
  );
  const bucket = S3_BUCKET!;
  try {
    const getRes = await s3Client.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: `${S3_PREFIX}/thumbnails/${mediaId}.jpg`,
      }),
    );
    const body = getRes.Body;
    if (!body) return false;
    await downloadS3ObjectToFile(body, thumbPath);
    return isUsableVideoThumbnailFile(thumbPath);
  } catch (err) {
    if (isS3NoSuchKey(err)) {
      return false;
    }
    console.error(
      { err, mediaId },
      "restore: failed to download thumbnail from S3",
    );
    return false;
  }
}
