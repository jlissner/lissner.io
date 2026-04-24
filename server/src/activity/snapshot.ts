import type { ActivitySnapshot, SyncProgressMessage } from "./types.js";
import type { IndexJobState } from "../indexing/job.js";

export function buildActivitySnapshot(
  index: IndexJobState,
  sync: {
    inProgress: boolean;
    startedAt: string | null;
    lastResult: SyncProgressMessage | null;
    lastError: string | null;
  },
): ActivitySnapshot {
  const elapsedSeconds =
    index.inProgress && index.startedAt
      ? Math.floor((Date.now() - new Date(index.startedAt).getTime()) / 1000)
      : null;

  return {
    v: 1,
    index: {
      inProgress: index.inProgress,
      jobId: index.jobId,
      startedAt: index.startedAt,
      elapsedSeconds,
      progressProcessed: index.progressProcessed,
      progressTotal: index.progressTotal,
      lastResult: index.lastResult ? { ...index.lastResult } : null,
      lastError: index.lastError,
    },
    sync: {
      inProgress: sync.inProgress,
      startedAt: sync.startedAt,
      lastResult: sync.lastResult ? { ...sync.lastResult } : null,
      lastError: sync.lastError,
    },
  };
}
