/** Shared payload for indexing + S3 sync activity (HTTP + WebSocket). */

/** Phases emitted by `runSync` and surfaced on `/api/backup/status` + WebSocket activity. */
export type SyncPhase =
  | "listing"
  | "upload-media"
  | "upload-thumbnails"
  | "upload-db"
  | "download-media"
  | "download-thumbnails"
  | "merge-db"
  | "done"
  | "error";

export interface SyncProgressMessage {
  phase: SyncPhase;
  current: number;
  total: number;
  message: string;
  error?: string;
}

export interface IndexActivitySlice {
  inProgress: boolean;
  /** Set while a bulk index job from POST /api/search/index is running. */
  jobId: string | null;
  startedAt: string | null;
  /** Seconds since startedAt when in progress; null otherwise. */
  elapsedSeconds: number | null;
  progressProcessed: number;
  progressTotal: number;
  lastResult: {
    indexed: number;
    skipped: number;
    total: number;
    cancelled?: boolean;
  } | null;
  lastError: string | null;
}

export interface SyncActivitySlice {
  inProgress: boolean;
  startedAt: string | null;
  lastResult: SyncProgressMessage | null;
  lastError: string | null;
}

/** Unified activity snapshot (one shape for REST + WebSocket). */
export interface ActivitySnapshot {
  v: 1;
  index: IndexActivitySlice;
  sync: SyncActivitySlice;
}
