import { rename, writeFile } from "fs/promises";
import path from "path";
import sharp from "sharp";
import * as db from "../db/media.js";
import { mediaDir, thumbnailsDir } from "../config/paths.js";
import { unlinkBestEffort } from "../lib/fs-best-effort.js";
import { isEffectiveImageItem } from "../lib/effective-image.js";
import { isVideoMime } from "../lib/media-mime.js";
import { indexMediaItem } from "../indexing/media.js";
import { scheduleBackupSyncAfterUpload } from "../s3/sync-schedule.js";
import { ensureLocalMediaFile } from "./media-read-service.js";
import type { ServiceFailure } from "./service-result.js";

/** Face box in pixel space (top-left origin) after 90° clockwise rotation; `orientedHeight` is the image height before rotation (EXIF-oriented pixels). */
export function rotateFaceBox90Clockwise(
  box: { x: number; y: number; width: number; height: number },
  orientedHeight: number,
): { x: number; y: number; width: number; height: number } {
  const { x, y, width, height } = box;
  const H = orientedHeight;
  const xNew = H - y - height;
  const yNew = x;
  const wNew = height;
  const hNew = width;
  return { x: xNew, y: yNew, width: wNew, height: hNew };
}

type RotateMediaImageResult =
  | { ok: true; size: number }
  | ServiceFailure<
      | "not_found"
      | "forbidden"
      | "bad_type"
      | "motion_pair"
      | "file_missing"
      | "rotate_failed"
    >;

export async function rotateMediaImage90Clockwise(
  mediaId: string,
  ctx: { userId: number | undefined; isAdmin: boolean | undefined },
): Promise<RotateMediaImageResult> {
  const item = db.getMediaById(mediaId);
  if (!item) {
    return { ok: false, reason: "not_found" };
  }
  const ownerId = db.getMediaOwnerId(item.id);
  const canEdit = ctx.isAdmin || (ownerId != null && ctx.userId === ownerId);
  if (!canEdit) {
    return { ok: false, reason: "forbidden" };
  }
  if (isVideoMime(item.mimeType) && !isEffectiveImageItem(item)) {
    return { ok: false, reason: "bad_type" };
  }
  if (!isEffectiveImageItem(item)) {
    return { ok: false, reason: "bad_type" };
  }
  const companion = item.motionCompanionId;
  if (companion != null && companion !== "") {
    return { ok: false, reason: "motion_pair" };
  }

  const fileOk = await ensureLocalMediaFile(item);
  if (!fileOk) {
    return { ok: false, reason: "file_missing" };
  }

  const filePath = path.join(mediaDir, item.filename);
  try {
    const orientedBuf = await sharp(filePath).rotate().toBuffer();
    const meta = await sharp(orientedBuf).metadata();
    const W = meta.width;
    const H = meta.height;
    if (W == null || H == null) {
      return { ok: false, reason: "rotate_failed" };
    }

    db.setImagePeople(mediaId, []);
    const manualRows = db.listManualFaceRowsForMedia(mediaId);
    const rotatedBuf = await sharp(orientedBuf).rotate(-90).toBuffer();

    const tmpPath = path.join(mediaDir, `${item.filename}.rotate.tmp`);
    await writeFile(tmpPath, rotatedBuf);
    await rename(tmpPath, filePath);

    for (const row of manualRows) {
      const next = rotateFaceBox90Clockwise(
        { x: row.x, y: row.y, width: row.width, height: row.height },
        H,
      );
      db.updateFaceGeometryForMediaPerson(mediaId, row.personId, next);
    }

    db.setMediaFileSize(mediaId, rotatedBuf.length);
    db.clearMediaBackedUpAt(mediaId);
    const imageThumbPath = path.join(thumbnailsDir, `${mediaId}_thumb.jpg`);
    await unlinkBestEffort(
      imageThumbPath,
      "[rotate] remove image thumbnail before reindex",
    );

    db.deleteEmbeddingsForMedia(mediaId);
    const updated = db.getMediaById(mediaId);
    if (!updated) {
      return { ok: false, reason: "not_found" };
    }
    await indexMediaItem({
      id: updated.id,
      filename: updated.filename,
      originalName: updated.originalName,
      mimeType: updated.mimeType,
      size: updated.size,
      uploadedAt: updated.uploadedAt,
    });
    await unlinkBestEffort(
      imageThumbPath,
      "[rotate] remove image thumbnail after reindex",
    );

    scheduleBackupSyncAfterUpload();
    return { ok: true, size: rotatedBuf.length };
  } catch (err) {
    console.error({ err, mediaId }, "Rotate media failed");
    return { ok: false, reason: "rotate_failed" };
  }
}
