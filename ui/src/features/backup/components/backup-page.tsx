import { useCallback, useEffect, useRef, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useActivity } from "@/components/activity/activity-provider";

interface BackupPageProps {
  onSyncComplete?: () => void;
}

export function BackupPage({ onSyncComplete }: BackupPageProps) {
  const activity = useActivity();
  const wasInProgress = useRef(false);
  const [running, setRunning] = useState(false);

  const config =
    activity != null
      ? { configured: activity.sync.configured, missingVars: activity.sync.missingVars }
      : null;

  const status =
    activity != null
      ? {
          configured: activity.sync.configured,
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
      const res = await fetch("/api/backup/run", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error || "Backup failed");
        return;
      }
    } finally {
      setRunning(false);
    }
  }, []);

  if (config === null || status === null) {
    return <p className="empty">Loading…</p>;
  }

  const lastResult = status.lastResult;

  return (
    <div className="backup-page">
      <h2 className="backup-page__title">Sync with S3</h2>

      {!config.configured ? (
        <Alert variant="warning">
          <strong>S3 sync is not configured.</strong>
          <p>Set these environment variables on the server to enable sync:</p>
          <ul>
            {config.missingVars.map((v) => (
              <li key={v}>
                <code>{v}</code>
              </li>
            ))}
          </ul>
        </Alert>
      ) : (
        <Card padding="lg">
          <p className="backup-page__desc">
            Sync your media with AWS S3. Uploads only new files, downloads missing files from S3,
            and merges media from other devices.
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
            <Alert
              variant={
                lastResult.phase === "error"
                  ? "danger"
                  : lastResult.phase === "done"
                    ? "success"
                    : "info"
              }
            >
              {lastResult.phase === "error" && lastResult.error && (
                <p>
                  <strong>Error:</strong> {lastResult.error}
                </p>
              )}
              {lastResult.phase === "done" && <p>{lastResult.message}</p>}
            </Alert>
          )}
        </Card>
      )}
    </div>
  );
}
