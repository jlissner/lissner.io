import type { Response } from "express";
import { sendApiError } from "../../lib/api-error.js";
import {
  isDataExplorerEnabled,
  isSqlExplorerEnabled,
} from "../../services/admin-service.js";

export function ensureSqlExplorerEnabled(res: Response): boolean {
  if (isSqlExplorerEnabled()) return true;
  sendApiError(
    res,
    403,
    "SQL explorer is only available locally with SQL_EXPLORER_ENABLED=true",
    "sql_explorer_disabled",
  );
  return false;
}

export function ensureDataExplorerEnabled(res: Response): boolean {
  if (isDataExplorerEnabled()) return true;
  sendApiError(
    res,
    403,
    "Data explorer is only available locally with DATA_EXPLORER_ENABLED=true",
    "data_explorer_disabled",
  );
  return false;
}
