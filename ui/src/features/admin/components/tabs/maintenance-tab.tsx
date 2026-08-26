import { useState } from "react";
import { AdminThumbnailRepairResponse } from "@shared";
import { errorMessage } from "@/api";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useActivity } from "@/components/activity/activity-provider";
import { triggerIndex } from "@/features/media/api";
import {
  bulkDeleteUntaggedPlaceholders,
  computeAllHashes,
  repairAdminThumbnails,
} from "../../api";

export function MaintenanceTab() {
  const activity = useActivity();
  const [libraryReindexError, setLibraryReindexError] = useState<string | null>(
    null,
  );
  const [thumbRepairMax, setThumbRepairMax] = useState(100);
  const [thumbRepairRunning, setThumbRepairRunning] = useState(false);
  const [thumbRepairError, setThumbRepairError] = useState<string | null>(null);
  const [thumbRepairResult, setThumbRepairResult] =
    useState<AdminThumbnailRepairResponse | null>(null);
  const [computingHashes, setComputingHashes] = useState(false);
  const [hashError, setHashError] = useState<string | null>(null);
  const [hashResult, setHashResult] = useState<{
    computed: number;
    failed: number;
    total: number;
  } | null>(null);
  const [cleanupRunning, setCleanupRunning] = useState(false);
  const [cleanupError, setCleanupError] = useState<string | null>(null);
  const [cleanupResult, setCleanupResult] = useState<number | null>(null);

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

  const handleComputeHashes = async () => {
    setComputingHashes(true);
    setHashError(null);
    setHashResult(null);
    try {
      setHashResult(await computeAllHashes());
    } catch (err) {
      setHashError(errorMessage(err, "Failed to compute hashes"));
    } finally {
      setComputingHashes(false);
    }
  };

  const handleCleanupPlaceholders = async () => {
    setCleanupRunning(true);
    setCleanupError(null);
    setCleanupResult(null);
    try {
      const result = await bulkDeleteUntaggedPlaceholders();
      setCleanupResult(result.deleted.length);
    } catch (err) {
      setCleanupError(errorMessage(err, "Cleanup failed"));
    } finally {
      setCleanupRunning(false);
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
      setThumbRepairError(errorMessage(err, "Thumbnail repair failed"));
    } finally {
      setThumbRepairRunning(false);
    }
  };

  return (
    <div
      id="admin-panel-maintenance"
      role="tabpanel"
      aria-labelledby="admin-tab-maintenance"
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
        <h3>Thumbnails</h3>
        <p className="admin-page__desc">
          Scan all media for missing or empty JPEG thumbnails (images use{" "}
          <code>_thumb.jpg</code>, videos use <code>.jpg</code> next to the
          media file). Up to the limit below are regenerated per run (Sharp for
          images, ffmpeg for videos). Run again if some items were capped.
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
                  ["Media rows scanned", thumbRepairResult.scanned] as const,
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
                        <span className="admin-page__meta"> — {f.reason}</span>
                      </div>
                      {f.detail != null && f.detail !== "" && (
                        <p className="admin-page__meta u-mb-0">{f.detail}</p>
                      )}
                    </li>
                  ))}
                </ul>
              </Alert>
            )}
          </div>
        )}
      </section>

      <section className="admin-page__section">
        <h3>Duplicate-detection hashes</h3>
        <p className="admin-page__desc">
          Compute perceptual hashes for existing images so they can be matched
          in the Duplicates tab. New uploads are hashed automatically; this
          backfills older media.
        </p>
        <div className="admin-page__form">
          <Button onClick={handleComputeHashes} disabled={computingHashes}>
            {computingHashes ? "Computing…" : "Compute all hashes"}
          </Button>
          {hashResult && (
            <p className="admin-page__meta">
              Computed {hashResult.computed} of {hashResult.total} images (
              {hashResult.failed} failed)
            </p>
          )}
        </div>
        {hashError && (
          <Alert variant="danger" role="alert">
            <p>{hashError}</p>
          </Alert>
        )}
      </section>

      <section className="admin-page__section">
        <h3>People cleanup</h3>
        <p className="admin-page__desc">
          Delete all unnamed placeholder people (e.g. &ldquo;Person 42&rdquo;)
          that have zero face tags. These are empty entries left over from
          previous indexing runs.
        </p>
        <div className="admin-page__form">
          <Button
            onClick={() => void handleCleanupPlaceholders()}
            disabled={cleanupRunning}
            variant="danger"
          >
            {cleanupRunning ? "Deleting…" : "Delete untagged placeholders"}
          </Button>
          {cleanupResult != null && (
            <p className="admin-page__meta">
              Deleted {cleanupResult} placeholder
              {cleanupResult === 1 ? "" : "s"}
            </p>
          )}
        </div>
        {cleanupError && (
          <Alert variant="danger" role="alert">
            <p>{cleanupError}</p>
          </Alert>
        )}
      </section>
    </div>
  );
}
