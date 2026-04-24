import { apiJson } from "@/api";
import type { BackupRunStartedResponse } from "@shared";

export function runBackupSync(): Promise<BackupRunStartedResponse> {
  return apiJson<BackupRunStartedResponse>("backup/run", { method: "POST" });
}
