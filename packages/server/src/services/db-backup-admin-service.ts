import { GetObjectCommand } from "@aws-sdk/client-s3";
import { mkdir } from "fs/promises";
import path from "path";
import { S3_BUCKET } from "../config/env.js";
import { closeMediaPool } from "../db/pg-media.js";
import { restoreMediaDatabaseFromFile } from "../db/pg-backup.js";
import { unlinkBestEffort } from "../lib/fs-best-effort.js";
import { dbDir } from "../config/paths.js";
import { S3_PREFIX } from "../s3/sync-constants.js";
import {
  downloadS3ObjectToFile,
  listS3ObjectsWithMetadata,
} from "../s3/sync-transfer.js";
import { isSyncInProgress } from "../s3/sync-state.js";
import { s3Client } from "../s3/client.js";
import { logger } from "../logger.js";

type DbBackupListItem = {
  key: string;
  size: number;
  lastModified: string;
};

const isBackupObjectKey = (key: string): boolean => key.endsWith(".dump");

export async function listDbBackupsForAdmin(): Promise<
  | { ok: true; backups: DbBackupListItem[] }
  | { ok: false; reason: "not_configured"; missingVars: string[] }
> {
  const bucket = S3_BUCKET;
  const objects = await listS3ObjectsWithMetadata(
    s3Client,
    bucket,
    `${S3_PREFIX}/db/`,
  );
  const backups = objects
    .filter((o) => isBackupObjectKey(o.key))
    .map((o) => ({ key: o.key, size: o.size, lastModified: o.lastModified }))
    .sort((a, b) => a.key.localeCompare(b.key));
  return { ok: true, backups };
}

function isValidDbBackupKey(key: string): boolean {
  if (!key.startsWith(`${S3_PREFIX}/db/`)) return false;
  if (!isBackupObjectKey(key)) return false;
  if (key.includes("..")) return false;
  return true;
}

type RestoreDbResult =
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

export async function restoreDbFromS3BackupKey(
  key: string,
): Promise<RestoreDbResult> {
  if (!isValidDbBackupKey(key)) return { ok: false, reason: "invalid_key" };
  if (isSyncInProgress()) return { ok: false, reason: "sync_in_progress" };
  const bucket = S3_BUCKET;

  await closeMediaPool();
  const tempPath = path.join(dbDir, `.admin_restore_${Date.now()}.dump`);
  try {
    await mkdir(dbDir, { recursive: true });
    const getRes = await s3Client.send(
      new GetObjectCommand({ Bucket: bucket, Key: key }),
    );
    const body = getRes.Body;
    if (!body) return { ok: false, reason: "download_failed" };
    await downloadS3ObjectToFile(body, tempPath);
    await restoreMediaDatabaseFromFile(tempPath);
    return { ok: true };
  } catch (err) {
    logger.error({ err }, "[admin-db-restore] pg restore failed");
    return { ok: false, reason: "download_failed" };
  } finally {
    await unlinkBestEffort(tempPath, "cleanup temp pg dump");
  }
}
