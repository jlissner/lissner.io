/**
 * Filesystem paths — derived from `env.ts` (`DATA_DIR`, `PROJECT_ROOT`).
 */
import path from "path";
import { DATA_DIR, PROJECT_ROOT } from "./env.js";

export { PROJECT_ROOT } from "./env.js";

export const dataDir = DATA_DIR;
export const mediaDir = path.join(dataDir, "media");
export const thumbnailsDir = path.join(dataDir, "thumbnails");
export const dbDir = path.join(dataDir, "db");
export const dbPath = path.join(dbDir, "media.db");

/** Temp SQLite file used during S3 sync merge. */
export const syncTempDbPath = path.join(dataDir, ".sync_temp_db.db");

export const uiDistDir = path.join(PROJECT_ROOT, "ui", "dist");
