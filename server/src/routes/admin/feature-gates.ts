import type { Response } from "express";
import { sendApiError } from "../../lib/api-error.js";
import { isDataExplorerEnabled } from "../../services/admin-service.js";

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
