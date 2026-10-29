import { GetObjectCommand } from "@aws-sdk/client-s3";
import { logger } from "../logger.js";
import path from "path";
import * as db from "../db/media.js";
import {
  readdirOrEmptyWithWarn,
  unlinkBestEffort,
} from "../lib/fs-best-effort.js";
import { dbDir, mediaDir, thumbnailsDir } from "../config/paths.js";
import { deleteOrphanedLocalThumbnailFiles } from "../lib/orphan-thumbnails.js";
import { isUsableVideoThumbnailFile } from "../lib/video-thumbnail.js";
import { s3Client } from "./client.js";
import { S3_PREFIX } from "./sync-constants.js";
import { syncDefer } from "./sync-defer.js";
import { deleteOrphanS3Thumbnails } from "./sync-gc.js";
import {
  buildSyncDoneProgress,
  buildSyncFailedProgress,
  type SyncCompletionTally,
} from "./sync-progress.js";
import { emitSyncChanged, syncState } from "./sync-state.js";
import {
  downloadS3ObjectToFile,
  fileExists,
  listAllS3Keys,
  uploadLocalFileToS3,
} from "./sync-transfer.js";
import { S3_BUCKET } from "../config/env.js";
import { dumpMediaDatabaseToFile } from "../db/pg-backup.js";
import { mkdir } from "fs/promises";
import { SyncProgressMessage } from "@lissner/shared";

export async function runSync(
  onProgress?: (p: SyncProgressMessage) => void,
): Promise<SyncProgressMessage> {
  if (syncState.inProgress) {
    throw new Error("Sync already in progress");
  }

  syncState.inProgress = true;
  syncState.startedAt = new Date().toISOString();
  syncState.lastError = null;
  emitSyncChanged();

  const bucket = S3_BUCKET;

  const report = (p: SyncProgressMessage) => {
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
    const localMedia = await db.listMedia();
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
      await db.markMediaBackedUp(m.id);
      tally.uploadedMedia++;
      report({
        phase: "upload-media",
        current: i + 1,
        total: toUploadMedia.length,
        message: `Uploaded ${i + 1}/${toUploadMedia.length} media files`,
      });
    }

    // Mark media already in S3 (from previous syncs) as backed up
    await db.markMediaBackedUpByFilenames([...s3MediaFilenames]);

    // 3. Upload thumbnails (only if not already in S3; skip empty/corrupt local files)
    const localThumbs = await readdirOrEmptyWithWarn(
      thumbnailsDir,
      "[s3-sync] readdir thumbnails for upload",
    );
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

    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const dbBackupKey = `${S3_PREFIX}/db/media_${stamp}.dump`;
    const dumpPath = path.join(dbDir, `.sync_media_${stamp}.dump`);
    await mkdir(dbDir, { recursive: true });
    await dumpMediaDatabaseToFile(dumpPath);
    await uploadLocalFileToS3(s3Client, bucket, dbBackupKey, dumpPath);
    await unlinkBestEffort(dumpPath, "remove temp pg dump");

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
        await db.markMediaBackedUp(m.id);
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

    const mediaIds = new Set((await db.listMedia()).map((m) => m.id));
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
          logger.error({ err }, "[s3-sync] Queued backup sync failed");
        });
      });
    }
  }
}
