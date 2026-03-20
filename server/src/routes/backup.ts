import { Router } from "express";
import { buildActivitySnapshot } from "../activity/snapshot.js";
import { getIndexJobState } from "../indexing/job-store.js";
import { getS3Config, getSyncState, isSyncInProgress, runSync } from "../s3/sync.js";

export const backupRouter = Router();

backupRouter.get("/config", (_req, res) => {
  res.json(getS3Config());
});

backupRouter.get("/status", (_req, res) => {
  const snap = buildActivitySnapshot(getIndexJobState(), getSyncState(), getS3Config());
  const s = snap.sync;
  res.json({
    configured: s.configured,
    inProgress: s.inProgress,
    startedAt: s.startedAt,
    lastResult: s.lastResult,
    lastError: s.lastError,
  });
});

backupRouter.post("/run", async (_req, res) => {
  const { configured, missingVars } = getS3Config();
  if (!configured) {
    res.status(400).json({
      error: "S3 backup not configured",
      missingVars,
    });
    return;
  }

  if (isSyncInProgress()) {
    res.status(409).json({ error: "Sync already in progress" });
    return;
  }

  res.json({ started: true });

  try {
    await runSync();
  } catch (err) {
    console.error("Sync error:", err);
  }
});
