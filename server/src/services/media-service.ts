import { readFile, unlink, access } from "fs/promises";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import sharp from "sharp";
import type { MediaListQueryResponse } from "../../../shared/src/api.js";
import * as db from "../db/media.js";
import { indexMediaItem } from "../indexing/media.js";
import { extractFacesFromImage } from "../faces.js";
import {
  deleteMediaFromS3,
  tryRestoreMediaFromBackup,
  tryRestoreVideoThumbnailFromBackup,
  scheduleBackupSyncAfterUpload,
} from "../s3/sync.js";
import { mediaDir, thumbnailsDir } from "../config/paths.js";
import {
  effectiveImageResponseMimeType,
  isEffectiveImageItem,
  isGenericBinaryMime,
  isPixelMotionPhotoExtension,
  sniffMediaMimeFromFile,
} from "../lib/effective-image.js";

const execFileAsync = promisify(execFile);

type MediaItemRow = NonNullable<ReturnType<typeof db.getMediaById>>;

/** If the file is missing locally but the row says it was backed up, pull it from S3. */
export async function ensureLocalMediaFile(item: MediaItemRow): Promise<boolean> {
  const filePath = path.join(mediaDir, item.filename);
  try {
    await access(filePath);
    return true;
  } catch {
    if (!item.backedUpAt) return false;
    const ok = await tryRestoreMediaFromBackup(item);
    if (!ok) return false;
    try {
      await access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}

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
  void indexMediaItem(item).catch((err) =>
    console.error(`Auto-index failed for ${item.originalName}:`, err)
  );
}

export function listMediaEnriched(params: {
  limit: number;
  offset: number;
  personId?: number;
  sortBy: "uploaded" | "taken";
}): MediaListQueryResponse {
  const items =
    params.personId != null && !isNaN(params.personId)
      ? db.listMediaPaginated(params.limit, params.offset, params.personId, params.sortBy)
      : db.listMediaPaginated(params.limit, params.offset, undefined, params.sortBy);
  const total =
    params.personId != null && !isNaN(params.personId)
      ? db.getMediaCountForPerson(params.personId)
      : db.getMediaCount();
  const indexedIds = db.getIndexedMediaIds();
  const personNames = db.getPersonNames();
  const enriched = items.map((item) => {
    const personIds = db.getImagePeople(item.id);
    const people = personIds.map((pid) => personNames.get(pid) ?? `Person ${pid}`);
    return {
      ...item,
      indexed: indexedIds.has(item.id),
      backedUp: !!item.backedUpAt,
      people: people.length ? people : undefined,
    };
  });
  return { items: enriched, total };
}

export type DeleteMediaResult =
  | { ok: true }
  | { ok: false; reason: "not_found" | "forbidden" | "delete_failed" };

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
    console.error("Delete error:", err);
    return { ok: false, reason: "delete_failed" };
  }
}

export async function getFacesPayloadForMedia(mediaId: string) {
  const item = db.getMediaById(mediaId);
  if (!item || !isEffectiveImageItem(item)) {
    return { ok: false as const, reason: "not_found" as const };
  }
  const ok = await ensureLocalMediaFile(item);
  if (!ok) {
    return { ok: false as const, reason: "file_missing" as const };
  }
  const filePath = path.join(mediaDir, item.filename);
  try {
    const faces = await extractFacesFromImage(filePath, item.id);
    const detected = faces
      .map((f) => f.box)
      .filter((b): b is { x: number; y: number; width: number; height: number } => !!b);
    const tagged = db.getTaggedFacesInMedia(item.id);
    const personNames = db.getPersonNames();
    return {
      ok: true as const,
      body: {
        detected,
        tagged: tagged.map((t) => ({
          ...t,
          name: personNames.get(t.personId) ?? `Person ${t.personId}`,
        })),
      },
    };
  } catch (err) {
    console.error("Face detection error:", err);
    return { ok: false as const, reason: "detection_failed" as const };
  }
}

export function addPersonToMediaTag(params: {
  mediaId: string;
  personId: unknown;
  box: unknown;
  createNew: boolean;
}):
  | { ok: true; status: 201; body: { personId: number } }
  | { ok: false; status: 400 | 404; error: string } {
  const item = db.getMediaById(params.mediaId);
  if (!item || !isEffectiveImageItem(item)) {
    return { ok: false, status: 404, error: "Not found" };
  }
  const box = params.box;
  if (
    !box ||
    typeof box !== "object" ||
    typeof (box as { x?: unknown }).x !== "number" ||
    typeof (box as { y?: unknown }).y !== "number" ||
    typeof (box as { width?: unknown }).width !== "number" ||
    typeof (box as { height?: unknown }).height !== "number"
  ) {
    return { ok: false, status: 400, error: "box { x, y, width, height } required" };
  }
  const b = box as { x: number; y: number; width: number; height: number };
  if (params.createNew) {
    const targetPersonId = db.createNewPerson();
    db.addPersonToMedia(item.id, targetPersonId, b);
    return { ok: true, status: 201, body: { personId: targetPersonId } };
  }
  const id = parseInt(String(params.personId ?? ""), 10);
  if (isNaN(id) || id < 1) {
    return { ok: false, status: 400, error: "personId required when not createNew" };
  }
  const allIds = db.getAllPersonIds();
  if (!allIds.includes(id)) {
    return { ok: false, status: 400, error: "Person not found" };
  }
  db.addPersonToMedia(item.id, id, b);
  return { ok: true, status: 201, body: { personId: id } };
}

