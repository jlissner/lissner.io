import type { SyncProgressMessage } from "../../../shared/src/activity.js";

export type { SyncPhase, SyncProgressMessage } from "../../../shared/src/activity.js";

/** Alias used across older server sync code; same wire shape as `SyncProgressMessage`. */
export type SyncProgress = SyncProgressMessage;
