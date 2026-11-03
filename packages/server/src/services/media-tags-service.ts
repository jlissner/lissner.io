import * as db from "../db/media.js";
import type { ServiceFailure } from "./service-result.js";

type GetMediaTagsResult =
  | { ok: true; tags: string[] }
  | ServiceFailure<"not_found">;

export async function getMediaTags(
  mediaId: string,
): Promise<GetMediaTagsResult> {
  const item = await db.getMediaById(mediaId);
  if (!item) {
    return { ok: false, reason: "not_found" };
  }
  return { ok: true, tags: await db.listTagsForMedia(mediaId) };
}

type SetMediaTagsResult =
  | { ok: true }
  | ServiceFailure<"not_found" | "forbidden">;

type AddMediaTagsResult = SetMediaTagsResult;

async function canEditMediaTags(
  mediaId: string,
  ctx: { userId: number | undefined; isAdmin: boolean | undefined },
): Promise<
  | {
      ok: true;
      item: NonNullable<Awaited<ReturnType<typeof db.getMediaById>>>;
    }
  | ServiceFailure<"not_found" | "forbidden">
> {
  const item = await db.getMediaById(mediaId);
  if (!item) {
    return { ok: false, reason: "not_found" };
  }
  const ownerId = await db.getMediaOwnerId(item.id);
  const canEdit = ctx.isAdmin || (ownerId != null && ctx.userId === ownerId);
  if (!canEdit) {
    return { ok: false, reason: "forbidden" };
  }
  return { ok: true, item };
}

export async function setMediaTags(
  mediaId: string,
  tags: string[],
  ctx: { userId: number | undefined; isAdmin: boolean | undefined },
): Promise<SetMediaTagsResult> {
  const access = await canEditMediaTags(mediaId, ctx);
  if (!access.ok) {
    return access;
  }
  await db.setTagsForMedia(mediaId, tags);
  return { ok: true };
}

export async function addMediaTags(
  mediaId: string,
  tags: string[],
  ctx: { userId: number | undefined; isAdmin: boolean | undefined },
): Promise<AddMediaTagsResult> {
  const access = await canEditMediaTags(mediaId, ctx);
  if (!access.ok) {
    return access;
  }
  await db.addTagsForMedia(mediaId, tags);
  return { ok: true };
}

export async function bulkAddMediaTags(
  mediaIds: string[],
  tags: string[],
  ctx: { userId: number | undefined; isAdmin: boolean | undefined },
): Promise<{ succeeded: number; failed: number }> {
  const results = await Promise.all(
    mediaIds.map((mediaId) => addMediaTags(mediaId, tags, ctx)),
  );
  const succeeded = results.filter((r) => r.ok).length;
  return { succeeded, failed: results.length - succeeded };
}

export async function removeMediaTags(
  mediaId: string,
  tags: string[],
  ctx: { userId: number | undefined; isAdmin: boolean | undefined },
): Promise<AddMediaTagsResult> {
  const access = await canEditMediaTags(mediaId, ctx);
  if (!access.ok) {
    return access;
  }
  await db.removeTagsFromMedia(mediaId, tags);
  return { ok: true };
}

export async function bulkRemoveMediaTags(
  mediaIds: string[],
  tags: string[],
  ctx: { userId: number | undefined; isAdmin: boolean | undefined },
): Promise<{ succeeded: number; failed: number }> {
  const results = await Promise.all(
    mediaIds.map((mediaId) => removeMediaTags(mediaId, tags, ctx)),
  );
  const succeeded = results.filter((r) => r.ok).length;
  return { succeeded, failed: results.length - succeeded };
}

export async function listDistinctMediaTags(): Promise<string[]> {
  return db.listDistinctTags();
}
