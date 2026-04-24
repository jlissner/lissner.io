import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "@/api";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useActivity } from "@/components/activity/activity-provider";
import { runBackupSync } from "../api";

interface BackupPageProps {
  onSyncComplete?: () => void;
  /** When false, omit the page title (e.g. when embedded under Admin with a section heading). */
  showTitle?: boolean;
}

function getSyncAlertVariant(phase: string): "danger" | "success" | "info" {
  if (phase === "error") return "danger";
  if (phase === "done") return "success";
  return "info";
}

export function BackupPage({
  onSyncComplete,
  showTitle = true,
}: BackupPageProps) {
  const activity = useActivity();
  const wasInProgress = useRef(false);
  const [running, setRunning] = useState(false);
  const status =
    activity != null
      ? {
          inProgress: activity.sync.inProgress,
          startedAt: activity.sync.startedAt,
          lastResult: activity.sync.lastResult,
          lastError: activity.sync.lastError,
        }
      : null;

  useEffect(() => {
    if (status?.inProgress) {
      wasInProgress.current = true;
    } else if (wasInProgress.current) {
      wasInProgress.current = false;
      onSyncComplete?.();
    }
  }, [status?.inProgress, onSyncComplete]);

  const handleRun = useCallback(async () => {
    setRunning(true);
    try {
      await runBackupSync();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Backup failed";
      alert(message);
    } finally {
      setRunning(false);
    }
  }, []);

  if (status === null) {
    return <p className="empty">Loading…</p>;
  }

  const lastResult = status.lastResult;

  return (
    <div className="backup-page">
      {showTitle && <h2 className="backup-page__title">Sync with S3</h2>}

      <Card padding="lg">
        <p className="backup-page__desc">
          Sync your media with AWS S3. Uploads only new files, downloads missing
          files from S3, and merges media from other devices.
        </p>
        <Button onClick={handleRun} disabled={status.inProgress || running}>
          {status.inProgress ? "Syncing…" : "Sync now"}
        </Button>

        {status.inProgress && lastResult && (
          <div className="backup-page__progress">
            <p>{lastResult.message}</p>
            {lastResult.total > 0 && (
              <progress
                value={lastResult.current}
                max={lastResult.total}
                className="backup-page__progress-bar"
              />
            )}
          </div>
        )}

        {!status.inProgress && lastResult && (
          <Alert variant={getSyncAlertVariant(lastResult.phase)}>
            {lastResult.phase === "error" && lastResult.error && (
              <p>
                <strong>Error:</strong> {lastResult.error}
              </p>
            )}
            {lastResult.phase === "done" && <p>{lastResult.message}</p>}
          </Alert>
        )}
      </Card>
    </div>
  );
}
