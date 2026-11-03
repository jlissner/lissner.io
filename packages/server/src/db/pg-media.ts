/**
 * Postgres pool for the media API database.
 */
import pg from "pg";
import { MEDIA_DATABASE_URL } from "../config/env.js";

const state: { pool: pg.Pool | null } = { pool: null };

export const getMediaPool = (): pg.Pool => {
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
