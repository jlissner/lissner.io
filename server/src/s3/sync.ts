import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { readdir, readFile, writeFile, access, unlink } from "fs/promises";
import path from "path";
import type { Readable } from "stream";
import Database from "better-sqlite3";
import * as db from "../db/media.js";
import * as authDb from "../db/auth.js";
import { dbPath, mediaDir, syncTempDbPath, thumbnailsDir } from "../config/paths.js";

const S3_VARS = ["AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_REGION", "S3_BUCKET"] as const;

export function getS3Config(): {
  configured: boolean;
  missingVars: string[];
} {
  const missingVars = S3_VARS.filter((v) => !process.env[v]?.trim());
  return {
    configured: missingVars.length === 0,
    missingVars,
  };
}

export function createS3Client(): S3Client | null {
  const { configured } = getS3Config();
  if (!configured) return null;

  return new S3Client({
    region: process.env.AWS_REGION!,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });
}

const S3_PREFIX = "backup";

export interface SyncProgress {
  phase:
    | "listing"
    | "upload-media"
    | "upload-thumbnails"
    | "upload-db"
    | "download-media"
    | "download-thumbnails"
    | "merge-db"
    | "done"
    | "error";
  current: number;
  total: number;
  message: string;
  error?: string;
}

const syncState = {
  inProgress: false,
  startedAt: null as string | null,
  lastResult: null as SyncProgress | null,
  lastError: null as string | null,
};

const syncBridge = {
  listener: null as (() => void) | null,
};

/** Wired in `index.ts` to push WebSocket activity updates. */
export function setSyncChangeListener(fn: (() => void) | null): void {
  syncBridge.listener = fn;
}

function emitSyncChanged(): void {
  syncBridge.listener?.();
}

export function getSyncState() {
  return { ...syncState };
}

export function isSyncInProgress() {
  return syncState.inProgress;
}

/** If a sync is running when an auto-backup was requested, run again when it finishes. */
const syncDefer = {
  pendingAfterCurrent: false,
  debounceTimer: null as ReturnType<typeof setTimeout> | null,
};

/** Debounce multiple uploads into one sync (ms). */
const AUTO_BACKUP_DEBOUNCE_MS = 3500;

/**
 * Queue a full S3 sync after local changes (e.g. new upload). Debounced so bursts of uploads
 * trigger one sync. No-op if S3 is not configured. If a sync is already running, another run is
 * scheduled when it completes.
 */
export function scheduleBackupSyncAfterUpload(): void {
  if (!getS3Config().configured) return;

  if (syncDefer.debounceTimer) {
    clearTimeout(syncDefer.debounceTimer);
    syncDefer.debounceTimer = null;
  }

  syncDefer.debounceTimer = setTimeout(() => {
    syncDefer.debounceTimer = null;
    if (syncState.inProgress) {
      syncDefer.pendingAfterCurrent = true;
      return;
    }
    void runSync().catch((err) => {
      console.error("[s3-sync] Auto backup after upload failed:", err);
    });
  }, AUTO_BACKUP_DEBOUNCE_MS);
}

async function listAllS3Keys(
  client: S3Client,
  bucket: string,
  prefix: string
): Promise<Set<string>> {
  const keys = new Set<string>();
  const paging = { token: undefined as string | undefined };
  do {
    const res = await client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
        ContinuationToken: paging.token,
      })
    );
    for (const obj of res.Contents ?? []) {
      if (obj.Key) keys.add(obj.Key);
    }
    paging.token = res.NextContinuationToken;
  } while (paging.token);
  return keys;
}

function fileExists(filePath: string): Promise<boolean> {
  return access(filePath)
    .then(() => true)
    .catch(() => false);
}

