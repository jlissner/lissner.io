import Database from "better-sqlite3";
import { dbPath } from "../config/paths.js";
import { runMediaMigrations } from "./media-migrations.js";

const state = { db: null as InstanceType<typeof Database> | null };

export function getDb(): InstanceType<typeof Database> {
  if (state.db?.open) return state.db;
  console.log("here?");

  const db = new Database(dbPath);
  db.pragma("foreign_keys = ON");
  runMediaMigrations(db);
  state.db = db;
  return db;
}

/** Close the media DB handle (e.g. before replacing `dbPath` on disk). */
export function closeMediaDb(): void {
  state.db?.close();
  state.db = null;
}

/** Pixel-style pairs: `*.mp.jpg` (still) + `*.mp` (motion); only still rows appear in gallery lists. */
export const GALLERY_VISIBLE_SQL = "COALESCE(hide_from_gallery, 0) = 0";
