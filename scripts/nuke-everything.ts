#!/usr/bin/env npx tsx
/**
 * Nuclear reset: local media, thumbnails, all media DB rows, and S3 backup/ prefix (if configured).
 *
 * Run: npm run nuke
 * Stop the server first so the DB pool is not holding connections.
 */

import { existsSync } from "fs";
import { readdir, stat, unlink } from "fs/promises";
import path from "path";
import { createInterface } from "readline";
import pg from "pg";
import {
  S3Client,
  ListObjectsV2Command,
  DeleteObjectsCommand,
} from "@aws-sdk/client-s3";
import { MEDIA_DATABASE_URL } from "../packages/server/src/config/env.js";
import {
  mediaDir,
  thumbnailsDir,
} from "../packages/server/src/config/paths.js";

const S3_PREFIX = "backup";

const TRUNCATE_SQL = `
  TRUNCATE TABLE
    refresh_tokens,
    magic_link_tokens,
    user_people,
    users,
    auth_whitelist,
    media_tags,
    image_people,
    embeddings,
    media,
    person_names
  RESTART IDENTITY CASCADE
`;

function s3Configured(): boolean {
  return [
    "AWS_ACCESS_KEY_ID",
    "AWS_SECRET_ACCESS_KEY",
    "AWS_REGION",
    "S3_BUCKET",
  ].every((k) => process.env[k]?.trim());
}

async function dirStats(
  dir: string,
): Promise<{ files: number; bytes: number }> {
  if (!existsSync(dir)) return { files: 0, bytes: 0 };
  const names = await readdir(dir);
  const acc = { files: 0, bytes: 0 };
  for (const name of names) {
    const p = path.join(dir, name);
    const st = await stat(p);
    if (st.isFile()) {
      acc.files++;
      acc.bytes += st.size;
    }
  }
  return acc;
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

async function listAllS3BackupObjects(
  client: S3Client,
  bucket: string,
): Promise<{ keys: string[]; bytes: number }> {
  const keys: string[] = [];
  const acc = { bytes: 0 };
  const paging = { token: undefined as string | undefined };
  do {
    const res = await client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: `${S3_PREFIX}/`,
        ContinuationToken: paging.token,
      }),
    );
    for (const obj of res.Contents ?? []) {
      if (obj.Key) {
        keys.push(obj.Key);
        acc.bytes += obj.Size ?? 0;
      }
    }
    paging.token = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (paging.token);
  return { keys, bytes: acc.bytes };
}

async function deleteS3Objects(
  client: S3Client,
  bucket: string,
  keys: string[],
): Promise<void> {
  const chunkSize = 1000;
  const chunkStarts = Array.from(
    { length: Math.ceil(keys.length / chunkSize) },
    (_, j) => j * chunkSize,
  );
  for (const start of chunkStarts) {
    const chunk = keys.slice(start, start + chunkSize);
    await client.send(
      new DeleteObjectsCommand({
        Bucket: bucket,
        Delete: {
          Objects: chunk.map((Key) => ({ Key })),
          Quiet: true,
        },
      }),
    );
  }
}

function ask(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function unlinkDirFiles(dir: string): Promise<number> {
  if (!existsSync(dir)) return 0;
  const acc = { n: 0 };
  const names = await readdir(dir);
  for (const name of names) {
    const p = path.join(dir, name);
    const st = await stat(p);
    if (st.isFile()) {
      await unlink(p);
      acc.n++;
    }
  }
  return acc.n;
}

async function mediaTableCounts(
  client: pg.Client,
): Promise<Record<string, number>> {
  const tables = await client.query<{ name: string }>(
    `SELECT table_name as name FROM information_schema.tables
     WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
     ORDER BY table_name`,
  );
  const counts: Record<string, number> = {};
  for (const { name } of tables.rows) {
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) continue;
    const row = await client.query<{ c: string }>(
      `SELECT COUNT(*)::text as c FROM ${name}`,
    );
    counts[name] = Number(row.rows[0]?.c ?? 0);
  }
  return counts;
}

