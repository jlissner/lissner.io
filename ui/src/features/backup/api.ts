import { apiJson } from "@/api/client";
import type { BackupRunStartedResponse } from "../../../../shared/src/api.js";

export function runBackupSync(): Promise<BackupRunStartedResponse> {
  return apiJson<BackupRunStartedResponse>("backup/run", { method: "POST" });
}
