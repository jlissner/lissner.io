/**
 * Re-export shared activity payloads — single source of truth with `shared/src/activity.ts`.
 */

export type {
  ActivitySnapshot,
  IndexActivitySlice,
  SyncActivitySlice,
  SyncPhase,
  SyncProgressMessage,
} from "../../../shared/src/activity.js";
