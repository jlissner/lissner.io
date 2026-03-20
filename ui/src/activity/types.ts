/** Aligned with `shared/src/activity.ts` (UI build is scoped to `ui/src`). */

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
  elapsedSeconds: number | null;
  progressProcessed: number;
  progressTotal: number;
  lastResult: { indexed: number; skipped: number; total: number } | null;
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
