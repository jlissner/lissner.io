import { buildActivitySnapshot } from "../activity/snapshot.js";
import { getIndexJobState } from "../indexing/job-store.js";
import { getS3Config, getSyncState } from "../s3/sync.js";

/** Unified index + sync snapshot (HTTP + WebSocket payload shape). */
export function getActivitySnapshot() {
  return buildActivitySnapshot(getIndexJobState(), getSyncState(), getS3Config());
}
