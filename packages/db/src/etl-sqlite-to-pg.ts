#!/usr/bin/env npx tsx
/**
 * One-shot copy: SQLite media.db → Postgres `media` database.
 * Stop the API before running. Idempotent truncate-then-load for listed tables.
 */
import Database from "better-sqlite3";
import { existsSync } from "fs";
import pg from "pg";
import { mediaDatabaseUrl, sqliteDbPath } from "./env.js";

const TABLES = [
  "person_names",
  "media",
  "embeddings",
  "image_people",
  "media_tags",
  "auth_whitelist",
  "users",
  "user_people",
  "magic_link_tokens",
  "refresh_tokens",
] as const;

const sqlitePath = sqliteDbPath();
if (!existsSync(sqlitePath)) {
  console.error(`SQLite DB not found: ${sqlitePath}`);
  process.exit(1);
}

const sqlite = new Database(sqlitePath, { readonly: true });
const client = new pg.Client({ connectionString: mediaDatabaseUrl() });
await client.connect();

const quoteIdent = (name: string): string => `"${name.replace(/"/g, '""')}"`;

try {
  await client.query("BEGIN");

  // FK-safe wipe
  for (const table of [...TABLES].reverse()) {
    await client.query(`TRUNCATE TABLE ${quoteIdent(table)} CASCADE`);
  }

  const boolCols = new Set([
    "auth_whitelist.is_admin",
    "users.is_admin",
    "media.hide_from_gallery",
  ]);

  const tableExists = (name: string): boolean => {
    const row = sqlite
      .prepare(
        "SELECT 1 AS ok FROM sqlite_master WHERE type = 'table' AND name = ?",
      )
      .get(name) as { ok: number } | undefined;
    return row != null;
  };

  for (const table of TABLES) {
    if (!tableExists(table)) {
      console.info(`${table}: skip (missing in SQLite)`);
      continue;
    }
    const rows = sqlite.prepare(`SELECT * FROM ${table}`).all() as Array<
      Record<string, unknown>
    >;
    if (rows.length === 0) {
      console.info(`${table}: 0 rows`);
      continue;
    }
    const cols = Object.keys(rows[0]!);
    const colList = cols.map(quoteIdent).join(", ");
    const placeholders = cols.map((_, i) => `$${i + 1}`).join(", ");
    const insert = `INSERT INTO ${quoteIdent(table)} (${colList}) VALUES (${placeholders})`;

    const pkCols =
      table === "magic_link_tokens" || table === "refresh_tokens"
        ? ["token_hash"]
        : [];

    const usable = rows.filter((row) =>
      pkCols.every((c) => row[c] != null && row[c] !== ""),
    );
    const skipped = rows.length - usable.length;
    if (skipped > 0) {
      console.info(`${table}: skipping ${skipped} rows with null PK`);
    }

    for (const row of usable) {
      const values = cols.map((c) => {
        const v = row[c];
        if (v instanceof Buffer) return v;
        if (typeof v === "number" && boolCols.has(`${table}.${c}`)) {
          return v !== 0;
        }
        return v;
      });
      await client.query(insert, values);
    }
    console.info(`${table}: ${usable.length} rows`);
  }

  // Sync SERIAL sequences after explicit inserts
  await client.query(`
    SELECT setval(pg_get_serial_sequence('users', 'id'), COALESCE((SELECT MAX(id) FROM users), 1), true);
    SELECT setval(pg_get_serial_sequence('auth_whitelist', 'id'), COALESCE((SELECT MAX(id) FROM auth_whitelist), 1), true);
  `);

  await client.query("COMMIT");
  console.info("OK: ETL complete. Run npm run db:verify-etl next.");
} catch (err) {
  await client.query("ROLLBACK");
  throw err;
} finally {
  await client.end();
  sqlite.close();
}
