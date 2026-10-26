import { useState } from "react";
import { ActivityDetailModal } from "./activity-detail-modal.js";
import { useActivity } from "./activity-provider";

function formatElapsed(seconds: number | null): string | null {
  if (seconds == null || seconds < 0) return null;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/**
 * Fixed bottom-left summary of server-reported activity (indexing, S3 sync).
 * Click to open a modal with full progress. Visible only while work is in progress.
 */
export function GlobalActivityOverlay() {
  const activity = useActivity();
  const [detailOpen, setDetailOpen] = useState(false);

  if (!activity) return null;

  const indexing = activity.index.inProgress;
  const syncing = activity.sync.inProgress;

  if (!indexing && !syncing) return null;

  const indexProgress =
    activity.index.progressTotal > 0
      ? `${activity.index.progressProcessed}/${activity.index.progressTotal}`
      : null;
  const indexElapsed = formatElapsed(activity.index.elapsedSeconds);

  const syncLast = activity.sync.lastResult;

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        className="activity-overlay activity-overlay--interactive"
        aria-label="View background activity details"
        title="Click for full progress"
        onClick={() => setDetailOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setDetailOpen(true);
          }
        }}
      >
        {indexing && (
          <div className="activity-overlay__block">
            <div className="activity-overlay__title">AI indexing</div>
            <div className="activity-overlay__meta">
              {indexProgress && <span>{indexProgress}</span>}
              {indexProgress && indexElapsed && (
                <span className="activity-overlay__sep" aria-hidden>
                  ·
                </span>
              )}
              {indexElapsed && <span>{indexElapsed}</span>}
              {!indexProgress && !indexElapsed && <span>Running…</span>}
            </div>
          </div>
        )}
        {syncing && (
          <div className="activity-overlay__block">
            <div className="activity-overlay__title">S3 sync</div>
            <div className="activity-overlay__meta">
              {syncLast?.message ? (
                <span className="activity-overlay__msg">
                  {syncLast.message}
                </span>
              ) : syncLast && syncLast.total > 0 ? (
                <span>
                  {syncLast.current}/{syncLast.total}
                </span>
              ) : (
                <span>Running…</span>
              )}
            </div>
          </div>
        )}
        <div className="activity-overlay__hint">Click for details</div>
      </div>
      <ActivityDetailModal
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        activity={activity}
      />
    </>
  );
}
