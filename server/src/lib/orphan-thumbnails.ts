import { readdir, unlink } from "fs/promises";
import path from "path";
import * as db from "../db/media.js";
import { thumbnailsDir } from "../config/paths.js";

/**
 * Remove `thumbnails/{id}.jpg` when no `media` row exists for `id`.
 */
export async function deleteOrphanedLocalThumbnailFiles(): Promise<number> {
  const ids = db.getAllMediaIds();
  let removed = 0;
  const entries = await readdir(thumbnailsDir).catch(() => [] as string[]);
  for (const name of entries) {
    if (!name.endsWith(".jpg")) continue;
    const id = path.basename(name, ".jpg");
    if (ids.has(id)) continue;
    try {
      await unlink(path.join(thumbnailsDir, name));
      removed++;
    } catch {
      // ignore
    }
  }
  return removed;
}
