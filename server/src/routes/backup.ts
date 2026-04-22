import { Router } from "express";
import { sendApiError } from "../lib/api-error.js";
import {
  getBackupConfig,
  getSyncStatusBody,
  prepareSync,
} from "../services/backup-service.js";
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
      sendApiError(
        res,
        400,
        "S3 backup not configured",
        "backup_not_configured",
        {
          missingVars: prepared.missingVars,
        },
      );
      return;
    }
    sendApiError(res, 409, "Sync already in progress", "sync_in_progress");
    return;
  }

  res.json({ started: true });

  void prepared.execute().catch((err) => {
    logger.error({ err }, "Backup sync run failed");
  });
});
