import { mkdirSync } from "fs";
import * as authDb from "../db/auth.js";
import * as db from "../db/media.js";
import { logger } from "../logger.js";
import { deleteOrphanedLocalThumbnailFiles } from "../lib/orphan-thumbnails.js";

export function ensureServerDirectories(paths: {
  mediaDir: string;
  dbDir: string;
  thumbnailsDir: string;
}): void {
  mkdirSync(paths.mediaDir, { recursive: true });
  mkdirSync(paths.dbDir, { recursive: true });
  mkdirSync(paths.thumbnailsDir, { recursive: true });
}

export function runStartupMaintenance(): void {
  try {
    db.migrateNullOwnersToDefault(authDb.getDefaultOwnerId);
  } catch (err) {
    logger.error({ err }, "[db] migrateNullOwnersToDefault failed (continuing startup)");
  }
  try {
    db.relinkAllMotionPairs();
  } catch (err) {
    logger.error({ err }, "[db] relinkAllMotionPairs failed (continuing startup)");
  }
}

export function runServerStartedTasks(): void {
  void deleteOrphanedLocalThumbnailFiles().then((removed) => {
    if (removed > 0) {
      logger.info({ removed }, "[thumbnails] Removed orphaned local thumbnail files");
    }
  });
}
