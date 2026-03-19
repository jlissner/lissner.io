import { useCallback, useEffect, useRef, useState } from "react";

interface BackupPageProps {
  onSyncComplete?: () => void;
}

interface BackupConfig {
  configured: boolean;
  missingVars: string[];
}

interface BackupStatus {
  configured: boolean;
  inProgress: boolean;
  startedAt: string | null;
  lastResult: {
    phase: string;
    current: number;
    total: number;
    message: string;
    error?: string;
  } | null;
  lastError: string | null;
}

export function BackupPage({ onSyncComplete }: BackupPageProps) {
  const [config, setConfig] = useState<BackupConfig | null>(null);
  const [status, setStatus] = useState<BackupStatus | null>(null);
  const [running, setRunning] = useState(false);
  const wasInProgress = useRef(false);

  const fetchConfig = useCallback(async () => {
    const res = await fetch("/api/backup/config");
    if (res.ok) setConfig(await res.json());
  }, []);

  const fetchStatus = useCallback(async () => {
    const res = await fetch("/api/backup/status");
    if (res.ok) setStatus(await res.json());
  }, []);

  useEffect(() => {
    fetchConfig();
    fetchStatus();
  }, [fetchConfig, fetchStatus]);

  useEffect(() => {
    if (!status?.inProgress) return;
    const id = setInterval(fetchStatus, 1000);
    return () => clearInterval(id);
  }, [status?.inProgress, fetchStatus]);

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
      await fetchStatus();
    } finally {
      setRunning(false);
    }
  }, [fetchStatus]);

  if (config === null) {
    return <p className="empty">Loading…</p>;
  }

  const lastResult = status?.lastResult;

  return (
    <div className="backup-page">
      <h2 className="backup-page__title">Sync with S3</h2>

      {!config.configured ? (
        <div className="alert alert--warning">
          <strong>S3 sync is not configured.</strong>
          <p>
            Set these environment variables on the server to enable sync:
          </p>
          <ul>
            {config.missingVars.map((v) => (
              <li key={v}>
                <code>{v}</code>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <>
          <p className="backup-page__desc">
            Sync your media with AWS S3. Uploads only new files, downloads
            missing files from S3, and merges media from other devices.
          </p>
          <button
            type="button"
            className="btn btn--primary"
            onClick={handleRun}
            disabled={status?.inProgress || running}
          >
            {status?.inProgress ? "Syncing…" : "Sync now"}
          </button>

          {status?.inProgress && lastResult && (
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

          {!status?.inProgress && lastResult && (
            <div
              className={`alert ${
                lastResult.phase === "error"
                  ? "alert--danger"
                  : lastResult.phase === "done"
                    ? "alert--success"
                    : "alert--info"
              }`}
            >
              {lastResult.phase === "error" && lastResult.error && (
                <p>
                  <strong>Error:</strong> {lastResult.error}
                </p>
              )}
              {lastResult.phase === "done" && (
                <p>{lastResult.message}</p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
