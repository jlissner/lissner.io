#!/usr/bin/env npx tsx
/**
 * Checkpoint B3: compare SQLite vs Postgres row counts for media tables.
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

const mismatches: string[] = [];

try {
  console.info("table\tsqlite\tpostgres");
  for (const table of TABLES) {
    const sqliteHas = sqlite
      .prepare(
        "SELECT 1 AS ok FROM sqlite_master WHERE type = 'table' AND name = ?",
      )
      .get(table) as { ok: number } | undefined;
    if (sqliteHas == null) {
      console.info(`${table}\t(missing)\t—`);
      continue;
    }
    const sqliteCountSql =
      table === "magic_link_tokens" || table === "refresh_tokens"
        ? `SELECT COUNT(*) AS c FROM ${table} WHERE token_hash IS NOT NULL AND token_hash != ''`
        : `SELECT COUNT(*) AS c FROM ${table}`;
    const sqliteCount = (
      sqlite.prepare(sqliteCountSql).get() as {
        c: number;
      }
    ).c;
    const pgCount = Number(
      (
        await client.query<{ c: string }>(
          `SELECT COUNT(*)::text AS c FROM "${table}"`,
        )
      ).rows[0]!.c,
    );
    console.info(`${table}\t${sqliteCount}\t${pgCount}`);
    if (sqliteCount !== pgCount) {
      mismatches.push(`${table}: sqlite=${sqliteCount} postgres=${pgCount}`);
    }
  }

  if (mismatches.length > 0) {
    console.error("FAIL: count mismatches:\n" + mismatches.join("\n"));
    process.exit(1);
  }
  console.info("OK: checkpoint B3 passed (row counts match)");
} finally {
  await client.end();
  sqlite.close();
}
