import { GetObjectCommand } from "@aws-sdk/client-s3";
import Database from "better-sqlite3";
import { readdir, unlink } from "fs/promises";
import path from "path";
import * as authDb from "../db/auth.js";
import * as db from "../db/media.js";
import {
  dbPath,
  mediaDir,
  syncTempDbPath,
  thumbnailsDir,
} from "../config/paths.js";
import { deleteOrphanedLocalThumbnailFiles } from "../lib/orphan-thumbnails.js";
import { isUsableVideoThumbnailFile } from "../lib/video-thumbnail.js";
import { s3Client } from "./sync-client.js";
import { S3_PREFIX } from "./sync-constants.js";
import { syncDefer } from "./sync-defer.js";
import { deleteOrphanS3Thumbnails } from "./sync-gc.js";
import {
  buildSyncDoneProgress,
  buildSyncFailedProgress,
  type SyncCompletionTally,
} from "./sync-progress.js";
import { emitSyncChanged, syncState } from "./sync-state.js";
import type { SyncProgress } from "./sync-types.js";
import {
  downloadS3ObjectToFile,
  fileExists,
  listAllS3Keys,
  uploadLocalFileToS3,
} from "./sync-transfer.js";
import { S3_BUCKET } from "../config/env.js";

export async function runSync(
  onProgress?: (p: SyncProgress) => void,
): Promise<SyncProgress> {
  if (syncState.inProgress) {
    throw new Error("Sync already in progress");
  }

  syncState.inProgress = true;
  syncState.startedAt = new Date().toISOString();
  syncState.lastError = null;
  emitSyncChanged();

  const bucket = S3_BUCKET;

  const report = (p: SyncProgress) => {
    syncState.lastResult = p;
    onProgress?.(p);
    emitSyncChanged();
  };

  const tally: SyncCompletionTally = {
    uploadedMedia: 0,
    uploadedThumbs: 0,
    downloadedMedia: 0,
    downloadedThumbs: 0,
    mergedMedia: 0,
    deletedOrphanThumbsS3: 0,
    deletedOrphanThumbsLocal: 0,
  };

  try {
    // 1. List what's in S3
    report({
      phase: "listing",
      current: 0,
      total: 1,
      message: "Listing S3 contents…",
    });

    const [s3MediaKeys, s3ThumbKeys] = await Promise.all([
      listAllS3Keys(s3Client, bucket, `${S3_PREFIX}/media/`),
      listAllS3Keys(s3Client, bucket, `${S3_PREFIX}/thumbnails/`),
    ]);

    const s3MediaFilenames = new Set(
      [...s3MediaKeys].map((k) => k.replace(`${S3_PREFIX}/media/`, "")),
    );
    const s3ThumbFilenames = new Set(
      [...s3ThumbKeys].map((k) => k.replace(`${S3_PREFIX}/thumbnails/`, "")),
    );

    // 2. Upload media (only if not yet backed up per backed_up_at)
    const localMedia = db.listMedia();
    const toUploadMedia: typeof localMedia = [];
    for (const m of localMedia) {
      if (
        !m.backedUpAt &&
        (await fileExists(path.join(mediaDir, m.filename)))
      ) {
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
      await uploadLocalFileToS3(
        s3Client,
        bucket,
        `${S3_PREFIX}/media/${m.filename}`,
        filePath,
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

    // 3. Upload thumbnails (only if not already in S3; skip empty/corrupt local files)
    const localThumbs = await readdir(thumbnailsDir).catch(() => []);
    const toUploadThumbs: string[] = [];
    for (const f of localThumbs) {
      if (s3ThumbFilenames.has(f)) continue;
      const thumbPath = path.join(thumbnailsDir, f);
      if (await isUsableVideoThumbnailFile(thumbPath)) {
        toUploadThumbs.push(f);
      }
    }

    report({
      phase: "upload-thumbnails",
      current: 0,
      total: toUploadThumbs.length,
      message: `Uploading ${toUploadThumbs.length} new thumbnails…`,
    });

    for (const [i, filename] of toUploadThumbs.entries()) {
      const filePath = path.join(thumbnailsDir, filename);
      await uploadLocalFileToS3(
        s3Client,
        bucket,
        `${S3_PREFIX}/thumbnails/${filename}`,
        filePath,
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

    const dbBackupKey = `${S3_PREFIX}/db/media_${new Date().toISOString().replace(/[:.]/g, "-")}.db`;
    await uploadLocalFileToS3(s3Client, bucket, dbBackupKey, dbPath);

    // 5. Download missing media from S3
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
      const getRes = await s3Client.send(
        new GetObjectCommand({
          Bucket: bucket,
          Key: `${S3_PREFIX}/media/${m.filename}`,
        }),
      );
      const body = getRes.Body;
      if (body) {
        await downloadS3ObjectToFile(body, path.join(mediaDir, m.filename));
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
      localMedia
        .filter((m) => m.mimeType.startsWith("video/"))
        .map((m) => m.id),
    );
    const toDownloadThumbs: string[] = [];
    for (const id of videoIds) {
      const thumbPath = path.join(thumbnailsDir, `${id}.jpg`);
      if (
        !(await isUsableVideoThumbnailFile(thumbPath)) &&
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
      const getRes = await s3Client.send(
        new GetObjectCommand({ Bucket: bucket, Key: key }),
      );
      const body = getRes.Body;
      if (body) {
        await downloadS3ObjectToFile(
          body,
          path.join(thumbnailsDir, `${id}.jpg`),
        );
        tally.downloadedThumbs++;
      }
      report({
        phase: "download-thumbnails",
        current: i + 1,
        total: toDownloadThumbs.length,
        message: `Downloaded ${i + 1}/${toDownloadThumbs.length} thumbnails`,
      });
    }

    // 7. Merge: media in remote backup DB but not in our DB - insert and download.
    // Must use a DB snapshot from *after* step 4 (we upload current local state there). Listing at
    // sync start would point at an older backup that still contained rows we deleted locally, which
    // incorrectly re-inserted them here.
    const defaultOwnerId = authDb.getDefaultOwnerId();
    const s3DbKeysAfterUpload = await listAllS3Keys(
      s3Client,
      bucket,
      `${S3_PREFIX}/db/`,
    );
    const sortedMergeDbKeys = [...s3DbKeysAfterUpload]
      .filter((k) => k.endsWith(".db"))
      .sort()
      .reverse();
    const mergeDbKey =
      sortedMergeDbKeys.find((k) => k === dbBackupKey) ??
      sortedMergeDbKeys[0] ??
      null;

    const backupDbPath: string | null =
      mergeDbKey != null
        ? await (async (): Promise<string | null> => {
            const getRes = await s3Client.send(
              new GetObjectCommand({ Bucket: bucket, Key: mergeDbKey }),
            );
            const body = getRes.Body;
            if (!body) return null;
            await downloadS3ObjectToFile(body, syncTempDbPath);
            return syncTempDbPath;
          })()
        : null;

    if (backupDbPath) {
      const backupDb = new Database(backupDbPath, { readonly: true });
      const localIds = new Set(db.listMedia().map((m) => m.id));
      const backupRows = backupDb
        .prepare(
          `SELECT id, filename, original_name as originalName, mime_type as mimeType, size, uploaded_at as uploadedAt, date_taken as dateTaken, latitude, longitude FROM media`,
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
          defaultOwnerId,
        );
        if (inserted) tally.mergedMedia++;

        // Download file if in S3 and not local
        if (s3MediaFilenames.has(r.filename)) {
          const localPath = path.join(mediaDir, r.filename);
          if (!(await fileExists(localPath))) {
            const getRes = await s3Client.send(
              new GetObjectCommand({
                Bucket: bucket,
                Key: `${S3_PREFIX}/media/${r.filename}`,
              }),
            );
            const body = getRes.Body;
            if (body) {
              await downloadS3ObjectToFile(body, localPath);
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

    const mediaIds = new Set(db.listMedia().map((m) => m.id));
    tally.deletedOrphanThumbsS3 = await deleteOrphanS3Thumbnails(
      s3Client,
      bucket,
      s3ThumbKeys,
      mediaIds,
    );
    tally.deletedOrphanThumbsLocal = await deleteOrphanedLocalThumbnailFiles();

    const result = buildSyncDoneProgress(tally);
    report(result);
    syncState.lastError = null;
    return result;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const result = buildSyncFailedProgress(msg);
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
          console.error({ err }, "[s3-sync] Queued backup sync failed");
        });
      });
    }
  }
}
