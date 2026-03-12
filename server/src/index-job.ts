export interface IndexJobState {
  inProgress: boolean;
  startedAt: string | null;
  lastResult: { indexed: number; skipped: number; total: number } | null;
  lastError: string | null;
}

let state: IndexJobState = {
  inProgress: false,
  startedAt: null,
  lastResult: null,
  lastError: null,
};

export function getIndexJobState(): IndexJobState {
  return { ...state };
}

export function startIndexJob(): boolean {
  if (state.inProgress) return false;
  state.inProgress = true;
  state.startedAt = new Date().toISOString();
  state.lastResult = null;
  state.lastError = null;
  return true;
}

export function finishIndexJob(result: {
  indexed: number;
  skipped: number;
  total: number;
}) {
  state.inProgress = false;
  state.lastResult = result;
  state.lastError = null;
}

export function failIndexJob(error: string) {
  state.inProgress = false;
  state.lastError = error;
}
