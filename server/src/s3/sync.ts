/**
 * S3 backup sync — public API and types. Implementation is split under `./sync-*.ts`.
 */

export type { SyncPhase, SyncProgress, SyncProgressMessage } from "./sync-types.js";
export { getS3Config, createS3Client } from "./sync-client.js";
export { setSyncChangeListener, getSyncState, isSyncInProgress } from "./sync-state.js";
export { scheduleBackupSyncAfterUpload } from "./sync-schedule.js";
export { runSync } from "./sync-runner.js";
export {
  deleteMediaFromS3,
  tryRestoreMediaFromBackup,
  tryRestoreVideoThumbnailFromBackup,
} from "./sync-restore.js";
