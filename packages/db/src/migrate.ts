#!/usr/bin/env npx tsx
/**
 * Apply numbered SQL files under migrations/<target>/ to the matching database.
 * Usage: tsx packages/db/src/migrate.ts media
 */
import { readdir, readFile } from "fs/promises";
import path from "path";
import pg from "pg";
import { fileURLToPath } from "url";
import { localUrl, repoRoot } from "./env.js";

const target = process.argv[2];
if (target !== "media" && target !== "lissner") {
  console.error("usage: migrate.ts <media|lissner>");
  process.exit(1);
}

const migrationsDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "migrations",
  target,
);

const client = new pg.Client({ connectionString: localUrl(target) });
await client.connect();

try {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  const applied = new Set(
    (
      await client.query<{ version: number }>(
        "SELECT version FROM schema_migrations ORDER BY version",
      )
    ).rows.map((r) => r.version),
  );

  const files = (await readdir(migrationsDir))
    .filter((f) => /^\d+_.*\.sql$/.test(f))
    .sort();

  for (const file of files) {
    const version = Number(file.split("_")[0]);
    if (applied.has(version)) {
      console.info(`skip ${file} (already applied)`);
      continue;
    }
    const sql = await readFile(path.join(migrationsDir, file), "utf8");
    console.info(`apply ${file}`);
    await client.query("BEGIN");
    try {
      await client.query(sql);
      await client.query(
        "INSERT INTO schema_migrations (version) VALUES ($1) ON CONFLICT DO NOTHING",
        [version],
      );
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    }
  }

  console.info(`OK: ${target} migrations up to date (${repoRoot})`);
} finally {
  await client.end();
}
