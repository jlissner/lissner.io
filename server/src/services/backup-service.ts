import type { BackupConfigResponse, BackupSyncStatusResponse } from "../../../shared/src/api.js";
import { buildActivitySnapshot } from "../activity/snapshot.js";
import { getIndexJobState } from "../indexing/job-store.js";
import { getS3Config, getSyncState, isSyncInProgress, runSync } from "../s3/sync.js";

export function getBackupConfig(): BackupConfigResponse {
  return getS3Config();
}

export function getSyncStatusBody(): BackupSyncStatusResponse {
  const snap = buildActivitySnapshot(getIndexJobState(), getSyncState(), getS3Config());
  const s = snap.sync;
  return {
    configured: s.configured,
    inProgress: s.inProgress,
    startedAt: s.startedAt,
    lastResult: s.lastResult,
    lastError: s.lastError,
  };
}

export type PrepareSyncResult =
  | { ok: true; execute: () => Promise<void> }
  | { ok: false; reason: "not_configured"; missingVars: string[] }
  | { ok: false; reason: "already_running" };

/** Validates config and exclusivity; caller sends HTTP response then runs `execute()` in the background. */
export function prepareSync(): PrepareSyncResult {
  const { configured, missingVars } = getS3Config();
  if (!configured) {
    return { ok: false, reason: "not_configured", missingVars };
  }
  if (isSyncInProgress()) {
    return { ok: false, reason: "already_running" };
  }
  return {
    ok: true,
    execute: async () => {
      await runSync();
    },
  };
}
