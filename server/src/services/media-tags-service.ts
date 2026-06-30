import * as db from "../db/media.js";
import type { ServiceFailure } from "./service-result.js";

type GetMediaTagsResult =
  | { ok: true; tags: string[] }
  | ServiceFailure<"not_found">;

export function getMediaTags(mediaId: string): GetMediaTagsResult {
  const item = db.getMediaById(mediaId);
  if (!item) {
    return { ok: false, reason: "not_found" };
  }
  return { ok: true, tags: db.listTagsForMedia(mediaId) };
}

type SetMediaTagsResult =
  | { ok: true }
  | ServiceFailure<"not_found" | "forbidden">;

type AddMediaTagsResult = SetMediaTagsResult;

function canEditMediaTags(
  mediaId: string,
  ctx: { userId: number | undefined; isAdmin: boolean | undefined },
):
  | { ok: true; item: NonNullable<ReturnType<typeof db.getMediaById>> }
  | ServiceFailure<"not_found" | "forbidden"> {
  const item = db.getMediaById(mediaId);
  if (!item) {
    return { ok: false, reason: "not_found" };
  }
  const ownerId = db.getMediaOwnerId(item.id);
  const canEdit = ctx.isAdmin || (ownerId != null && ctx.userId === ownerId);
  if (!canEdit) {
    return { ok: false, reason: "forbidden" };
  }
  return { ok: true, item };
}

export function setMediaTags(
  mediaId: string,
  tags: string[],
  ctx: { userId: number | undefined; isAdmin: boolean | undefined },
): SetMediaTagsResult {
  const access = canEditMediaTags(mediaId, ctx);
  if (!access.ok) {
    return access;
  }
  db.setTagsForMedia(mediaId, tags);
  return { ok: true };
}

export function addMediaTags(
  mediaId: string,
  tags: string[],
  ctx: { userId: number | undefined; isAdmin: boolean | undefined },
): AddMediaTagsResult {
  const access = canEditMediaTags(mediaId, ctx);
  if (!access.ok) {
    return access;
  }
  db.addTagsForMedia(mediaId, tags);
  return { ok: true };
}

export function bulkAddMediaTags(
  mediaIds: string[],
  tags: string[],
  ctx: { userId: number | undefined; isAdmin: boolean | undefined },
): { succeeded: number; failed: number } {
  return mediaIds.reduce(
    (acc, mediaId) => {
      const result = addMediaTags(mediaId, tags, ctx);
      if (result.ok) {
        return { succeeded: acc.succeeded + 1, failed: acc.failed };
      }
      return { succeeded: acc.succeeded, failed: acc.failed + 1 };
    },
    { succeeded: 0, failed: 0 },
  );
}

export function removeMediaTags(
  mediaId: string,
  tags: string[],
  ctx: { userId: number | undefined; isAdmin: boolean | undefined },
): AddMediaTagsResult {
  const access = canEditMediaTags(mediaId, ctx);
  if (!access.ok) {
    return access;
  }
  db.removeTagsFromMedia(mediaId, tags);
  return { ok: true };
}

export function bulkRemoveMediaTags(
  mediaIds: string[],
  tags: string[],
  ctx: { userId: number | undefined; isAdmin: boolean | undefined },
): { succeeded: number; failed: number } {
  return mediaIds.reduce(
    (acc, mediaId) => {
      const result = removeMediaTags(mediaId, tags, ctx);
      if (result.ok) {
        return { succeeded: acc.succeeded + 1, failed: acc.failed };
      }
      return { succeeded: acc.succeeded, failed: acc.failed + 1 };
    },
    { succeeded: 0, failed: 0 },
  );
}

export function listDistinctMediaTags(): string[] {
  return db.listDistinctTags();
}
