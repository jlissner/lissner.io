/** Shared payload for indexing + S3 sync activity (HTTP + WebSocket). */
export interface SyncProgressMessage {
  phase: string;
  current: number;
  total: number;
  message: string;
  error?: string;
}
export interface IndexActivitySlice {
  inProgress: boolean;
  startedAt: string | null;
  /** Seconds since startedAt when in progress; null otherwise. */
  elapsedSeconds: number | null;
  progressProcessed: number;
  progressTotal: number;
  lastResult: {
    indexed: number;
    skipped: number;
    total: number;
  } | null;
  lastError: string | null;
}
export interface SyncActivitySlice {
  configured: boolean;
  missingVars: string[];
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
