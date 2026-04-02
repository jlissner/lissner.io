import { unlink } from "fs/promises";
import path from "path";
import * as db from "../db/media.js";
import { indexMediaItem } from "../indexing/media.js";
import { deleteMediaFromS3, scheduleBackupSyncAfterUpload } from "../s3/sync.js";
import { mediaDir, thumbnailsDir } from "../config/paths.js";
import { logger } from "../logger.js";
import type { ServiceFailure } from "./service-result.js";

export function persistUploadedMedia(params: {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  ownerId: number;
}): void {
  db.insertMedia(
    params.id,
    params.filename,
    params.originalName,
    params.mimeType,
    params.size,
    params.ownerId
  );
  scheduleBackupSyncAfterUpload();
  const item = {
    id: params.id,
    filename: params.filename,
    originalName: params.originalName,
    mimeType: params.mimeType,
    size: params.size,
    uploadedAt: new Date().toISOString(),
  };
  void indexMediaItem(item);
}

export type DeleteMediaResult =
  | { ok: true }
  | ServiceFailure<"not_found" | "forbidden" | "delete_failed">;

export async function deleteMediaItem(
  mediaId: string,
  ctx: { userId: number | undefined; isAdmin: boolean | undefined }
): Promise<DeleteMediaResult> {
  const item = db.getMediaById(mediaId);
  if (!item) {
    return { ok: false, reason: "not_found" };
  }
  const ownerId = db.getMediaOwnerId(item.id);
  const canDelete = ctx.isAdmin || (ownerId != null && ctx.userId === ownerId);
  if (!canDelete) {
    return { ok: false, reason: "forbidden" };
  }
  try {
    const filePath = path.join(mediaDir, item.filename);
    await unlink(filePath).catch((err: NodeJS.ErrnoException) => {
      if (err.code !== "ENOENT") throw err;
    });
    if (item.mimeType.startsWith("video/")) {
      const thumbPath = path.join(thumbnailsDir, `${item.id}.jpg`);
      await unlink(thumbPath).catch(() => {});
    }
    const s3Target = { id: item.id, filename: item.filename };
    db.clearMotionPairForPeer(item.id);
    db.deleteMedia(item.id);
    await deleteMediaFromS3(s3Target);
    scheduleBackupSyncAfterUpload();
    return { ok: true };
  } catch (err) {
    logger.error({ err, mediaId }, "Delete media failed");
    return { ok: false, reason: "delete_failed" };
  }
}

function parseBodyDateTaken(raw: unknown): string | null | "invalid" | "bad_type" {
  if (raw === null) return null;
  if (typeof raw !== "string") return "bad_type";
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  const d = new Date(trimmed);
  if (Number.isNaN(d.getTime())) return "invalid";
  return d.toISOString();
}

export type UpdateMediaDateTakenResult =
  | { ok: true; dateTaken: string | null }
  | ServiceFailure<"not_found" | "forbidden" | "bad_request" | "invalid_date">;

/** Owner or admin may set `dateTaken` to an ISO timestamp string or `null` to clear. */
export function updateMediaDateTaken(
  mediaId: string,
  body: unknown,
  ctx: { userId: number | undefined; isAdmin: boolean | undefined }
): UpdateMediaDateTakenResult {
  const item = db.getMediaById(mediaId);
  if (!item) {
    return { ok: false, reason: "not_found" };
  }
  const ownerId = db.getMediaOwnerId(item.id);
  const canEdit = ctx.isAdmin || (ownerId != null && ctx.userId === ownerId);
  if (!canEdit) {
    return { ok: false, reason: "forbidden" };
  }
  if (body === null || typeof body !== "object" || !("dateTaken" in body)) {
    return { ok: false, reason: "bad_request" };
  }
  const raw = (body as { dateTaken: unknown }).dateTaken;
  const parsed = parseBodyDateTaken(raw);
  if (parsed === "bad_type") {
    return { ok: false, reason: "bad_request" };
  }
  if (parsed === "invalid") {
    return { ok: false, reason: "invalid_date" };
  }
  db.setMediaDateTaken(mediaId, parsed);
  scheduleBackupSyncAfterUpload();
  return { ok: true, dateTaken: parsed };
}

