import { useCallback, useEffect, useMemo, useState } from "react";
import type { AdminThumbnailRepairResponse } from "@shared";
import { ApiError } from "@/api";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { BackupPage } from "@/features/backup/components/backup-page";
import { cn } from "@/lib/utils";
import {
  addWhitelistEntry,
  computeAllHashes,
  getDataExplorerAvailable,
  getSqlExplorerAvailable,
  getUserPeople,
  listPeopleForAdmin,
  listUsers,
  listDbBackups,
  listWhitelist,
  removeWhitelistEntry,
  repairAdminThumbnails,
  restoreDbFromBackup,
  runSql,
  setUserPeople as setUserPeopleApi,
  type AdminUser,
  type AdminWhitelistEntry,
} from "../api";
import { DataExplorer } from "./data-explorer";
import { DuplicateReviewer } from "./duplicate-reviewer";

type AdminTabId =
  | "sync"
  | "db-backup"
  | "duplicates"
  | "thumbnails"
  | "whitelist"
  | "users"
  | "data-explorer"
  | "sql-explorer";

export function AdminPage({ onSyncComplete }: { onSyncComplete?: () => void }) {
  const [whitelist, setWhitelist] = useState<AdminWhitelistEntry[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [people, setPeople] = useState<Array<{ id: number; name: string }>>([]);
  const [newEmail, setNewEmail] = useState("");
  const [newIsAdmin, setNewIsAdmin] = useState(false);
  const [newPersonId, setNewPersonId] = useState<number | "">("");
  const [linkingUser, setLinkingUser] = useState<number | null>(null);
  const [userPeople, setUserPeople] = useState<Record<number, number[]>>({});
  const [sqlExplorerAvailable, setSqlExplorerAvailable] = useState(false);
  const [dataExplorerAvailable, setDataExplorerAvailable] = useState(false);
  const [sqlQuery, setSqlQuery] = useState("SELECT * FROM media LIMIT 10");
  const [sqlResult, setSqlResult] = useState<
    | { type: "select"; columns: string[]; rows: Record<string, unknown>[] }
    | { type: "write"; changes: number; lastInsertRowid: number }
    | null
  >(null);
  const [sqlError, setSqlError] = useState<string | null>(null);
  const [sqlRunning, setSqlRunning] = useState(false);
  const [computingHashes, setComputingHashes] = useState(false);
  const [hashResult, setHashResult] = useState<{
    computed: number;
    failed: number;
    total: number;
  } | null>(null);
  const [dbBackups, setDbBackups] = useState<Array<{
    key: string;
    size: number;
    lastModified: string;
  }> | null>(null);
  const [dbBackupsError, setDbBackupsError] = useState<string | null>(null);
  const [dbBackupsLoading, setDbBackupsLoading] = useState(false);
  const [restoringBackupKey, setRestoringBackupKey] = useState<string | null>(
    null,
  );
  const [dbBackupsShowAll, setDbBackupsShowAll] = useState(false);
  const [activeTab, setActiveTab] = useState<AdminTabId>("sync");
  const [thumbRepairMax, setThumbRepairMax] = useState(100);
  const [thumbRepairRunning, setThumbRepairRunning] = useState(false);
  const [thumbRepairError, setThumbRepairError] = useState<string | null>(null);
  const [thumbRepairResult, setThumbRepairResult] =
    useState<AdminThumbnailRepairResponse | null>(null);

  const adminTabs = useMemo(() => {
    const rows: Array<{ id: AdminTabId; label: string }> = [
      { id: "sync", label: "S3 sync" },
      { id: "db-backup", label: "Database backup" },
      { id: "duplicates", label: "Duplicates" },
      { id: "thumbnails", label: "Thumbnails" },
      { id: "whitelist", label: "Whitelist" },
      { id: "users", label: "Users & people" },
    ];
    if (dataExplorerAvailable) {
      rows.push({ id: "data-explorer", label: "Data explorer" });
    }
    if (sqlExplorerAvailable) {
      rows.push({ id: "sql-explorer", label: "SQL explorer" });
    }
    return rows;
  }, [dataExplorerAvailable, sqlExplorerAvailable]);

  useEffect(() => {
    const allowed = new Set(adminTabs.map((t) => t.id));
    if (!allowed.has(activeTab)) {
      setActiveTab(adminTabs[0]?.id ?? "sync");
    }
  }, [adminTabs, activeTab]);

  const BACKUP_PAGE_SIZE = 5;

  const sortedDbBackups = useMemo(() => {
    if (dbBackups == null) return [];
    return [...dbBackups].sort(
      (a, b) =>
        new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime(),
    );
  }, [dbBackups]);

  const visibleDbBackups = dbBackupsShowAll
    ? sortedDbBackups
    : sortedDbBackups.slice(0, BACKUP_PAGE_SIZE);
  const hasMoreBackups = sortedDbBackups.length > BACKUP_PAGE_SIZE;

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

  const fetchData = useCallback(async () => {
    const [wl, usersData, peopleData, sqlAvailable, dataAvailable] =
      await Promise.all([
        listWhitelist(),
        listUsers(),
        listPeopleForAdmin(),
        getSqlExplorerAvailable(),
        getDataExplorerAvailable(),
      ]);
    setWhitelist(wl);
    setUsers(usersData);
    setPeople(peopleData);
    setSqlExplorerAvailable(sqlAvailable.available);
    setDataExplorerAvailable(dataAvailable.available);
    const peopleByUserEntries = await Promise.all(
      usersData.map(
        async (user) =>
          [user.id, (await getUserPeople(user.id)).personIds] as const,
      ),
    );
    setUserPeople(Object.fromEntries(peopleByUserEntries));
  }, []);

  const handleRunSql = useCallback(async () => {
    setSqlRunning(true);
    setSqlError(null);
    setSqlResult(null);
    try {
      setSqlResult(await runSql(sqlQuery));
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Request failed";
      setSqlError(message);
    } finally {
      setSqlRunning(false);
    }
  }, [sqlQuery]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    void fetchDbBackups();
  }, [fetchDbBackups]);

  const handleAddWhitelist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim()) return;

    try {
      await addWhitelistEntry({
        email: newEmail.trim(),
        isAdmin: newIsAdmin,
        personId: newPersonId !== "" ? newPersonId : undefined,
      });
      setNewEmail("");
      setNewIsAdmin(false);
      setNewPersonId("");
      await fetchData();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Failed to add";
      alert(message);
    }
  };

  const handleRemoveWhitelist = async (id: number) => {
    if (!confirm("Remove from whitelist?")) return;
    try {
      await removeWhitelistEntry(id);
      await fetchData();
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Failed to remove";
      alert(message);
    }
  };

  const handleSetUserPeople = async (userId: number, personIds: number[]) => {
    try {
      await setUserPeopleApi(userId, personIds);
      setUserPeople((prev) => ({ ...prev, [userId]: personIds }));
      setLinkingUser(null);
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Failed to update user people";
      alert(message);
    }
  };

  const togglePersonForUser = (userId: number, personId: number) => {
    const current = userPeople[userId] ?? [];
    const next = current.includes(personId)
      ? current.filter((p) => p !== personId)
      : [...current, personId];
    handleSetUserPeople(userId, next);
  };

  const handleComputeAllHashes = async () => {
    setComputingHashes(true);
    setHashResult(null);
    try {
      const result = await computeAllHashes();
      setHashResult(result);
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Failed to compute hashes";
      alert(message);
    } finally {
      setComputingHashes(false);
    }
  };

  const handleRepairThumbnails = async () => {
    setThumbRepairRunning(true);
    setThumbRepairError(null);
    setThumbRepairResult(null);
    try {
      const raw = Math.floor(Number(thumbRepairMax));
      const coerced = Number.isFinite(raw) && raw > 0 ? raw : 100;
      const maxGenerations = Math.min(500, Math.max(1, coerced));
      const result = await repairAdminThumbnails({ maxGenerations });
      setThumbRepairResult(result);
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Thumbnail repair failed";
      setThumbRepairError(message);
    } finally {
      setThumbRepairRunning(false);
    }
  };

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
    <div className="admin-page">
      <div className="admin-page__content">
        <h2 className="admin-page__title">Admin</h2>
      </div>

      <div className="admin-page__tabs-bleed">
        <nav
          className="admin-page__tabs"
          role="tablist"
          aria-label="Admin sections"
        >
          {adminTabs.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              id={`admin-tab-${t.id}`}
              aria-selected={activeTab === t.id}
              aria-controls={`admin-panel-${t.id}`}
              className={cn(
                "admin-page__tab",
                activeTab === t.id && "admin-page__tab--active",
              )}
              onClick={() => setActiveTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="admin-page__content">
        {activeTab === "sync" && (
          <div
            id="admin-panel-sync"
            role="tabpanel"
            aria-labelledby="admin-tab-sync"
            className="admin-page__panel"
          >
            <section className="admin-page__section">
              <h3>S3 sync</h3>
              <p className="admin-page__desc">
                Two-way sync with your bucket: upload new files, download
                missing ones, and merge media from other devices.
              </p>
              <BackupPage onSyncComplete={onSyncComplete} showTitle={false} />
            </section>
          </div>
        )}

        {activeTab === "db-backup" && (
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
                            {restoringBackupKey === b.key
                              ? "Restoring…"
                              : "Restore"}
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
        )}

        {activeTab === "duplicates" && (
          <div
            id="admin-panel-duplicates"
            role="tabpanel"
            aria-labelledby="admin-tab-duplicates"
            className="admin-page__panel"
          >
            <section className="admin-page__section">
              <h3>Duplicate Detection</h3>
              <p className="admin-page__desc">
                Compute perceptual hashes to detect duplicate images by content.
                Hashes are computed automatically for new uploads, but you can
                compute them for existing images here.
              </p>
              <div className="admin-page__form">
                <Button
                  onClick={handleComputeAllHashes}
                  disabled={computingHashes}
                >
                  {computingHashes ? "Computing..." : "Compute All Hashes"}
                </Button>
                {hashResult && (
                  <p className="admin-page__meta">
                    Computed {hashResult.computed} of {hashResult.total} images
                    ({hashResult.failed} failed)
                  </p>
                )}
              </div>
              <DuplicateReviewer />
            </section>
          </div>
        )}

        {activeTab === "thumbnails" && (
          <div
            id="admin-panel-thumbnails"
            role="tabpanel"
            aria-labelledby="admin-tab-thumbnails"
            className="admin-page__panel"
          >
            <section className="admin-page__section">
              <h3>Thumbnails</h3>
              <p className="admin-page__desc">
                Scan all media for missing or empty JPEG thumbnails (images use{" "}
                <code>_thumb.jpg</code>, videos use <code>.jpg</code> next to
                the media file). Up to the limit below are regenerated per run
                (Sharp for images, ffmpeg for videos). Run again if some items
                were capped.
              </p>
              <div className="admin-page__form">
                <label className="admin-page__meta" htmlFor="thumb-repair-max">
                  Max repairs per run (1–500)
                </label>
                <input
                  id="thumb-repair-max"
                  type="number"
                  min={1}
                  max={500}
                  className="form__input"
                  style={{ maxWidth: "120px" }}
                  value={thumbRepairMax}
                  onChange={(e) => setThumbRepairMax(Number(e.target.value))}
                  disabled={thumbRepairRunning}
                />
                <Button
                  type="button"
                  onClick={() => void handleRepairThumbnails()}
                  disabled={thumbRepairRunning}
                >
                  {thumbRepairRunning ? "Running…" : "Find & repair"}
                </Button>
              </div>
              {thumbRepairError && (
                <Alert variant="danger" role="alert">
                  <p>{thumbRepairError}</p>
                </Alert>
              )}
              {thumbRepairResult && (
                <div className="admin-page__sql-result">
                  <div
                    className="admin-page__stats"
                    aria-label="Thumbnail repair results"
                  >
                    {(
                      [
                        [
                          "Media rows scanned",
                          thumbRepairResult.scanned,
                        ] as const,
                        [
                          "Missing thumbnails found",
                          thumbRepairResult.missingFound,
                        ] as const,
                        [
                          "Thumbnails repaired this run",
                          thumbRepairResult.generated,
                        ] as const,
                        [
                          "Already had a usable thumbnail",
                          thumbRepairResult.skippedAlreadyOk,
                        ] as const,
                        [
                          "Skipped (no local media file)",
                          thumbRepairResult.skippedNoLocalFile,
                        ] as const,
                        [
                          "Skipped (not image or video)",
                          thumbRepairResult.skippedIneligible,
                        ] as const,
                        [
                          "Skipped (repair cap reached)",
                          thumbRepairResult.skippedDueToCap,
                        ] as const,
                        [
                          "Max repairs allowed this run",
                          thumbRepairResult.maxGenerations,
                        ] as const,
                      ] as const
                    ).map(([label, value]) => (
                      <div key={label} className="admin-page__stat-row">
                        <span className="admin-page__stat-label">{label}</span>
                        <span className="admin-page__stat-value">{value}</span>
                      </div>
                    ))}
                  </div>
                  {thumbRepairResult.failed.length > 0 && (
                    <Alert variant="danger" role="alert">
                      <p className="admin-page__meta u-mb-2">
                        {thumbRepairResult.failed.length} item(s) could not be
                        repaired:
                      </p>
                      <ul className="admin-page__list">
                        {thumbRepairResult.failed.map((f) => (
                          <li
                            key={f.mediaId}
                            className="admin-page__list-item admin-page__list-item--stacked"
                          >
                            <div>
                              <code>{f.mediaId}</code>
                              <span className="admin-page__meta">
                                {" "}
                                — {f.reason}
                              </span>
                            </div>
                            {f.detail != null && f.detail !== "" && (
                              <p className="admin-page__meta u-mb-0">
                                {f.detail}
                              </p>
                            )}
                          </li>
                        ))}
                      </ul>
                    </Alert>
                  )}
                </div>
              )}
            </section>
          </div>
        )}

        {activeTab === "whitelist" && (
          <div
            id="admin-panel-whitelist"
            role="tabpanel"
            aria-labelledby="admin-tab-whitelist"
            className="admin-page__panel"
          >
            <section className="admin-page__section">
              <h3>Whitelist</h3>
              <p className="admin-page__desc">
                Only whitelisted emails can receive magic links. Add users here
                to grant access.
              </p>
              <form onSubmit={handleAddWhitelist} className="admin-page__form">
                <input
                  type="email"
                  placeholder="email@example.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="form__input"
                />
                <label className="admin-page__checkbox">
                  <input
                    type="checkbox"
                    checked={newIsAdmin}
                    onChange={(e) => setNewIsAdmin(e.target.checked)}
                  />
                  Admin
                </label>
                <select
                  className="form__select"
                  value={newPersonId === "" ? "" : newPersonId}
                  onChange={(e) =>
                    setNewPersonId(
                      e.target.value === "" ? "" : parseInt(e.target.value, 10),
                    )
                  }
                  title="Assign existing person (optional)"
                >
                  <option value="">No person</option>
                  {people
                    .filter((p) => !users.some((u) => u.personId === p.id))
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                </select>
                <Button type="submit" size="sm">
                  Add
                </Button>
              </form>
              <ul className="admin-page__list">
                {whitelist.map((w) => {
                  const assignedPerson =
                    w.personId != null
                      ? people.find((p) => p.id === w.personId)
                      : null;
                  return (
                    <li key={w.id} className="admin-page__list-item">
                      <span>{w.email}</span>
                      {w.isAdmin && (
                        <span className="admin-page__badge">admin</span>
                      )}
                      {assignedPerson && (
                        <span className="admin-page__meta">
                          → {assignedPerson.name}
                        </span>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveWhitelist(w.id)}
                      >
                        Remove
                      </Button>
                    </li>
                  );
                })}
              </ul>
            </section>
          </div>
        )}

        {activeTab === "users" && (
          <div
            id="admin-panel-users"
            role="tabpanel"
            aria-labelledby="admin-tab-users"
            className="admin-page__panel"
          >
            <section className="admin-page__section">
              <h3>Users & People</h3>
              <p className="admin-page__desc">
                Each user is one person (identity). Users can act on behalf of
                additional people to filter photos. The identity person is
                always included.
              </p>
              <ul className="admin-page__list">
                {users.map((u) => {
                  const identityPerson =
                    u.personId != null
                      ? people.find((p) => p.id === u.personId)
                      : null;
                  return (
                    <li
                      key={u.id}
                      className="admin-page__list-item admin-page__list-item--stacked"
                    >
                      <div>
                        <span>{u.email}</span>
                        {u.isAdmin && (
                          <span className="admin-page__badge">admin</span>
                        )}
                        {identityPerson && (
                          <span className="admin-page__meta">
                            is {identityPerson.name}
                          </span>
                        )}
                      </div>
                      <div className="admin-page__people">
                        {linkingUser === u.id ? (
                          <div className="admin-page__people-picker">
                            {people.map((p) => {
                              const isIdentity = p.id === u.personId;
                              return (
                                <label
                                  key={p.id}
                                  className={`admin-page__people-option ${isIdentity ? "admin-page__people-option--identity" : ""}`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={(userPeople[u.id] ?? []).includes(
                                      p.id,
                                    )}
                                    onChange={() =>
                                      !isIdentity &&
                                      togglePersonForUser(u.id, p.id)
                                    }
                                    disabled={isIdentity}
                                  />
                                  {p.name}
                                  {isIdentity && " (identity)"}
                                </label>
                              );
                            })}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setLinkingUser(null)}
                            >
                              Done
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setLinkingUser(u.id)}
                          >
                            {(userPeople[u.id] ?? []).length} people
                          </Button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          </div>
        )}

        {activeTab === "data-explorer" && dataExplorerAvailable && (
          <div
            id="admin-panel-data-explorer"
            role="tabpanel"
            aria-labelledby="admin-tab-data-explorer"
            className="admin-page__panel"
          >
            <section className="admin-page__section">
              <DataExplorer />
            </section>
          </div>
        )}

        {activeTab === "sql-explorer" && sqlExplorerAvailable && (
          <div
            id="admin-panel-sql-explorer"
            role="tabpanel"
            aria-labelledby="admin-tab-sql-explorer"
            className="admin-page__panel"
          >
            <section className="admin-page__section">
              <h3>SQL Explorer</h3>
              <p className="admin-page__desc">
                Run SQL directly against the database. Only available locally
                with SQL_EXPLORER_ENABLED=true.
              </p>
              <div className="admin-page__sql">
                <textarea
                  value={sqlQuery}
                  onChange={(e) => setSqlQuery(e.target.value)}
                  className="admin-page__sql-input"
                  rows={4}
                  placeholder="SELECT * FROM media LIMIT 10"
                  spellCheck={false}
                />
                <Button onClick={handleRunSql} disabled={sqlRunning}>
                  {sqlRunning ? "Running…" : "Run"}
                </Button>
                {sqlError && (
                  <Alert variant="danger" role="alert">
                    <p>{sqlError}</p>
                  </Alert>
                )}
                {sqlResult && (
                  <div className="admin-page__sql-result">
                    {sqlResult.type === "select" ? (
                      <div className="admin-page__sql-table-wrap">
                        <table className="admin-page__sql-table">
                          <thead>
                            <tr>
                              {sqlResult.columns.map((c) => (
                                <th key={c}>{c}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {sqlResult.rows.map((row, i) => (
                              <tr key={i}>
                                {sqlResult.columns.map((c) => (
                                  <td key={c}>
                                    {row[c] == null ? "NULL" : String(row[c])}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        <p className="admin-page__sql-meta">
                          {sqlResult.rows.length} row
                          {sqlResult.rows.length !== 1 ? "s" : ""}
                        </p>
                      </div>
                    ) : (
                      <p className="admin-page__sql-meta">
                        {sqlResult.changes} row(s) affected
                        {sqlResult.lastInsertRowid > 0 &&
                          `, last insert id: ${sqlResult.lastInsertRowid}`}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

function formatBytes(bytes: number): string {
  const steps = [
    { threshold: 1024 ** 4, label: "TB" },
    { threshold: 1024 ** 3, label: "GB" },
    { threshold: 1024 ** 2, label: "MB" },
    { threshold: 1024, label: "KB" },
  ];
  const match = steps.find((s) => bytes >= s.threshold);
  if (!match) return `${bytes} B`;
  const value = bytes / match.threshold;
  const rounded =
    value >= 10 || value % 1 < 0.05
      ? String(Math.round(value))
      : value.toFixed(1);
  return `${rounded} ${match.label}`;
}

function formatBackupDisplayDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
