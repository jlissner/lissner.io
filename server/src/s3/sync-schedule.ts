import { syncDefer } from "./sync-defer.js";
import { isSyncInProgress } from "./sync-state.js";
import { runSync } from "./sync-runner.js";

/** Debounce multiple uploads into one sync (ms). */
const AUTO_BACKUP_DEBOUNCE_MS = 3500;

/**
 * Queue a full S3 sync after local changes (e.g. new upload). Debounced so bursts of uploads
 * trigger one sync. No-op if S3 is not configured. If a sync is already running, another run is
 * scheduled when it completes.
 */
export function scheduleBackupSyncAfterUpload(): void {
  if (syncDefer.debounceTimer) {
    clearTimeout(syncDefer.debounceTimer);
    syncDefer.debounceTimer = null;
  }

  syncDefer.debounceTimer = setTimeout(() => {
    syncDefer.debounceTimer = null;
    if (isSyncInProgress()) {
      syncDefer.pendingAfterCurrent = true;
      return;
    }
    void runSync().catch((err) => {
      console.error({ err }, "[s3-sync] Auto backup after upload failed");
    });
  }, AUTO_BACKUP_DEBOUNCE_MS);
}
