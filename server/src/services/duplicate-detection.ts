import path from "path";
import * as db from "../db/media.js";
import { mediaDir } from "../config/paths.js";
import { computePerceptualHash, hammingDistance } from "../lib/perceptual-hash.js";
import { ensureLocalMediaFile } from "../services/media-read-service.js";
import { logger } from "../logger.js";

const HAMMING_THRESHOLD = 10;

export interface DuplicateMatch {
  mediaId: string;
  duplicateOfId: string;
  hammingDistance: number;
}

export async function findDuplicatesForMedia(mediaId: string): Promise<DuplicateMatch[]> {
  const item = db.getMediaById(mediaId);
  if (!item) return [];

  const fileOk = await ensureLocalMediaFile(item);
  if (!fileOk) return [];

  const filePath = path.join(mediaDir, item.filename);
  let newHash: Buffer;
  try {
    newHash = await computePerceptualHash(filePath);
  } catch (err) {
    logger.error({ err, mediaId }, "Failed to compute perceptual hash");
    return [];
  }

  const allWithHashes = db.getAllMediaWithHashes();
  const matches: DuplicateMatch[] = [];

  for (const existing of allWithHashes) {
    if (existing.id === mediaId) continue;
    const dist = hammingDistance(newHash, existing.perceptualHash);
    if (dist <= HAMMING_THRESHOLD) {
      matches.push({
        mediaId,
        duplicateOfId: existing.id,
        hammingDistance: dist,
      });
    }
  }

  return matches.sort((a, b) => a.hammingDistance - b.hammingDistance);
}

export async function computeAndStoreHash(mediaId: string): Promise<boolean> {
  const item = db.getMediaById(mediaId);
  if (!item) return false;

  const fileOk = await ensureLocalMediaFile(item);
  if (!fileOk) return false;

  const filePath = path.join(mediaDir, item.filename);
  try {
    const hash = await computePerceptualHash(filePath);
    db.setMediaPerceptualHash(mediaId, hash);
    return true;
  } catch (err) {
    logger.error({ err, mediaId }, "Failed to compute perceptual hash");
    return false;
  }
}
