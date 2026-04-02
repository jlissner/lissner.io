import Database from "better-sqlite3";
import { dbPath } from "../config/paths.js";
import { runMediaMigrations } from "./media-migrations.js";

export const db: InstanceType<typeof Database> = new Database(dbPath);
runMediaMigrations(db);

/** Pixel-style pairs: `*.mp.jpg` (still) + `*.mp` (motion); only still rows appear in gallery lists. */
export const GALLERY_VISIBLE_SQL = "COALESCE(hide_from_gallery, 0) = 0";
