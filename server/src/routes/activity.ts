import { Router } from "express";
import { buildActivitySnapshot } from "../activity/snapshot.js";
import { getIndexJobState } from "../indexing/job-store.js";
import { getSyncState, getS3Config } from "../s3/sync.js";

export const activityRouter = Router();

/** Same JSON shape as WebSocket `activity` messages (for hydration / clients without WS). */
activityRouter.get("/", (_req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.json(buildActivitySnapshot(getIndexJobState(), getSyncState(), getS3Config()));
});
