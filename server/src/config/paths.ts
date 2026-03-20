/**
 * Single source of truth for filesystem paths under the repo root.
 * This module lives in `server/src/config/` (three levels below project root).
 */
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Repository root (parent of `server/`). */
export const PROJECT_ROOT = path.join(__dirname, "..", "..", "..");

export const dataDir = path.join(PROJECT_ROOT, "data");
export const mediaDir = path.join(dataDir, "media");
export const thumbnailsDir = path.join(dataDir, "thumbnails");
export const dbDir = path.join(dataDir, "db");
export const dbPath = path.join(dbDir, "media.db");

/** Temp SQLite file used during S3 sync merge. */
export const syncTempDbPath = path.join(dataDir, ".sync_temp_db.db");

export const uiDistDir = path.join(PROJECT_ROOT, "ui", "dist");
