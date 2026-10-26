export interface IndexJobState {
  inProgress: boolean;
  jobId: string | null;
  startedAt: string | null;
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

export function initialIndexJobState(): IndexJobState {
  return {
    inProgress: false,
    jobId: null,
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
  startedAt: string,
  jobId: string,
): { ok: true; state: IndexJobState } | { ok: false; state: IndexJobState } {
  if (state.inProgress) {
    return { ok: false, state };
  }
  return {
    ok: true,
    state: {
      ...state,
      inProgress: true,
      jobId,
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
  total: number,
): IndexJobState {
  return {
    ...state,
    progressProcessed: processed,
    progressTotal: total,
  };
}

export function withFinish(
  state: IndexJobState,
  result: {
    indexed: number;
    skipped: number;
    total: number;
    cancelled?: boolean;
  },
): IndexJobState {
  return {
    ...state,
    inProgress: false,
    jobId: null,
    lastResult: { ...result },
    lastError: null,
  };
}

export function withFail(state: IndexJobState, error: string): IndexJobState {
  return {
    ...state,
    inProgress: false,
    jobId: null,
    lastError: error,
  };
}
