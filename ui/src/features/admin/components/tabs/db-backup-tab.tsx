import { useCallback, useEffect, useMemo, useState } from "react";
import { ApiError } from "@/api";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { listDbBackups, restoreDbFromBackup } from "../../api";
import {
  formatBackupDisplayDate,
  formatBytes,
  sortDbBackupsByNewest,
} from "../../lib/format";

type DbBackup = { key: string; size: number; lastModified: string };

const BACKUP_PAGE_SIZE = 5;

export function DbBackupTab() {
  const [dbBackups, setDbBackups] = useState<DbBackup[] | null>(null);
  const [dbBackupsError, setDbBackupsError] = useState<string | null>(null);
  const [dbBackupsLoading, setDbBackupsLoading] = useState(false);
  const [restoringBackupKey, setRestoringBackupKey] = useState<string | null>(
    null,
  );
  const [dbBackupsShowAll, setDbBackupsShowAll] = useState(false);

  const fetchDbBackups = useCallback(async () => {
    setDbBackupsLoading(true);
    setDbBackupsError(null);
    try {
      const { backups } = await listDbBackups();
      setDbBackups(backups);
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Failed to load backups";
      setDbBackupsError(message);
      setDbBackups([]);
    } finally {
      setDbBackupsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchDbBackups();
  }, [fetchDbBackups]);

  const sortedDbBackups = useMemo(
    () => (dbBackups == null ? [] : sortDbBackupsByNewest(dbBackups)),
    [dbBackups],
  );

  const visibleDbBackups = dbBackupsShowAll
    ? sortedDbBackups
    : sortedDbBackups.slice(0, BACKUP_PAGE_SIZE);
  const hasMoreBackups = sortedDbBackups.length > BACKUP_PAGE_SIZE;

  const handleRestoreDbBackup = async (key: string) => {
    if (
      !confirm(
        "Replace the local database with this backup? The app will reload. This cannot be undone.",
      )
    ) {
      return;
    }
    setRestoringBackupKey(key);
    try {
      await restoreDbFromBackup(key);
      window.location.reload();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Restore failed";
      alert(message);
    } finally {
      setRestoringBackupKey(null);
    }
  };

  return (
    <div
      id="admin-panel-db-backup"
      role="tabpanel"
      aria-labelledby="admin-tab-db-backup"
      className="admin-page__panel"
    >
      <section className="admin-page__section">
        <h3>Database backup (S3)</h3>
        <p className="admin-page__desc">
          Restore the SQLite database from a file previously uploaded to{" "}
          <code>backup/db/</code> in your bucket. Wait until S3 sync has
          finished before restoring.
        </p>
        <div className="admin-page__form">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => void fetchDbBackups()}
            disabled={dbBackupsLoading}
          >
            {dbBackupsLoading ? "Loading…" : "Refresh list"}
          </Button>
        </div>
        {dbBackupsError && (
          <Alert variant="danger" role="alert">
            <p>{dbBackupsError}</p>
          </Alert>
        )}
        {!dbBackupsError &&
          dbBackups !== null &&
          sortedDbBackups.length === 0 &&
          !dbBackupsLoading && (
            <p className="admin-page__meta">
              No <code>.db</code> backups found under backup/db/.
            </p>
          )}
        {sortedDbBackups.length > 0 && (
          <>
            <ul className="admin-page__list">
              {visibleDbBackups.map((b) => {
                const filename = b.key.split("/").pop() ?? b.key;
                return (
                  <li
                    key={b.key}
                    className="admin-page__list-item admin-page__list-item--stacked"
                  >
                    <div>
                      <code className="admin-page__meta" title={b.key}>
                        {filename}
                      </code>
                      <span className="admin-page__meta">
                        {" "}
                        · {formatBackupDisplayDate(b.lastModified)} ·{" "}
                        {formatBytes(b.size)}
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      onClick={() => void handleRestoreDbBackup(b.key)}
                      disabled={restoringBackupKey !== null}
                    >
                      {restoringBackupKey === b.key ? "Restoring…" : "Restore"}
                    </Button>
                  </li>
                );
              })}
            </ul>
            {hasMoreBackups && !dbBackupsShowAll && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDbBackupsShowAll(true)}
                style={{ marginTop: "var(--space-2)" }}
              >
                Show all {sortedDbBackups.length} backups
              </Button>
            )}
          </>
        )}
      </section>
    </div>
  );
}
