import { GetObjectCommand } from "@aws-sdk/client-s3";
import Database from "better-sqlite3";
import { existsSync } from "fs";
import { mkdir, rename, unlink } from "fs/promises";
import path from "path";
import { dbDir, dbPath } from "../config/paths.js";
import { logger } from "../logger.js";
import { S3_PREFIX } from "./sync-constants.js";
import { createS3Client, getS3Config } from "./sync-client.js";
import { downloadS3ObjectToFile, listAllS3Keys } from "./sync-transfer.js";

export type StartupDbRestoreResult =
  | {
      restored: false;
      reason:
        | "local_exists"
        | "not_configured"
        | "no_backups"
        | "download_failed"
        | "invalid_db";
    }
  | { restored: true; key: string };

export function validateSqliteDbFile(dbFilePath: string): boolean {
  try {
    const db = new Database(dbFilePath, { readonly: true });
    const row = db.prepare("PRAGMA integrity_check").get() as
      | { integrity_check?: string }
      | undefined;
    db.close();
    return row?.integrity_check === "ok";
  } catch {
    return false;
  }
}

function pickNewestDbKey(keys: Iterable<string>): string | null {
  const dbKeys = [...keys].filter(
    (k) => k.startsWith(`${S3_PREFIX}/db/`) && k.endsWith(".db"),
  );
  if (dbKeys.length === 0) return null;
  // Keys are `backup/db/media_<iso-with-:-. replaced>.db`; lexicographic sort matches chronological.
  return dbKeys.sort().at(-1) ?? null;
}

export async function maybeRestoreDbFromLatestS3BackupOnStartup(): Promise<StartupDbRestoreResult> {
  if (existsSync(dbPath)) return { restored: false, reason: "local_exists" };

  const s3 = getS3Config();
  if (!s3.configured) return { restored: false, reason: "not_configured" };

  const client = createS3Client();
  if (!client) return { restored: false, reason: "not_configured" };

  const bucket = process.env.S3_BUCKET!;

  try {
    const keys = await listAllS3Keys(client, bucket, `${S3_PREFIX}/db/`);
    const newestKey = pickNewestDbKey(keys);
    if (!newestKey) return { restored: false, reason: "no_backups" };

    await mkdir(dbDir, { recursive: true });
    const tempPath = path.join(dbDir, ".startup_restore.db");

    const getRes = await client.send(
      new GetObjectCommand({ Bucket: bucket, Key: newestKey }),
    );
    const body = getRes.Body;
    if (!body) return { restored: false, reason: "download_failed" };

    await downloadS3ObjectToFile(body, tempPath);

    if (!validateSqliteDbFile(tempPath)) {
      await unlink(tempPath).catch(() => {});
      logger.warn(
        { key: newestKey },
        "[startup-restore] Downloaded DB failed integrity_check; skipping restore",
      );
      return { restored: false, reason: "invalid_db" };
    }

    await rename(tempPath, dbPath);
    logger.info(
      { key: newestKey },
      "[startup-restore] Restored DB from S3 backup",
    );
    return { restored: true, key: newestKey };
  } catch (err) {
    logger.warn(
      { err },
      "[startup-restore] Failed to restore DB from S3 (continuing startup)",
    );
    return { restored: false, reason: "download_failed" };
  }
}

// exported for unit tests
export const __private = { pickNewestDbKey, validateSqliteDbFile };
