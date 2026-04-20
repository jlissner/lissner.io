import { access, readFile } from "fs/promises";
import path from "path";
import sharp from "sharp";
import type { MediaListQueryResponse } from "../../../shared/src/api.js";
import * as db from "../db/media.js";
import { extractFacesFromImage } from "../faces.js";
import { tryRestoreMediaFromBackup, tryRestoreVideoThumbnailFromBackup } from "../s3/sync.js";
import { mediaDir, thumbnailsDir } from "../config/paths.js";
import { isTextMime } from "../lib/media-mime.js";
import { logger } from "../logger.js";
import {
  effectiveImageResponseMimeType,
  isEffectiveImageItem,
  isPixelMotionPhotoExtension,
  sniffAndPersistMediaMime,
} from "../lib/effective-image.js";
import {
  generateVideoThumbnailWithFfmpeg,
  isUsableVideoThumbnailFile,
} from "../lib/video-thumbnail.js";

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
    logger.error({ err, mediaId }, "Face detection error");
    return { ok: false as const, reason: "detection_failed" as const };
  }
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
      const buffer = await sharp(filePath)
        .rotate()
        .extract({ left, top, width, height })
        .toBuffer();
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
    logger.error({ err, mediaId, personId }, "Face crop error");
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
  const { mimeTypePreview } = await sniffAndPersistMediaMime(
    item,
    filePath,
    db.updateMediaMimeType
  );
  const rotated = await sharp(filePath).rotate().toBuffer();
  return {
    ok: true as const,
    kind: "buffer" as const,
    mimeType: mimeTypePreview,
    buffer: rotated,
  };
}

export function getMediaDetailsEnriched(mediaId: string) {
  const item = db.getMediaById(mediaId);
  if (!item) {
    return { ok: false as const, reason: "not_found" as const };
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

export async function readTextMediaContent(mediaId: string) {
  const item = db.getMediaById(mediaId);
  if (!item) {
    return { ok: false as const, reason: "not_found" as const };
  }
  if (!isTextMime(item.mimeType)) {
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
  | {
      ok: false;
      reason: "not_found" | "bad_type" | "file_missing" | "ffmpeg_missing" | "thumb_failed";
    }
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
  const { mimeTypeForKind } = await sniffAndPersistMediaMime(
    item,
    filePath,
    db.updateMediaMimeType
  );
  const isVideoKind = mimeTypeForKind.startsWith("video/");
  const isImageKind =
    mimeTypeForKind.startsWith("image/") || isPixelMotionPhotoExtension(item.originalName);

  if (!isVideoKind && isImageKind) {
    const contentType = mimeTypeForKind.startsWith("image/")
      ? mimeTypeForKind
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
    if (!(await isUsableVideoThumbnailFile(thumbPath))) {
      if (item.backedUpAt) {
        await tryRestoreVideoThumbnailFromBackup(item.id);
      }
      if (!(await isUsableVideoThumbnailFile(thumbPath))) {
        await generateVideoThumbnailWithFfmpeg(srcPath, thumbPath);
      }
    }
    return { ok: true, kind: "file", path: thumbPath, contentType: "image/jpeg" };
  } catch (err) {
    const code = (err as NodeJS.ErrnoException)?.code;
    if (code === "ENOENT") {
      return { ok: false, reason: "ffmpeg_missing" };
    }
    logger.error({ err, mediaId }, "Video thumbnail error");
    return { ok: false, reason: "thumb_failed" };
  }
}

export type GetFacesPayloadForMediaResult = Awaited<ReturnType<typeof getFacesPayloadForMedia>>;
export type GetFaceCropOrFullImageResult = Awaited<ReturnType<typeof getFaceCropOrFullImage>>;
export type GetMediaPreviewFileResult = Awaited<ReturnType<typeof getMediaPreviewFile>>;
export type GetMediaDetailsEnrichedResult = ReturnType<typeof getMediaDetailsEnriched>;
export type ReadTextMediaContentResult = Awaited<ReturnType<typeof readTextMediaContent>>;
export type GetThumbnailResponseResult = Awaited<ReturnType<typeof getThumbnailResponse>>;
