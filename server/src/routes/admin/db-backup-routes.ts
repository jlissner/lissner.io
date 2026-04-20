import { Router } from "express";
import { sendApiError } from "../../lib/api-error.js";
import {
  listDbBackupsForAdmin,
  restoreDbFromS3BackupKey,
} from "../../services/db-backup-admin-service.js";
import { parseWithSchema } from "../../validation/parse.js";
import { dbRestoreBodySchema } from "../../validation/admin-schemas.js";

export const adminDbBackupRouter = Router();

adminDbBackupRouter.get("/db-backups", async (_req, res, next) => {
  try {
    const result = await listDbBackupsForAdmin();
    if (!result.ok) {
      sendApiError(res, 400, "S3 backup not configured", "backup_not_configured", {
        missingVars: result.missingVars,
      });
      return;
    }
    res.json({ backups: result.backups });
  } catch (err) {
    next(err);
  }
});

adminDbBackupRouter.post("/db-restore", async (req, res, next) => {
  try {
    const { key } = parseWithSchema(dbRestoreBodySchema, req.body);
    const result = await restoreDbFromS3BackupKey(key);
    if (result.ok) {
      res.json({ restored: true });
      return;
    }
    if (result.reason === "not_configured") {
      sendApiError(res, 400, "S3 backup not configured", "backup_not_configured", {});
      return;
    }
    if (result.reason === "sync_in_progress") {
      sendApiError(
        res,
        409,
        "Backup sync is in progress; try again after it finishes",
        "sync_in_progress"
      );
      return;
    }
    if (result.reason === "invalid_key") {
      sendApiError(res, 400, "Invalid backup key", "invalid_backup_key");
      return;
    }
    if (result.reason === "invalid_db") {
      sendApiError(res, 400, "Downloaded file is not a valid database", "invalid_db_backup");
      return;
    }
    if (result.reason === "download_failed") {
      sendApiError(res, 500, "Failed to download backup from S3", "download_failed");
      return;
    }
    sendApiError(res, 500, "Failed to restore database from S3", "db_restore_failed");
  } catch (err) {
    next(err);
  }
});
