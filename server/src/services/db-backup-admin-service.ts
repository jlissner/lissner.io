import { GetObjectCommand } from "@aws-sdk/client-s3";
import { mkdir, rename } from "fs/promises";
import path from "path";
import { closeMediaDb, getDb } from "../db/media-db.js";
import { unlinkBestEffort } from "../lib/fs-best-effort.js";
import { resetMediaMotionStatementCache } from "../db/media-motion.js";
import { resetMediaPeopleStatementCache } from "../db/media-people.js";
import { resetMediaReadStatementCache } from "../db/media-read.js";
import { resetMediaWriteStatementCache } from "../db/media-write.js";
import { dbDir, dbPath } from "../config/paths.js";
import { validateSqliteDbFile } from "../s3/startup-db-restore.js";
import { S3_PREFIX } from "../s3/sync-constants.js";
import {
  downloadS3ObjectToFile,
  listS3ObjectsWithMetadata,
} from "../s3/sync-transfer.js";
import { isSyncInProgress } from "../s3/sync-state.js";
import { S3_BUCKET } from "../config/env.js";
import { s3Client } from "../s3/client.js";
import { gray, red } from "yoctocolors";

type DbBackupListItem = {
  key: string;
  size: number;
  lastModified: string;
};

export async function listDbBackupsForAdmin(): Promise<
  | { ok: true; backups: DbBackupListItem[] }
  | { ok: false; reason: "not_configured"; missingVars: string[] }
> {
  const bucket = process.env.S3_BUCKET!;
  const objects = await listS3ObjectsWithMetadata(
    s3Client,
    bucket,
    `${S3_PREFIX}/db/`,
  );
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
  const bucket = S3_BUCKET!;

  closeMediaDb();
  resetMediaReadStatementCache();
  resetMediaWriteStatementCache();
  resetMediaMotionStatementCache();
  resetMediaPeopleStatementCache();

  const tempPath = path.join(dbDir, `.admin_restore_${Date.now()}.db`);

  const outcome = await (async (): Promise<RestoreDbResult> => {
    try {
      await mkdir(dbDir, { recursive: true });
      const getRes = await s3Client.send(
        new GetObjectCommand({ Bucket: bucket, Key: key }),
      );
      const body = getRes.Body;
      if (!body) {
        return { ok: false, reason: "download_failed" };
      }
      await downloadS3ObjectToFile(body, tempPath);
      if (!validateSqliteDbFile(tempPath)) {
        await unlinkBestEffort(tempPath, "remove invalid temp db");
        return { ok: false, reason: "invalid_db" };
      }
      await unlinkBestEffort(dbPath, "replace live db");
      await rename(tempPath, dbPath);
      return { ok: true };
    } catch (err) {
      console.info();
      console.error(`${gray("[ADMIN-DB-RESTORE]")} ${red("restore failed")}`);
      console.error(red((err as Error).stack ?? "Unknown error"));

      await unlinkBestEffort(tempPath, "cleanup temp db after failure");
      return { ok: false, reason: "download_failed" };
    }
  })();

  try {
    getDb();
  } catch (err) {
    console.error(
      { err },
      "[admin-db-restore] failed to reopen DB after restore attempt",
    );
    throw err;
  }
  return outcome;
}