export async function getFaceCropOrFullImage(mediaId: string, personId: number) {
  const item = db.getMediaById(mediaId);
  if (!item || !isEffectiveImageItem(item)) {
    return { ok: false as const, reason: "not_found" as const };
  }
  if (isNaN(personId) || personId < 1) {
    return { ok: false as const, reason: "bad_request" as const };
  }
  const personIds = db.getImagePeople(item.id);
  if (!personIds.includes(personId)) {
    return { ok: false as const, reason: "person_not_in_image" as const };
  }
  const fileOk = await ensureLocalMediaFile(item);
  if (!fileOk) {
    return { ok: false as const, reason: "file_missing" as const };
  }
  const box = db.getFaceBox(item.id, personId);
  const filePath = path.join(mediaDir, item.filename);
  try {
    if (box && box.width > 0 && box.height > 0) {
      const left = Math.round(Math.max(0, box.x));
      const top = Math.round(Math.max(0, box.y));
      const width = Math.round(Math.max(1, box.width));
      const height = Math.round(Math.max(1, box.height));
      const buffer = await sharp(filePath).extract({ left, top, width, height }).toBuffer();
      return {
        ok: true as const,
        kind: "buffer" as const,
        mimeType: effectiveImageResponseMimeType(item),
        buffer,
      };
    }
    return {
      ok: true as const,
      kind: "file" as const,
      path: filePath,
      mimeType: effectiveImageResponseMimeType(item),
    };
  } catch (err) {
    console.error("Face crop error:", err);
    return { ok: false as const, reason: "crop_failed" as const };
  }
}

export async function getMediaPreviewFile(mediaId: string) {
  const item = db.getMediaById(mediaId);
  if (!item) {
    return { ok: false as const, reason: "not_found" as const };
  }
  const ok = await ensureLocalMediaFile(item);
  if (!ok) {
    return { ok: false as const, reason: "file_missing" as const };
  }
  const filePath = path.join(mediaDir, item.filename);
  const shouldSniff =
    isPixelMotionPhotoExtension(item.originalName) || isGenericBinaryMime(item.mimeType);
  let mimeType = effectiveImageResponseMimeType(item);
  if (shouldSniff) {
    const sniffed = await sniffMediaMimeFromFile(filePath);
    if (sniffed) {
      mimeType = sniffed;
      if (sniffed !== item.mimeType) {
        db.updateMediaMimeType(item.id, sniffed);
      }
    }
  }
  return {
    ok: true as const,
    path: filePath,
    mimeType,
  };
}

export function getMediaDetailsEnriched(mediaId: string) {
  const item = db.getMediaById(mediaId);
  if (!item) {
    return { ok: false as const };
  }
  const personIds = db.getImagePeople(item.id);
  const personNames = db.getPersonNames();
  const people = personIds.map((pid) => personNames.get(pid) ?? `Person ${pid}`);
  const indexedIds = db.getIndexedMediaIds();
  const companion =
    item.motionCompanionId != null && item.motionCompanionId !== ""
      ? db.getMediaById(item.motionCompanionId)
      : undefined;
  const motionCompanion =
    companion != null
      ? {
          id: companion.id,
          originalName: companion.originalName,
          mimeType: companion.mimeType,
          size: companion.size,
        }
      : undefined;
  const { hideFromGallery: _hid, ...rest } = item;
  return {
    ok: true as const,
    body: {
      ...rest,
      people: people.length ? people : undefined,
      indexed: indexedIds.has(item.id),
      backedUp: !!item.backedUpAt,
      motionCompanion,
    },
  };
}

const TEXT_MIMES = new Set([
  "text/plain",
  "text/html",
  "text/css",
  "text/javascript",
  "application/json",
  "application/xml",
  "text/markdown",
  "text/csv",
]);

export async function readTextMediaContent(mediaId: string) {
  const item = db.getMediaById(mediaId);
  if (!item) {
    return { ok: false as const, reason: "not_found" as const };
  }
  if (!TEXT_MIMES.has(item.mimeType)) {
    return { ok: false as const, reason: "not_text" as const };
  }
  const ok = await ensureLocalMediaFile(item);
  if (!ok) {
    return { ok: false as const, reason: "file_missing" as const };
  }
  try {
    const filePath = path.join(mediaDir, item.filename);
    const content = await readFile(filePath, "utf-8");
    return { ok: true as const, content };
  } catch {
    return { ok: false as const, reason: "read_failed" as const };
  }
}

