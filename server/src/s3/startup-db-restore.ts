import { GetObjectCommand } from "@aws-sdk/client-s3";
import Database from "better-sqlite3";
import { existsSync } from "fs";
import { mkdir, rename } from "fs/promises";
import path from "path";
import { dbDir, dbPath } from "../config/paths.js";
import { unlinkBestEffort } from "../lib/fs-best-effort.js";
import { S3_PREFIX } from "./sync-constants.js";
import { s3Client } from "./client.js";
import { downloadS3ObjectToFile, listAllS3Keys } from "./sync-transfer.js";
import { S3_BUCKET } from "../config/env.js";
import { gray, green, red, yellow } from "yoctocolors";

type StartupDbRestoreResult =
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

  try {
    const keys = await listAllS3Keys(s3Client, S3_BUCKET, `${S3_PREFIX}/db/`);
    const newestKey = pickNewestDbKey(keys);
    if (!newestKey) return { restored: false, reason: "no_backups" };

    await mkdir(dbDir, { recursive: true });
    const tempPath = path.join(dbDir, ".startup_restore.db");

    const getRes = await s3Client.send(
      new GetObjectCommand({ Bucket: S3_BUCKET, Key: newestKey }),
    );
    const body = getRes.Body;
    if (!body) return { restored: false, reason: "download_failed" };

    await downloadS3ObjectToFile(body, tempPath);

    if (!validateSqliteDbFile(tempPath)) {
      await unlinkBestEffort(
        tempPath,
        "[startup-restore] remove invalid downloaded db",
      );
      console.warn(
        { key: newestKey },
        "[startup-restore] Downloaded DB failed integrity_check; skipping restore",
      );
      return { restored: false, reason: "invalid_db" };
    }

    await rename(tempPath, dbPath);

    console.info(green("Restored DB from S3 backup"));
    console.info(`${gray("[KEY]")} ${yellow(newestKey)}`);

    return { restored: true, key: newestKey };
  } catch (err) {
    console.info();
    console.error(red("Failed to restore DB from S3"));
    console.error(red((err as Error).stack ?? "Unknown error"));

    throw err;
  }
}
