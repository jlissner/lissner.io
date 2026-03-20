/**
 * Mirrors `shared/src/activity.ts` — duplicated here so the server build stays self-contained
 * under `server/src` (see `rootDir`).
 */

export interface SyncProgressMessage {
  phase: string;
  current: number;
  total: number;
  message: string;
  error?: string;
}

export interface IndexActivitySlice {
  inProgress: boolean;
  jobId: string | null;
  startedAt: string | null;
  elapsedSeconds: number | null;
  progressProcessed: number;
  progressTotal: number;
  lastResult: { indexed: number; skipped: number; total: number; cancelled?: boolean } | null;
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

export interface ActivitySnapshot {
  v: 1;
  index: IndexActivitySlice;
  sync: SyncActivitySlice;
}
