export interface IndexJobState {
  inProgress: boolean;
  startedAt: string | null;
  progressProcessed: number;
  progressTotal: number;
  lastResult: { indexed: number; skipped: number; total: number } | null;
  lastError: string | null;
}

export function initialIndexJobState(): IndexJobState {
  return {
    inProgress: false,
    startedAt: null,
    progressProcessed: 0,
    progressTotal: 0,
    lastResult: null,
    lastError: null,
  };
}

/** Immutable snapshot (plain object copy). */
export function cloneIndexJobState(state: IndexJobState): IndexJobState {
  return {
    ...state,
    lastResult: state.lastResult ? { ...state.lastResult } : null,
  };
}

/**
 * Start a new job if none is running. `startedAt` must be provided by the caller (e.g. `new Date().toISOString()`).
 */
export function tryStartJob(
  state: IndexJobState,
  startedAt: string
): { ok: true; state: IndexJobState } | { ok: false; state: IndexJobState } {
  if (state.inProgress) {
    return { ok: false, state };
  }
  return {
    ok: true,
    state: {
      ...state,
      inProgress: true,
      startedAt,
      progressProcessed: 0,
      progressTotal: 0,
      lastResult: null,
      lastError: null,
    },
  };
}

export function withProgress(
  state: IndexJobState,
  processed: number,
  total: number
): IndexJobState {
  return {
    ...state,
    progressProcessed: processed,
    progressTotal: total,
  };
}

export function withFinish(
  state: IndexJobState,
  result: { indexed: number; skipped: number; total: number }
): IndexJobState {
  return {
    ...state,
    inProgress: false,
    lastResult: { ...result },
    lastError: null,
  };
}

export function withFail(state: IndexJobState, error: string): IndexJobState {
  return {
    ...state,
    inProgress: false,
    lastError: error,
  };
}
