import { useState } from "react";
import { errorMessage } from "@/api";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useActivity } from "@/components/activity/activity-provider";
import { BackupPage } from "@/features/backup/components/backup-page";
import { triggerIndex } from "@/features/media/api";

export function SyncTab({ onSyncComplete }: { onSyncComplete?: () => void }) {
  const activity = useActivity();
  const [libraryReindexError, setLibraryReindexError] = useState<string | null>(
    null,
  );

  const handleReindex = () => {
    setLibraryReindexError(null);
    void (async () => {
      try {
        const data = await triggerIndex(true);
        if (data.started !== true) {
          setLibraryReindexError(data.error ?? "Could not start re-index");
        }
      } catch (err) {
        setLibraryReindexError(errorMessage(err, "Re-index failed"));
      }
    })();
  };

  return (
    <div
      id="admin-panel-sync"
      role="tabpanel"
      aria-labelledby="admin-tab-sync"
      className="admin-page__panel"
    >
      <section className="admin-page__section">
        <h3>Search index & faces</h3>
        <p className="admin-page__desc">
          Re-run indexing for the entire library (embeddings, automatic face
          tags from current rules). Manual face assignments are preserved.
        </p>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={activity?.index.inProgress === true}
          onClick={handleReindex}
        >
          {activity?.index.inProgress
            ? "Re-indexing…"
            : "Re-index entire library"}
        </Button>
        {activity?.index.inProgress && (
          <p className="admin-page__meta" style={{ marginTop: 8 }}>
            Progress: {activity.index.progressProcessed ?? 0} /{" "}
            {activity.index.progressTotal ?? 0}
          </p>
        )}
        {libraryReindexError && (
          <Alert variant="danger" role="alert" className="u-mt-3">
            <p>{libraryReindexError}</p>
          </Alert>
        )}
      </section>
      <section className="admin-page__section">
        <h3>S3 sync</h3>
        <p className="admin-page__desc">
          Two-way sync with your bucket: upload new files, download missing
          ones, and merge media from other devices.
        </p>
        <BackupPage onSyncComplete={onSyncComplete} showTitle={false} />
      </section>
    </div>
  );
}
