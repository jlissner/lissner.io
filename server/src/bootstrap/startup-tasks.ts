import { mkdirSync } from "fs";
import { deleteOrphanedLocalThumbnailFiles } from "../lib/orphan-thumbnails.js";
import * as mediaDb from "../db/media.js";
import { logger } from "../logger.js";

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
    mediaDb.relinkAllMotionPairs();
  } catch (err) {
    logger.error(
      { err },
      "[db] relinkAllMotionPairs failed (continuing startup)",
    );
  }
}

export function runServerStartedTasks(): void {
  deleteOrphanedLocalThumbnailFiles().then((removed) => {
    if (removed > 0) {
      logger.info(
        { removed },
        "[thumbnails] Removed orphaned local thumbnail files",
      );
    }
  });
}
