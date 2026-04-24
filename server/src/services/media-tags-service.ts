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

export function setMediaTags(
  mediaId: string,
  tags: string[],
  ctx: { userId: number | undefined; isAdmin: boolean | undefined },
): SetMediaTagsResult {
  const item = db.getMediaById(mediaId);
  if (!item) {
    return { ok: false, reason: "not_found" };
  }
  const ownerId = db.getMediaOwnerId(item.id);
  const canEdit = ctx.isAdmin || (ownerId != null && ctx.userId === ownerId);
  if (!canEdit) {
    return { ok: false, reason: "forbidden" };
  }
  db.setTagsForMedia(mediaId, tags);
  return { ok: true };
}

export function listDistinctMediaTags(): string[] {
  return db.listDistinctTags();
}
