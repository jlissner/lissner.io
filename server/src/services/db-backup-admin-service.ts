import { GetObjectCommand } from "@aws-sdk/client-s3";
import { mkdir, rename, unlink } from "fs/promises";
import path from "path";
import { closeAuthDb, reopenAuthDb } from "../db/auth.js";
import { closeMediaDb, getDb } from "../db/media-db.js";
import { resetMediaMotionStatementCache } from "../db/media-motion.js";
import { resetMediaPeopleStatementCache } from "../db/media-people.js";
import { resetMediaReadStatementCache } from "../db/media-read.js";
import { resetMediaWriteStatementCache } from "../db/media-write.js";
import { dbDir, dbPath } from "../config/paths.js";
import { logger } from "../logger.js";
import { validateSqliteDbFile } from "../s3/startup-db-restore.js";
import { S3_PREFIX } from "../s3/sync-constants.js";
import { createS3Client, getS3Config } from "../s3/sync-client.js";
import { downloadS3ObjectToFile, listS3ObjectsWithMetadata } from "../s3/sync-transfer.js";
import { isSyncInProgress } from "../s3/sync-state.js";

export type DbBackupListItem = {
  key: string;
  size: number;
  lastModified: string;
};

export async function listDbBackupsForAdmin(): Promise<
  | { ok: true; backups: DbBackupListItem[] }
  | { ok: false; reason: "not_configured"; missingVars: string[] }
> {
  const s3 = getS3Config();
  if (!s3.configured) return { ok: false, reason: "not_configured", missingVars: s3.missingVars };
  const client = createS3Client();
  if (!client) return { ok: false, reason: "not_configured", missingVars: s3.missingVars };
  const bucket = process.env.S3_BUCKET!;
  const objects = await listS3ObjectsWithMetadata(client, bucket, `${S3_PREFIX}/db/`);
  const backups = objects
    .filter((o) => o.key.endsWith(".db"))
    .map((o) => ({ key: o.key, size: o.size, lastModified: o.lastModified }))
    .sort((a, b) => a.key.localeCompare(b.key));
  return { ok: true, backups };
}

function isValidDbBackupKey(key: string): boolean {
  if (!key.startsWith(`${S3_PREFIX}/db/`)) return false;
  if (!key.endsWith(".db")) return false;
  if (key.includes("..")) return false;
  return true;
}

export type RestoreDbResult =
  | { ok: true }
  | {
      ok: false;
      reason:
        | "not_configured"
        | "sync_in_progress"
        | "invalid_key"
        | "download_failed"
        | "invalid_db";
    };

export async function restoreDbFromS3BackupKey(key: string): Promise<RestoreDbResult> {
  if (!isValidDbBackupKey(key)) return { ok: false, reason: "invalid_key" };
  if (isSyncInProgress()) return { ok: false, reason: "sync_in_progress" };
  const s3 = getS3Config();
  if (!s3.configured) return { ok: false, reason: "not_configured" };
  const client = createS3Client();
  if (!client) return { ok: false, reason: "not_configured" };
  const bucket = process.env.S3_BUCKET!;

  closeMediaDb();
  resetMediaReadStatementCache();
  resetMediaWriteStatementCache();
  resetMediaMotionStatementCache();
  resetMediaPeopleStatementCache();
  closeAuthDb();

  const tempPath = path.join(dbDir, `.admin_restore_${Date.now()}.db`);

  const outcome = await (async (): Promise<RestoreDbResult> => {
    try {
      await mkdir(dbDir, { recursive: true });
      const getRes = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
      const body = getRes.Body;
      if (!body) {
        return { ok: false, reason: "download_failed" };
      }
      await downloadS3ObjectToFile(body, tempPath);
      if (!validateSqliteDbFile(tempPath)) {
        await unlink(tempPath).catch(() => {});
        return { ok: false, reason: "invalid_db" };
      }
      await unlink(dbPath).catch(() => {});
      await rename(tempPath, dbPath);
      return { ok: true };
    } catch (err) {
      logger.error({ err, key }, "[admin-db-restore] restore failed");
      await unlink(tempPath).catch(() => {});
      return { ok: false, reason: "download_failed" };
    }
  })();

  try {
    reopenAuthDb();
    getDb();
  } catch (err) {
    logger.error({ err }, "[admin-db-restore] failed to reopen DB after restore attempt");
    throw err;
  }
  return outcome;
}
