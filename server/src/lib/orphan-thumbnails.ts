import { unlink } from "fs/promises";
import path from "path";
import * as db from "../db/media.js";
import { thumbnailsDir } from "../config/paths.js";
import { readdirOrEmptyWithWarn } from "./fs-best-effort.js";

/**
 * Map a thumbnails-dir filename to its `media.id`.
 * Videos use `{id}.jpg`; images use `{id}_thumb.jpg`.
 */
export function thumbnailFilenameToMediaId(filename: string): string | null {
  if (!filename.endsWith(".jpg")) return null;
  if (filename.endsWith("_thumb.jpg")) {
    return path.basename(filename, "_thumb.jpg");
  }
  return path.basename(filename, ".jpg");
}

/**
 * Remove thumbnail JPEGs when no `media` row exists for the derived id.
 */
export async function deleteOrphanedLocalThumbnailFiles(): Promise<number> {
  const ids = db.getAllMediaIds();
  const acc = { removed: 0 };
  const entries = await readdirOrEmptyWithWarn(
    thumbnailsDir,
    "[thumbnails] readdir for orphan cleanup",
  );
  for (const name of entries) {
    const id = thumbnailFilenameToMediaId(name);
    if (id == null) continue;
    if (ids.has(id)) continue;
    try {
      await unlink(path.join(thumbnailsDir, name));
      acc.removed += 1;
    } catch (err) {
      console.error(
        { err, path: path.join(thumbnailsDir, name) },
        "[thumbnails] orphan file delete failed",
      );
    }
  }
  return acc.removed;
}
