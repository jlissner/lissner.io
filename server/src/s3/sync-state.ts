import type { SyncProgress } from "./sync-types.js";

export const syncState = {
  inProgress: false,
  startedAt: null as string | null,
  lastResult: null as SyncProgress | null,
  lastError: null as string | null,
};

const syncBridge = {
  listener: null as (() => void) | null,
};

/** Wired in `index.ts` to push WebSocket activity updates. */
export function setSyncChangeListener(fn: (() => void) | null): void {
  syncBridge.listener = fn;
}

export function emitSyncChanged(): void {
  syncBridge.listener?.();
}

export function getSyncState() {
  return { ...syncState };
}

export function isSyncInProgress() {
  return syncState.inProgress;
}
