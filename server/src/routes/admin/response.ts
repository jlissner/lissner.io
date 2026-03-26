import type { Response } from "express";
import type { AdminServiceResult } from "../../services/admin-service.js";

export function sendAdminResult<T>(res: Response, result: AdminServiceResult<T>): T | null {
  if (result.ok) return result.value;
  res.status(result.status).json({ error: result.error });
  return null;
}
