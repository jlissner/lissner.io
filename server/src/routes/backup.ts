import { Router } from "express";
import { getBackupConfig, getSyncStatusBody, prepareSync } from "../services/backup-service.js";
import { logger } from "../logger.js";

export const backupRouter = Router();

backupRouter.get("/config", (_req, res) => {
  res.json(getBackupConfig());
});

backupRouter.get("/status", (_req, res) => {
  res.json(getSyncStatusBody());
});

backupRouter.post("/run", (_req, res) => {
  const prepared = prepareSync();
  if (!prepared.ok) {
    if (prepared.reason === "not_configured") {
      res.status(400).json({
        error: "S3 backup not configured",
        missingVars: prepared.missingVars,
      });
      return;
    }
    res.status(409).json({ error: "Sync already in progress" });
    return;
  }

  res.json({ started: true });

  void prepared.execute().catch((err) => {
    logger.error({ err }, "Backup sync run failed");
  });
});
