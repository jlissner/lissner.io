import { mkdirSync } from "fs";
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

export async function runStartupMaintenance(): Promise<void> {
  try {
    const [authDb, db] = await Promise.all([
      import("../db/auth.js"),
      import("../db/media.js"),
    ]);
    db.migrateNullOwnersToDefault(authDb.getDefaultOwnerId);
  } catch (err) {
    logger.error(
      { err },
      "[db] migrateNullOwnersToDefault failed (continuing startup)",
    );
  }
  try {
    const db = await import("../db/media.js");
    db.relinkAllMotionPairs();
  } catch (err) {
    logger.error(
      { err },
      "[db] relinkAllMotionPairs failed (continuing startup)",
    );
  }
}

export function runServerStartedTasks(): void {
  void deleteOrphanedLocalThumbnailFiles().then((removed) => {
    if (removed > 0) {
      logger.info(
        { removed },
        "[thumbnails] Removed orphaned local thumbnail files",
      );
    }
  });
}
