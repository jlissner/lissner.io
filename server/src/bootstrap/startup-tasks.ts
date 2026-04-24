import { mkdirSync } from "fs";
import { deleteOrphanedLocalThumbnailFiles } from "../lib/orphan-thumbnails.js";
import * as mediaDb from "../db/media.js";
import { red } from "yoctocolors";

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
    console.info();
    console.error(red("[db] relinkAllMotionPairs failed (continuing startup)"));
    console.error(red((err as Error).stack ?? "Unknonw Error"));
    console.info();
  }
}

export function runServerStartedTasks(): void {
  deleteOrphanedLocalThumbnailFiles().then((removed) => {
    if (removed > 0) {
      console.info(
        { removed },
        "[thumbnails] Removed orphaned local thumbnail files",
      );
    }
  });
}
