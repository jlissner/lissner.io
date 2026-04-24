/**
 * Filesystem paths — derived from `env.ts` (`DATA_DIR`, `PROJECT_ROOT`).
 * Creates `DATA_DIR` subdirs at load time so DB modules (e.g. `auth.ts`) can open SQLite
 * before `ensureServerDirectories()` runs (import order: routes → db before `index.ts` body).
 */
import { mkdirSync } from "fs";
import path from "path";
import { DATA_DIR, PROJECT_ROOT } from "./env.js";

export { PROJECT_ROOT } from "./env.js";

export const dataDir = path.isAbsolute(DATA_DIR)
  ? DATA_DIR
  : path.join(PROJECT_ROOT, DATA_DIR);

export const mediaDir = path.join(dataDir, "media");
export const thumbnailsDir = path.join(dataDir, "thumbnails");
export const dbDir = path.join(dataDir, "db");
export const dbPath = path.join(dbDir, "media.db");

/** Temp SQLite file used during S3 sync merge. */
export const syncTempDbPath = path.join(dataDir, ".sync_temp_db.db");

export const uiDistDir = path.join(PROJECT_ROOT, "ui", "dist");

mkdirSync(mediaDir, { recursive: true });
mkdirSync(thumbnailsDir, { recursive: true });
mkdirSync(dbDir, { recursive: true });
