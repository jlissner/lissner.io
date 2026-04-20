/**
 * Singleton store for the current index job. All mutations go through pure reducers in `./job.js`.
 */
import { randomUUID } from "node:crypto";
import {
  cloneIndexJobState,
  initialIndexJobState,
  tryStartJob,
  withFail,
  withFinish,
  withProgress,
  type IndexJobState,
} from "./job.js";

const store = {
  state: initialIndexJobState() as IndexJobState,
  bulkAbortController: null as AbortController | null,
  indexJobChangeListener: null as (() => void) | null,
  /** Upload-time `indexMediaItem` calls (no bulk job); drives activity when users add files. */
  backgroundIndexInFlight: 0,
  backgroundStartedAt: null as string | null,
  /** Tasks started / finished in the current background wave (for progress X/Y in activity UI). */
  backgroundWaveStarted: 0,
  backgroundWaveDone: 0,
};

/** Wired in `index.ts` to push WebSocket activity updates. */
export function setIndexJobChangeListener(fn: (() => void) | null): void {
  store.indexJobChangeListener = fn;
}

function emitIndexJobChanged(): void {
  store.indexJobChangeListener?.();
}

/**
 * True while a bulk job from POST /api/search/index is running (exclusive with background
 * indexing for activity purposes — bulk progress wins when both are active).
 */
export function isBulkIndexJobRunning(): boolean {
  return store.state.inProgress;
}

/** Called when a single-item upload index starts (only if no bulk job is running). */
export function beginBackgroundIndex(): void {
  if (store.backgroundIndexInFlight === 0) {
    store.backgroundStartedAt = new Date().toISOString();
    store.backgroundWaveStarted = 0;
    store.backgroundWaveDone = 0;
  }
  store.backgroundIndexInFlight++;
  store.backgroundWaveStarted++;
  emitIndexJobChanged();
}

/** Called when a single-item upload index finishes (success or failure). */
export function endBackgroundIndex(): void {
  store.backgroundWaveDone++;
  store.backgroundIndexInFlight = Math.max(0, store.backgroundIndexInFlight - 1);
  if (store.backgroundIndexInFlight === 0) {
    store.backgroundStartedAt = null;
    store.backgroundWaveStarted = 0;
    store.backgroundWaveDone = 0;
  }
  emitIndexJobChanged();
}

export function getIndexJobState(): IndexJobState {
  const s = cloneIndexJobState(store.state);
  if (s.inProgress) {
    return s;
  }
  if (store.backgroundIndexInFlight > 0) {
    return {
      ...s,
      inProgress: true,
      jobId: null,
      startedAt: store.backgroundStartedAt,
      progressProcessed: store.backgroundWaveDone,
      progressTotal: Math.max(1, store.backgroundWaveStarted),
    };
  }
  return s;
}

export function startIndexJob(): { ok: true; jobId: string; signal: AbortSignal } | { ok: false } {
  const jobId = randomUUID();
  const result = tryStartJob(store.state, new Date().toISOString(), jobId);
  if (!result.ok) return { ok: false };
  store.state = result.state;
  store.bulkAbortController = new AbortController();
  emitIndexJobChanged();
  return { ok: true, jobId, signal: store.bulkAbortController.signal };
}

/** Request cooperative cancellation of the bulk index job with this id (no-op if mismatch). */
export function cancelBulkIndexJob(jobId: string): boolean {
  if (!store.state.inProgress || store.state.jobId !== jobId) return false;
  store.bulkAbortController?.abort();
  return true;
}

export function setIndexProgress(processed: number, total: number): void {
  store.state = withProgress(store.state, processed, total);
  emitIndexJobChanged();
}

export function finishIndexJob(result: {
  indexed: number;
  skipped: number;
  total: number;
  cancelled?: boolean;
}): void {
  store.bulkAbortController = null;
  store.state = withFinish(store.state, result);
  emitIndexJobChanged();
}

export function failIndexJob(error: string): void {
  store.bulkAbortController = null;
  store.state = withFail(store.state, error);
  emitIndexJobChanged();
}