async function main(): Promise<void> {
  console.log(
    "\n\x1b[1;31m══════════════════════════════════════════════════════════════\x1b[0m",
  );
  console.log(
    "\x1b[1;31m  NUCLEAR RESET — this will PERMANENTLY destroy local and cloud data\x1b[0m",
  );
  console.log(
    "\x1b[1;31m══════════════════════════════════════════════════════════════\x1b[0m\n",
  );

  const mediaStats = await dirStats(mediaDir);
  const thumbStats = await dirStats(thumbnailsDir);

  const client = new pg.Client({ connectionString: MEDIA_DATABASE_URL });
  await client.connect();
  const dbRowCounts = await mediaTableCounts(client);

  const s3List = { keys: [] as string[], bytes: 0 };
  if (s3Configured()) {
    const s3 = new S3Client({
      region: process.env.AWS_REGION!,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });
    const bucket = process.env.S3_BUCKET!;
    try {
      const listed = await listAllS3BackupObjects(s3, bucket);
      s3List.keys = listed.keys;
      s3List.bytes = listed.bytes;
    } catch (e) {
      await client.end();
      console.error("Failed to list S3 objects (is the bucket reachable?):", e);
      process.exit(1);
    }
  }

  console.log("The following will be removed:\n");
  console.log(`  Local media files     (${mediaDir})`);
  console.log(
    `    → ${mediaStats.files} file(s), ${formatBytes(mediaStats.bytes)}`,
  );
  console.log(`  Local thumbnails      (${thumbnailsDir})`);
  console.log(
    `    → ${thumbStats.files} file(s), ${formatBytes(thumbStats.bytes)}`,
  );
  console.log(
    `  Postgres media DB     (${MEDIA_DATABASE_URL.replace(/:[^:@/]+@/, ":***@")})`,
  );
  const totalRows = Object.values(dbRowCounts).reduce((a, b) => a + b, 0);
  console.log(
    `    → ALL ROWS in ${Object.keys(dbRowCounts).length} table(s) (${totalRows} total rows):`,
  );
  for (const [t, c] of Object.entries(dbRowCounts).sort(([a], [b]) =>
    a.localeCompare(b),
  )) {
    console.log(`        ${t}: ${c}`);
  }
  if (s3Configured()) {
    console.log(
      `  S3 backup prefix      (${S3_PREFIX}/ in ${process.env.S3_BUCKET})`,
    );
    console.log(
      `    → ${s3List.keys.length} object(s), ${formatBytes(s3List.bytes)}`,
    );
  } else {
    console.log(
      `  S3 backup prefix      (skipped — AWS/S3 not fully configured in env)`,
    );
  }

  console.log("\n\x1b[33mThis cannot be undone.\x1b[0m\n");

  const code = String(Math.floor(100000 + Math.random() * 900000));
  const answer = await ask(
    `Type the confirmation code \x1b[1m${code}\x1b[0m to proceed (or anything else to abort): `,
  );

  if (answer !== code) {
    await client.end();
    console.log("\nAborted.\n");
    process.exit(0);
  }

  console.log("\nDeleting local files…");
  const removedMedia = await unlinkDirFiles(mediaDir);
  const removedThumbs = await unlinkDirFiles(thumbnailsDir);
  console.log(
    `  Removed ${removedMedia} media file(s), ${removedThumbs} thumbnail file(s).`,
  );

  if (s3Configured() && s3List.keys.length > 0) {
    console.log(`\nDeleting ${s3List.keys.length} S3 object(s)…`);
    const s3 = new S3Client({
      region: process.env.AWS_REGION!,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });
    await deleteS3Objects(s3, process.env.S3_BUCKET!, s3List.keys);
    console.log("  S3 backup prefix cleared.");
  }

  console.log("\nEmptying media database tables…");
  await client.query(TRUNCATE_SQL);
  await client.end();
  console.log("  All tables truncated.");

  console.log(
    "\n\x1b[32mDone.\x1b[0m Restart the server before using the app.\n",
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
