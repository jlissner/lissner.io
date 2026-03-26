import type { Response } from "express";
import { isDataExplorerEnabled, isSqlExplorerEnabled } from "../../services/admin-service.js";

export function ensureSqlExplorerEnabled(res: Response): boolean {
  if (isSqlExplorerEnabled()) return true;
  res
    .status(403)
    .json({ error: "SQL explorer is only available locally with SQL_EXPLORER_ENABLED=true" });
  return false;
}

export function ensureDataExplorerEnabled(res: Response): boolean {
  if (isDataExplorerEnabled()) return true;
  res
    .status(403)
    .json({ error: "Data explorer is only available locally with DATA_EXPLORER_ENABLED=true" });
  return false;
}
