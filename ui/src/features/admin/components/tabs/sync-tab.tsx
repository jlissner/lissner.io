import { BackupPage } from "@/features/backup/components/backup-page";

export function SyncTab({ onSyncComplete }: { onSyncComplete?: () => void }) {
  return (
    <div
      id="admin-panel-sync"
      role="tabpanel"
      aria-labelledby="admin-tab-sync"
      className="admin-page__panel"
    >
      <section className="admin-page__section">
        <h3>S3 sync</h3>
        <p className="admin-page__desc">
          Two-way sync with your bucket: upload new files, download missing
          ones, and merge media from other devices.
        </p>
        <BackupPage onSyncComplete={onSyncComplete} />
      </section>
    </div>
  );
}
