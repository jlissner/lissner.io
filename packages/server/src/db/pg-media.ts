/**
 * Postgres client scaffolding for the media DB cutover (Phase B4).
 * While MEDIA_DATABASE_URL is unset, the API continues to use better-sqlite3.
 * When set, call sites can gradually move onto this pool; full cutover removes SQLite.
 */
import pg from "pg";
import { MEDIA_DATABASE_URL, mediaUsesPostgres } from "../config/env.js";

const state: { pool: pg.Pool | null } = { pool: null };

export const getMediaPool = (): pg.Pool => {
  if (!mediaUsesPostgres()) {
    throw new Error(
      "MEDIA_DATABASE_URL is not set; media API is still on SQLite",
    );
  }
  if (state.pool == null) {
    state.pool = new pg.Pool({ connectionString: MEDIA_DATABASE_URL });
  }
  return state.pool;
};

export const closeMediaPool = async (): Promise<void> => {
  if (state.pool != null) {
    await state.pool.end();
    state.pool = null;
  }
};
