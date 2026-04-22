import { Button } from "@/components/ui/button";
import {
  ModalActions,
  ModalPanel,
  ModalRoot,
  ModalTitle,
} from "@/components/ui/modal";
import { formatLocalDateTimeMediumShort } from "@/lib/local-datetime.js";
import type { ActivitySnapshot } from "./activity-types";

function formatElapsed(seconds: number | null): string {
  if (seconds == null || seconds < 0) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function humanizeSyncPhase(phase: string): string {
  const map: Record<string, string> = {
    listing: "Listing remote files",
    "upload-media": "Uploading media to cloud",
    "upload-thumbnails": "Uploading thumbnails",
    "upload-db": "Uploading database backup",
    "download-media": "Downloading media from cloud",
    "download-thumbnails": "Downloading thumbnails",
    "merge-db": "Merging database",
    done: "Finished",
    error: "Error",
  };
  return map[phase] ?? phase.replace(/-/g, " ");
}

export function ActivityDetailModal({
  open,
  onClose,
  activity,
}: {
  open: boolean;
  onClose: () => void;
  activity: ActivitySnapshot | null;
}) {
  if (!open || !activity) return null;

  const idx = activity.index;
  const syn = activity.sync;
  const indexing = idx.inProgress;
  const syncing = syn.inProgress && syn.configured;
  const syncMsg = syn.lastResult;

  return (
    <ModalRoot onBackdropClick={onClose}>
      <ModalPanel
        className="activity-detail-modal-panel"
        style={{ width: "min(100%, 440px)", maxWidth: "100%" }}
        onEscape={onClose}
        aria-labelledby="activity-detail-title"
      >
        <ModalTitle id="activity-detail-title">Background activity</ModalTitle>
        <p
          className="activity-detail-modal__intro u-text-muted u-text-sm u-mb-4"
          style={{ marginTop: 0 }}
        >
          Live updates from the server. This window stays in sync while work is
          running.
        </p>

        {indexing && (
          <section
            className="activity-detail-modal__section"
            aria-labelledby="activity-detail-index"
          >
            <h3
              id="activity-detail-index"
              className="activity-detail-modal__heading"
            >
              AI indexing
            </h3>
            <dl className="activity-detail-modal__dl">
              <dt>Status</dt>
              <dd>Running</dd>
              {idx.startedAt && (
                <>
                  <dt>Started</dt>
                  <dd>{formatLocalDateTimeMediumShort(idx.startedAt)}</dd>
                </>
              )}
              <dt>Elapsed</dt>
              <dd>{formatElapsed(idx.elapsedSeconds)}</dd>
              {idx.jobId && (
                <>
                  <dt>Job ID</dt>
                  <dd className="activity-detail-modal__mono">{idx.jobId}</dd>
                </>
              )}
            </dl>
            {idx.progressTotal > 0 ? (
              <>
                <p className="activity-detail-modal__progress-label u-text-sm u-mb-1">
                  {idx.progressProcessed} / {idx.progressTotal} items
                </p>
                <progress
                  className="activity-detail-modal__progress"
                  value={idx.progressProcessed}
                  max={idx.progressTotal}
                />
              </>
            ) : (
              <p className="u-text-muted u-text-sm u-mb-0">
                Preparing or processing…
              </p>
            )}
            {idx.lastError && (
              <p
                className="activity-detail-modal__error u-text-sm u-mb-0"
                role="alert"
              >
                {idx.lastError}
              </p>
            )}
          </section>
        )}

        {syncing && (
          <section
            className="activity-detail-modal__section"
            aria-labelledby="activity-detail-sync"
          >
            <h3
              id="activity-detail-sync"
              className="activity-detail-modal__heading"
            >
              S3 sync
            </h3>
            {!syn.configured ? (
              <p className="u-text-muted u-text-sm">
                Backup is not configured. Missing:{" "}
                {syn.missingVars.join(", ") || "environment variables"}.
              </p>
            ) : (
              <>
                <dl className="activity-detail-modal__dl">
                  {syn.startedAt && (
                    <>
                      <dt>Started</dt>
                      <dd>{formatLocalDateTimeMediumShort(syn.startedAt)}</dd>
                    </>
                  )}
                  {syncMsg && (
                    <>
                      <dt>Phase</dt>
                      <dd>{humanizeSyncPhase(syncMsg.phase)}</dd>
                    </>
                  )}
                </dl>
                {syncMsg?.message && (
                  <p className="activity-detail-modal__message u-text-sm">
                    {syncMsg.message}
                  </p>
                )}
                {syncMsg && syncMsg.total > 0 && (
                  <>
                    <p className="activity-detail-modal__progress-label u-text-sm u-mb-1">
                      {syncMsg.current} / {syncMsg.total}
                    </p>
                    <progress
                      className="activity-detail-modal__progress"
                      value={syncMsg.current}
                      max={syncMsg.total}
                    />
                  </>
                )}
                {(syn.lastError || syncMsg?.error) && (
                  <p
                    className="activity-detail-modal__error u-text-sm u-mb-0"
                    role="alert"
                  >
                    {syn.lastError ?? syncMsg?.error}
                  </p>
                )}
              </>
            )}
          </section>
        )}

        {!indexing && !syncing && (
          <p className="activity-detail-modal__idle u-text-muted u-text-sm u-mb-4">
            No background indexing or sync is running right now. You can close
            this dialog.
          </p>
        )}

        <ModalActions>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </ModalActions>
      </ModalPanel>
    </ModalRoot>
  );
}