async function streamToBuffer(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

export async function runSync(onProgress?: (p: SyncProgress) => void): Promise<SyncProgress> {
  const client = createS3Client();
  if (!client) {
    const { missingVars } = getS3Config();
    const err: SyncProgress = {
      phase: "error",
      current: 0,
      total: 0,
      message: "S3 not configured",
      error: `Missing: ${missingVars.join(", ")}`,
    };
    syncState.lastResult = err;
    syncState.lastError = err.error ?? null;
    emitSyncChanged();
    throw new Error(err.error);
  }

  if (syncState.inProgress) {
    throw new Error("Sync already in progress");
  }

  syncState.inProgress = true;
  syncState.startedAt = new Date().toISOString();
  syncState.lastError = null;
  emitSyncChanged();

  const bucket = process.env.S3_BUCKET!;

  const report = (p: SyncProgress) => {
    syncState.lastResult = p;
    onProgress?.(p);
    emitSyncChanged();
  };

  const tally = {
    uploadedMedia: 0,
    uploadedThumbs: 0,
    downloadedMedia: 0,
    downloadedThumbs: 0,
    mergedMedia: 0,
  };

  try {
    // 1. List what's in S3
    report({
      phase: "listing",
      current: 0,
      total: 1,
      message: "Listing S3 contents…",
    });

    const [s3MediaKeys, s3ThumbKeys, s3DbKeys] = await Promise.all([
      listAllS3Keys(client, bucket, `${S3_PREFIX}/media/`),
      listAllS3Keys(client, bucket, `${S3_PREFIX}/thumbnails/`),
      listAllS3Keys(client, bucket, `${S3_PREFIX}/db/`),
    ]);

    const s3MediaFilenames = new Set(
      [...s3MediaKeys].map((k) => k.replace(`${S3_PREFIX}/media/`, ""))
    );
    const s3ThumbFilenames = new Set(
      [...s3ThumbKeys].map((k) => k.replace(`${S3_PREFIX}/thumbnails/`, ""))
    );

    // 2. Upload media (only if not yet backed up per backed_up_at)
    const localMedia = db.listMedia();
    const toUploadMedia: typeof localMedia = [];
    for (const m of localMedia) {
      if (!m.backedUpAt && (await fileExists(path.join(mediaDir, m.filename)))) {
        toUploadMedia.push(m);
      }
    }

    report({
      phase: "upload-media",
      current: 0,
      total: toUploadMedia.length,
      message: `Uploading ${toUploadMedia.length} new media files…`,
    });

    for (const [i, m] of toUploadMedia.entries()) {
      const filePath = path.join(mediaDir, m.filename);
      const body = await readFile(filePath);
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: `${S3_PREFIX}/media/${m.filename}`,
          Body: body,
        })
      );
      db.markMediaBackedUp(m.id);
      tally.uploadedMedia++;
      report({
        phase: "upload-media",
        current: i + 1,
        total: toUploadMedia.length,
        message: `Uploaded ${i + 1}/${toUploadMedia.length} media files`,
      });
    }

    // Mark media already in S3 (from previous syncs) as backed up
    db.markMediaBackedUpByFilenames([...s3MediaFilenames]);

    // 3. Upload thumbnails (only if not already in S3)
    const localThumbs = await readdir(thumbnailsDir).catch(() => []);
    const toUploadThumbs = localThumbs.filter((f) => !s3ThumbFilenames.has(f));

    report({
      phase: "upload-thumbnails",
      current: 0,
      total: toUploadThumbs.length,
      message: `Uploading ${toUploadThumbs.length} new thumbnails…`,
    });

    for (const [i, filename] of toUploadThumbs.entries()) {
      const filePath = path.join(thumbnailsDir, filename);
      const body = await readFile(filePath);
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: `${S3_PREFIX}/thumbnails/${filename}`,
          Body: body,
        })
      );
      tally.uploadedThumbs++;
      report({
        phase: "upload-thumbnails",
        current: i + 1,
        total: toUploadThumbs.length,
        message: `Uploaded ${i + 1}/${toUploadThumbs.length} thumbnails`,
      });
    }

    // 4. Upload DB (always, to keep remote in sync)
    report({
      phase: "upload-db",
      current: 0,
      total: 1,
      message: "Uploading database…",
    });

    const dbBuffer = await readFile(dbPath);
    const dbBackupKey = `${S3_PREFIX}/db/media_${new Date().toISOString().replace(/[:.]/g, "-")}.db`;
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: dbBackupKey,
        Body: dbBuffer,
      })
    );

    // 5. Download missing media from S3
    const sortedDbKeys = [...s3DbKeys]
      .filter((k) => k.endsWith(".db"))
      .sort()
      .reverse();

    const backupDbPath: string | null =
      sortedDbKeys.length > 0
        ? await (async (): Promise<string | null> => {
            const latestDbKey = sortedDbKeys[0];
            const getRes = await client.send(
              new GetObjectCommand({ Bucket: bucket, Key: latestDbKey })
            );
            const dbStream = getRes.Body;
            if (!dbStream) return null;
            const dbBuffer2 = await streamToBuffer(dbStream as Readable);
            await writeFile(syncTempDbPath, dbBuffer2);
            return syncTempDbPath;
          })()
        : null;

    // Download: media in our DB but file missing, and exists in S3
    const toDownloadMedia: typeof localMedia = [];
    for (const m of localMedia) {
      if (
        !(await fileExists(path.join(mediaDir, m.filename))) &&
        s3MediaFilenames.has(m.filename)
      ) {
        toDownloadMedia.push(m);
      }
    }

    report({
      phase: "download-media",
      current: 0,
      total: toDownloadMedia.length,
      message: `Downloading ${toDownloadMedia.length} missing media files…`,
    });

    for (const [i, m] of toDownloadMedia.entries()) {
      const getRes = await client.send(
        new GetObjectCommand({
          Bucket: bucket,
          Key: `${S3_PREFIX}/media/${m.filename}`,
        })
      );
      const stream = getRes.Body;
      if (stream) {
        const buf = await streamToBuffer(stream as Readable);
        await writeFile(path.join(mediaDir, m.filename), buf);
        db.markMediaBackedUp(m.id);
        tally.downloadedMedia++;
      }
      report({
        phase: "download-media",
        current: i + 1,
        total: toDownloadMedia.length,
        message: `Downloaded ${i + 1}/${toDownloadMedia.length} media files`,
      });
    }

    // 6. Download missing thumbnails (for videos we have)
    const videoIds = new Set(
      localMedia.filter((m) => m.mimeType.startsWith("video/")).map((m) => m.id)
    );
    const toDownloadThumbs: string[] = [];
    for (const id of videoIds) {
      if (
        !(await fileExists(path.join(thumbnailsDir, `${id}.jpg`))) &&
        s3ThumbFilenames.has(`${id}.jpg`)
      ) {
        toDownloadThumbs.push(id);
      }
    }

    report({
      phase: "download-thumbnails",
      current: 0,
      total: toDownloadThumbs.length,
      message: `Downloading ${toDownloadThumbs.length} missing thumbnails…`,
    });

    for (const [i, id] of toDownloadThumbs.entries()) {
      const key = `${S3_PREFIX}/thumbnails/${id}.jpg`;
      const getRes = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
      const stream = getRes.Body;
      if (stream) {
        const buf = await streamToBuffer(stream as Readable);
        await writeFile(path.join(thumbnailsDir, `${id}.jpg`), buf);
        tally.downloadedThumbs++;
      }
      report({
        phase: "download-thumbnails",
        current: i + 1,
        total: toDownloadThumbs.length,
        message: `Downloaded ${i + 1}/${toDownloadThumbs.length} thumbnails`,
      });
    }

    // 7. Merge: media in backup DB but not in our DB - insert and download
    const defaultOwnerId = authDb.getDefaultOwnerId();
    if (backupDbPath && defaultOwnerId) {
      const backupDb = new Database(backupDbPath, { readonly: true });
      const localIds = new Set(localMedia.map((m) => m.id));
      const backupRows = backupDb
        .prepare(
          `SELECT id, filename, original_name as originalName, mime_type as mimeType, size, uploaded_at as uploadedAt, date_taken as dateTaken, latitude, longitude FROM media`
        )
        .all() as Array<{
        id: string;
        filename: string;
        originalName: string;
        mimeType: string;
        size: number;
        uploadedAt: string;
        dateTaken?: string | null;
        latitude?: number | null;
        longitude?: number | null;
      }>;

      const toMerge = backupRows.filter((r) => !localIds.has(r.id));
      report({
        phase: "merge-db",
        current: 0,
        total: toMerge.length,
        message: `Adding ${toMerge.length} media from backup…`,
      });

      for (const [i, r] of toMerge.entries()) {
        const inserted = db.insertMediaFromBackup(
          {
            id: r.id,
            filename: r.filename,
            originalName: r.originalName,
            mimeType: r.mimeType,
            size: r.size,
            uploadedAt: r.uploadedAt,
            dateTaken: r.dateTaken,
            latitude: r.latitude,
            longitude: r.longitude,
          },
          defaultOwnerId
        );
        if (inserted) tally.mergedMedia++;

        // Download file if in S3 and not local
        if (s3MediaFilenames.has(r.filename)) {
          const localPath = path.join(mediaDir, r.filename);
          if (!(await fileExists(localPath))) {
            const getRes = await client.send(
              new GetObjectCommand({
                Bucket: bucket,
                Key: `${S3_PREFIX}/media/${r.filename}`,
              })
            );
            const stream = getRes.Body;
            if (stream) {
              const buf = await streamToBuffer(stream as Readable);
              await writeFile(localPath, buf);
              tally.downloadedMedia++;
            }
          }
        }

        report({
          phase: "merge-db",
          current: i + 1,
          total: toMerge.length,
          message: `Added ${i + 1}/${toMerge.length} from backup`,
        });
      }

      backupDb.close();
      await unlink(backupDbPath).catch(() => {});
    }

    const result: SyncProgress = {
      phase: "done",
      current: 1,
      total: 1,
      message: [
        `Sync complete.`,
        tally.uploadedMedia > 0 && `Uploaded ${tally.uploadedMedia} media`,
        tally.uploadedThumbs > 0 && `Uploaded ${tally.uploadedThumbs} thumbnails`,
        tally.downloadedMedia > 0 && `Downloaded ${tally.downloadedMedia} media`,
        tally.downloadedThumbs > 0 && `Downloaded ${tally.downloadedThumbs} thumbnails`,
        tally.mergedMedia > 0 && `Added ${tally.mergedMedia} from backup`,
      ]
        .filter(Boolean)
        .join(". "),
    };
    report(result);
    syncState.lastError = null;
    return result;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const result: SyncProgress = {
      phase: "error",
      current: 0,
      total: 0,
      message: "Sync failed",
      error: msg,
    };
    report(result);
    syncState.lastError = msg;
    throw err;
  } finally {
    syncState.inProgress = false;
    emitSyncChanged();
    if (syncDefer.pendingAfterCurrent) {
      syncDefer.pendingAfterCurrent = false;
      setImmediate(() => {
        void runSync().catch((err) => {
          console.error("[s3-sync] Queued backup sync failed:", err);
        });
      });
    }
  }
}

