import { Router } from "express";
import { sendApiError } from "../../lib/api-error.js";
import { findDuplicatesForMedia, computeAndStoreHash } from "../../services/duplicate-detection.js";
import * as db from "../../db/media.js";

export const adminDuplicatesRouter = Router();

adminDuplicatesRouter.get("/duplicates/:mediaId", async (req, res) => {
  const { mediaId } = req.params;
  const duplicates = await findDuplicatesForMedia(mediaId);
  res.json({ duplicates });
});

adminDuplicatesRouter.post("/duplicates/:mediaId/compute-hash", async (req, res) => {
  const { mediaId } = req.params;
  const success = await computeAndStoreHash(mediaId);
  if (!success) {
    sendApiError(res, 500, "Failed to compute hash", "hash_failed");
    return;
  }
  res.json({ success: true });
});

adminDuplicatesRouter.get("/duplicates", async (_req, res) => {
  const allWithHashes = db.getAllMediaWithHashes();
  const matches: Array<{ mediaId: string; duplicateOfId: string; hammingDistance: number }> = [];

  for (let i = 0; i < allWithHashes.length; i++) {
    for (let j = i + 1; j < allWithHashes.length; j++) {
      const a = allWithHashes[i];
      const b = allWithHashes[j];
      const { hammingDistance } = await import("../../lib/perceptual-hash.js");
      const dist = hammingDistance(a.perceptualHash, b.perceptualHash);
      if (dist <= 10) {
        matches.push({ mediaId: a.id, duplicateOfId: b.id, hammingDistance: dist });
      }
    }
  }

  res.json({ duplicates: matches.sort((a, b) => a.hammingDistance - b.hammingDistance) });
});

adminDuplicatesRouter.post("/duplicates/compute-all-hashes", async (_req, res) => {
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
});
