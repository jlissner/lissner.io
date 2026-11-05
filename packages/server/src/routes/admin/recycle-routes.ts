import { Router } from "express";
import { z } from "zod";
import { sendApiError } from "../../lib/api-error.js";
import * as db from "../../db/media.js";
import {
  permanentlyDeleteMediaItem,
  restoreMediaItem,
} from "../../services/media-write-service.js";
import { mediaIdParamSchema } from "../../validation/media-schemas.js";
import { adminRecycleBulkDeleteBodySchema } from "../../validation/admin-recycle-schemas.js";

export const adminRecycleRouter = Router();

const recycleListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(100),
  offset: z.coerce.number().int().min(0).default(0),
});

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunkCount = Math.ceil(items.length / size);
  return Array.from({ length: chunkCount }, (_, i) =>
    items.slice(i * size, (i + 1) * size),
  );
}

async function mapInBatches<T, R>(
  items: T[],
  batchSize: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const batches = chunkArray(items, batchSize);
  return await batches.reduce<Promise<R[]>>(async (prev, batch) => {
    const acc = await prev;
    const next = await Promise.all(batch.map(fn));
    return [...acc, ...next];
  }, Promise.resolve([]));
}

async function permanentlyDeleteMany(
  mediaIds: string[],
  ctx: { userId: number | undefined; isAdmin: boolean | undefined },
): Promise<
  Array<
    | { mediaId: string; ok: true }
    | {
        mediaId: string;
        ok: false;
        reason: "not_found" | "forbidden" | "delete_failed";
      }
  >
> {
  return mapInBatches(mediaIds, 8, async (mediaId) => {
    const result = await permanentlyDeleteMediaItem(mediaId, ctx);
    if (result.ok) return { mediaId, ok: true } as const;
    return { mediaId, ok: false, reason: result.reason } as const;
  });
}

adminRecycleRouter.get("/recycle", async (req, res) => {
  const { limit, offset } = recycleListQuerySchema.parse(req.query);
  const [items, total] = await Promise.all([
    db.listDeletedMedia(limit, offset),
    db.getDeletedMediaCount(),
  ]);
  res.json({ items, total });
});

adminRecycleRouter.post("/recycle/bulk-delete", async (req, res) => {
  const { mediaIds } = adminRecycleBulkDeleteBodySchema.parse(req.body);
  const ctx = { userId: req.jwtUser?.id, isAdmin: req.jwtUser?.isAdmin };
  const results = await permanentlyDeleteMany(mediaIds, ctx);
  res.json({ results });
});

adminRecycleRouter.delete("/recycle", async (req, res) => {
  const mediaIds = await db.listDeletedMediaIds();
  const ctx = { userId: req.jwtUser?.id, isAdmin: req.jwtUser?.isAdmin };
  const results = await permanentlyDeleteMany(mediaIds, ctx);
  res.json({ results });
});

adminRecycleRouter.post("/recycle/:id/restore", async (req, res) => {
  const { id } = mediaIdParamSchema.parse(req.params);
  const result = await restoreMediaItem(id);
  if (result.ok) {
    res.json({ ok: true });
    return;
  }
  if (result.reason === "not_found") {
    sendApiError(res, 404, "Not found", "not_found");
    return;
  }
  sendApiError(res, 500, "Failed to restore media", "restore_failed");
});

adminRecycleRouter.delete("/recycle/:id", async (req, res) => {
  const { id } = mediaIdParamSchema.parse(req.params);
  const result = await permanentlyDeleteMediaItem(id, {
    userId: req.jwtUser?.id,
    isAdmin: req.jwtUser?.isAdmin,
  });
  if (result.ok) {
    res.status(204).send();
    return;
  }
  if (result.reason === "not_found") {
    sendApiError(res, 404, "Not found", "not_found");
    return;
  }
  if (result.reason === "forbidden") {
    sendApiError(res, 403, "Forbidden", "delete_forbidden");
    return;
  }
  sendApiError(res, 500, "Failed to permanently delete media", "delete_failed");
});