/** Download a single media file from S3 when the DB says it was backed up but the local file is missing. */
export async function tryRestoreMediaFromBackup(item: {
  id: string;
  filename: string;
  backedUpAt?: string | null;
}): Promise<boolean> {
  if (!item.backedUpAt) return false;
  const localPath = path.join(mediaDir, item.filename);
  if (await fileExists(localPath)) return true;
  const client = createS3Client();
  if (!client) {
    console.warn("restore: S3 not configured; cannot restore media", item.id);
    return false;
  }
  const bucket = process.env.S3_BUCKET!;
  try {
    const getRes = await client.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: `${S3_PREFIX}/media/${item.filename}`,
      })
    );
    const stream = getRes.Body;
    if (!stream) return false;
    const buf = await streamToBuffer(stream as Readable);
    await writeFile(localPath, buf);
    return true;
  } catch (err) {
    console.error("restore: failed to download media from S3:", item.id, err);
    return false;
  }
}

/** Download a cached video thumbnail from S3 when present in backup. */
export async function tryRestoreVideoThumbnailFromBackup(mediaId: string): Promise<boolean> {
  const thumbPath = path.join(thumbnailsDir, `${mediaId}.jpg`);
  if (await fileExists(thumbPath)) return true;
  const client = createS3Client();
  if (!client) return false;
  const bucket = process.env.S3_BUCKET!;
  try {
    const getRes = await client.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: `${S3_PREFIX}/thumbnails/${mediaId}.jpg`,
      })
    );
    const stream = getRes.Body;
    if (!stream) return false;
    const buf = await streamToBuffer(stream as Readable);
    await writeFile(thumbPath, buf);
    return true;
  } catch (err) {
    console.error("restore: failed to download thumbnail from S3:", mediaId, err);
    return false;
  }
}
