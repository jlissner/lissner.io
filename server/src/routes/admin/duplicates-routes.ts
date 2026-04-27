import { Router, type RequestHandler } from "express";
import { sendApiError } from "../../lib/api-error.js";
import {
  findDuplicatesForMedia,
  computeAndStoreHash,
} from "../../services/duplicate-detection.js";
import { deleteMediaItem } from "../../services/media-write-service.js";
import * as db from "../../db/media.js";
import { hammingDistance } from "../../lib/perceptual-hash.js";
import { parseWithSchema } from "../../validation/parse.js";
import { adminDuplicatesBulkDeleteBodySchema } from "../../validation/admin-duplicates-schemas.js";

export const adminDuplicatesRouter = Router();

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

export function createAdminDuplicatesBulkDeleteHandler(deps?: {
  deleteMediaItem?: typeof deleteMediaItem;
}): RequestHandler {
  const deleteFn = deps?.deleteMediaItem ?? deleteMediaItem;

  return async (req, res) => {
    const { mediaIds } = parseWithSchema(
      adminDuplicatesBulkDeleteBodySchema,
      req.body,
    );

    const ctx = { userId: req.jwtUser?.id, isAdmin: req.jwtUser?.isAdmin };
    const results = await mapInBatches(mediaIds, 8, async (mediaId) => {
      const result = await deleteFn(mediaId, ctx);
      if (result.ok) return { mediaId, ok: true } as const;
      return { mediaId, ok: false, reason: result.reason } as const;
    });

    res.json({ results });
  };
}

adminDuplicatesRouter.get("/duplicates/:mediaId", async (req, res) => {
  const { mediaId } = req.params;
  const duplicates = await findDuplicatesForMedia(mediaId);
  res.json({ duplicates });
});

adminDuplicatesRouter.post(
  "/duplicates/:mediaId/compute-hash",
  async (req, res) => {
    const { mediaId } = req.params;
    const success = await computeAndStoreHash(mediaId);
    if (!success) {
      sendApiError(res, 500, "Failed to compute hash", "hash_failed");
      return;
    }
    res.json({ success: true });
  },
);

adminDuplicatesRouter.get("/duplicates", async (_req, res) => {
  const allWithHashes = db.getAllMediaWithHashes();
  const matches: Array<{
    mediaId: string;
    duplicateOfId: string;
    hammingDistance: number;
  }> = [];

  for (let i = 0; i < allWithHashes.length; i++) {
    for (let j = i + 1; j < allWithHashes.length; j++) {
      const a = allWithHashes[i];
      const b = allWithHashes[j];
      const dist = hammingDistance(a.perceptualHash, b.perceptualHash);
      if (dist <= 10) {
        matches.push({
          mediaId: a.id,
          duplicateOfId: b.id,
          hammingDistance: dist,
        });
      }
    }
  }

  res.json({
    duplicates: matches.sort((a, b) => a.hammingDistance - b.hammingDistance),
  });
});

adminDuplicatesRouter.post(
  "/duplicates/bulk-delete",
  createAdminDuplicatesBulkDeleteHandler(),
);

adminDuplicatesRouter.post(
  "/duplicates/compute-all-hashes",
  async (_req, res) => {
    const allMedia = db.listMedia();
    const imageMedia = allMedia.filter((m) => {
      const mt = m.mimeType.toLowerCase();
      return mt.startsWith("image/") && !mt.includes("gif");
    });

    let computed = 0;
    let failed = 0;

    for (const media of imageMedia) {
      const existingHash = db.getMediaPerceptualHash(media.id);
      if (existingHash) continue;

      const success = await computeAndStoreHash(media.id);
      if (success) {
        computed++;
      } else {
        failed++;
      }
    }

    res.json({ computed, failed, total: imageMedia.length });
  },
);
