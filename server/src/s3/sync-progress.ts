import { SyncProgressMessage } from "@shared";

/** Counters accumulated during `runSync` for the final summary line. */
export type SyncCompletionTally = {
  uploadedMedia: number;
  uploadedThumbs: number;
  downloadedMedia: number;
  downloadedThumbs: number;
  mergedMedia: number;
  deletedOrphanThumbsS3: number;
  deletedOrphanThumbsLocal: number;
};

export function buildSyncFailedProgress(detail: string): SyncProgressMessage {
  return {
    phase: "error",
    current: 0,
    total: 0,
    message: "Sync failed",
    error: detail,
  };
}

export function buildSyncDoneProgress(
  tally: SyncCompletionTally,
): SyncProgressMessage {
  const message = [
    `Sync complete.`,
    tally.uploadedMedia > 0 && `Uploaded ${tally.uploadedMedia} media`,
    tally.uploadedThumbs > 0 && `Uploaded ${tally.uploadedThumbs} thumbnails`,
    tally.downloadedMedia > 0 && `Downloaded ${tally.downloadedMedia} media`,
    tally.downloadedThumbs > 0 &&
      `Downloaded ${tally.downloadedThumbs} thumbnails`,
    tally.mergedMedia > 0 && `Added ${tally.mergedMedia} from backup`,
    tally.deletedOrphanThumbsS3 > 0 &&
      `Removed ${tally.deletedOrphanThumbsS3} orphaned S3 thumbnails`,
    tally.deletedOrphanThumbsLocal > 0 &&
      `Removed ${tally.deletedOrphanThumbsLocal} orphaned local thumbnails`,
  ]
    .filter(Boolean)
    .join(". ");
  return {
    phase: "done",
    current: 1,
    total: 1,
    message,
  };
}
