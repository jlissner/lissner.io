/**
 * Filesystem paths — derived from `env.ts` (`DATA_DIR`, `PROJECT_ROOT`).
 * Creates `DATA_DIR` subdirs at load time (import order: routes → db before `index.ts` body).
 * `dbDir` holds temporary pg_dump files during S3 sync / admin restore.
 */
import { mkdirSync } from "fs";
import path from "path";
import { DATA_DIR, PROJECT_ROOT } from "./env.js";

const dataDir = path.isAbsolute(DATA_DIR)
  ? DATA_DIR
  : path.join(PROJECT_ROOT, DATA_DIR);

export const mediaDir = path.join(dataDir, "media");
export const thumbnailsDir = path.join(dataDir, "thumbnails");
export const dbDir = path.join(dataDir, "db");

mkdirSync(mediaDir, { recursive: true });
mkdirSync(thumbnailsDir, { recursive: true });
mkdirSync(dbDir, { recursive: true });
