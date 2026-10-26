import { apiJson } from "@/api";
import type { BackupRunStartedResponse } from "@lissner/shared";

export function runBackupSync(): Promise<BackupRunStartedResponse> {
  return apiJson<BackupRunStartedResponse>("backup/run", { method: "POST" });
}