export async function getThumbnailResponse(mediaId: string): Promise<
  | { ok: true; kind: "file"; path: string; contentType: string }
  | { ok: false; reason: "not_found" | "bad_type" | "file_missing" | "ffmpeg_missing" | "thumb_failed" }
> {
  const item = db.getMediaById(mediaId);
  if (!item) {
    return { ok: false, reason: "not_found" };
  }
  const mediaOk = await ensureLocalMediaFile(item);
  if (!mediaOk) {
    return { ok: false, reason: "file_missing" };
  }
  const filePath = path.join(mediaDir, item.filename);
  const shouldSniff =
    isPixelMotionPhotoExtension(item.originalName) || isGenericBinaryMime(item.mimeType);
  const sniffed = shouldSniff ? await sniffMediaMimeFromFile(filePath) : null;
  if (sniffed && sniffed !== item.mimeType) {
    db.updateMediaMimeType(item.id, sniffed);
  }
  const mimeForKind = sniffed ?? item.mimeType;
  const isVideoKind = mimeForKind.startsWith("video/");
  const isImageKind =
    mimeForKind.startsWith("image/") || isPixelMotionPhotoExtension(item.originalName);

  if (!isVideoKind && isImageKind) {
    const contentType = mimeForKind.startsWith("image/")
      ? mimeForKind
      : effectiveImageResponseMimeType(item);
    return {
      ok: true,
      kind: "file",
      path: filePath,
      contentType,
    };
  }
  if (!isVideoKind) {
    return { ok: false, reason: "bad_type" };
  }
  const thumbPath = path.join(thumbnailsDir, `${item.id}.jpg`);
  const srcPath = path.join(mediaDir, item.filename);
  try {
    try {
      await access(thumbPath);
    } catch {
      if (item.backedUpAt) {
        await tryRestoreVideoThumbnailFromBackup(item.id);
      }
      try {
        await access(thumbPath);
      } catch {
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
          thumbPath,
        ]);
      }
    }
    return { ok: true, kind: "file", path: thumbPath, contentType: "image/jpeg" };
  } catch (err) {
    const code = (err as NodeJS.ErrnoException)?.code;
    if (code === "ENOENT") {
      return { ok: false, reason: "ffmpeg_missing" };
    }
    console.error("Video thumbnail error:", err);
    return { ok: false, reason: "thumb_failed" };
  }
}

export function removePersonFromMediaTag(mediaId: string, personId: number) {
  const item = db.getMediaById(mediaId);
  if (!item) {
    return { ok: false as const, reason: "not_found" as const };
  }
  if (isNaN(personId) || personId < 1) {
    return { ok: false as const, reason: "bad_person" as const };
  }
  const removed = db.removePersonFromMedia(item.id, personId);
  if (!removed) {
    return { ok: false as const, reason: "not_tagged" as const };
  }
  return { ok: true as const };
}

export function reassignPersonInMediaTag(
  mediaId: string,
  fromPersonId: number,
  toPersonId: number
) {
  const item = db.getMediaById(mediaId);
  if (!item) {
    return { ok: false as const, reason: "not_found" as const };
  }
  if (
    isNaN(fromPersonId) ||
    fromPersonId < 1 ||
    isNaN(toPersonId) ||
    toPersonId < 1
  ) {
    return { ok: false as const, reason: "bad_ids" as const };
  }
  if (fromPersonId === toPersonId) {
    return { ok: false as const, reason: "same_person" as const };
  }
  const allIds = db.getAllPersonIds();
  if (!allIds.includes(toPersonId)) {
    return { ok: false as const, reason: "target_missing" as const };
  }
  const ok = db.reassignPersonInMedia(item.id, fromPersonId, toPersonId);
  if (!ok) {
    return { ok: false as const, reason: "not_tagged" as const };
  }
  return { ok: true as const, body: { reassigned: fromPersonId, to: toPersonId } };
}

export function reassignToNewPerson(mediaId: string, fromPersonId: number) {
  const item = db.getMediaById(mediaId);
  if (!item) {
    return { ok: false as const, reason: "not_found" as const };
  }
  if (isNaN(fromPersonId) || fromPersonId < 1) {
    return { ok: false as const, reason: "bad_person" as const };
  }
  const newId = db.createNewPersonForMedia(item.id, fromPersonId);
  if (newId === null) {
    return { ok: false as const, reason: "not_tagged" as const };
  }
  return { ok: true as const, body: { newPersonId: newId } };
}

export function confirmFaceTag(mediaId: string, personId: number) {
  const item = db.getMediaById(mediaId);
  if (!item) {
    return { ok: false as const, reason: "not_found" as const };
  }
  if (isNaN(personId) || personId < 1) {
    return { ok: false as const, reason: "bad_person" as const };
  }
  const hasTag = db.getImagePeople(item.id).includes(personId);
  if (!hasTag) {
    return { ok: false as const, reason: "not_tagged" as const };
  }
  db.confirmFace(item.id, personId);
  return { ok: true as const };
}
