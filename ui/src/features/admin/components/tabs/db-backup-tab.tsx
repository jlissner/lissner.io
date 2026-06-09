import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { errorMessage } from "@/api";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { listDbBackups, restoreDbFromBackup } from "../../api";
import {
  formatBackupDisplayDate,
  formatBytes,
  sortDbBackupsByNewest,
} from "../../lib/format";

const BACKUP_PAGE_SIZE = 5;
const DB_BACKUPS_KEY = ["admin", "dbBackups"];

export function DbBackupTab() {
  const queryClient = useQueryClient();
  const dbBackupsQuery = useQuery({
    queryKey: DB_BACKUPS_KEY,
    queryFn: () => listDbBackups().then((r) => r.backups),
  });
  const dbBackups = dbBackupsQuery.data ?? null;
  const dbBackupsLoading = dbBackupsQuery.isFetching;
  const dbBackupsError = dbBackupsQuery.isError
    ? errorMessage(dbBackupsQuery.error, "Failed to load backups")
    : null;
  const [restoringBackupKey, setRestoringBackupKey] = useState<string | null>(
    null,
  );
  const [dbBackupsShowAll, setDbBackupsShowAll] = useState(false);

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
      alert(errorMessage(err, "Restore failed"));
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
            onClick={() =>
              void queryClient.invalidateQueries({ queryKey: DB_BACKUPS_KEY })
            }
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
