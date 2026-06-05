import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { getDataExplorerAvailable, getSqlExplorerAvailable } from "../api";
import { DataExplorer } from "./data-explorer";
import { DbBackupTab } from "./tabs/db-backup-tab";
import { DirectoryTab } from "./tabs/directory-tab";
import { DuplicatesTab } from "./tabs/duplicates-tab";
import { FileIssuesTab } from "./tabs/file-issues-tab";
import { SqlExplorerTab } from "./tabs/sql-explorer-tab";
import { SyncTab } from "./tabs/sync-tab";
import { ThumbnailsTab } from "./tabs/thumbnails-tab";
import { WhitelistTab } from "./tabs/whitelist-tab";

type AdminTabId =
  | "sync"
  | "db-backup"
  | "duplicates"
  | "thumbnails"
  | "file-issues"
  | "whitelist"
  | "users"
  | "data-explorer"
  | "sql-explorer";

export function AdminPage({ onSyncComplete }: { onSyncComplete?: () => void }) {
  const [activeTab, setActiveTab] = useState<AdminTabId>("sync");
  const [sqlExplorerAvailable, setSqlExplorerAvailable] = useState(false);
  const [dataExplorerAvailable, setDataExplorerAvailable] = useState(false);

  useEffect(() => {
    void (async () => {
      const [sqlAvailable, dataAvailable] = await Promise.all([
        getSqlExplorerAvailable(),
        getDataExplorerAvailable(),
      ]);
      setSqlExplorerAvailable(sqlAvailable.available);
      setDataExplorerAvailable(dataAvailable.available);
    })();
  }, []);

  const adminTabs = useMemo(() => {
    const rows: Array<{ id: AdminTabId; label: string }> = [
      { id: "sync", label: "S3 sync" },
      { id: "db-backup", label: "Database backup" },
      { id: "duplicates", label: "Duplicates" },
      { id: "thumbnails", label: "Thumbnails" },
      { id: "file-issues", label: "File issues" },
      { id: "whitelist", label: "Whitelist" },
      { id: "users", label: "Directory" },
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
        {activeTab === "sync" && <SyncTab onSyncComplete={onSyncComplete} />}
        {activeTab === "db-backup" && <DbBackupTab />}
        {activeTab === "duplicates" && <DuplicatesTab />}
        {activeTab === "thumbnails" && <ThumbnailsTab />}
        {activeTab === "file-issues" && <FileIssuesTab />}
        {activeTab === "whitelist" && <WhitelistTab />}
        {activeTab === "users" && <DirectoryTab />}
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
          <SqlExplorerTab />
        )}
      </div>
    </div>
  );
}
