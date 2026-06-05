import { useState } from "react";
import { AdminThumbnailRepairResponse } from "@shared";
import { ApiError } from "@/api";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { repairAdminThumbnails } from "../../api";

export function ThumbnailsTab() {
  const [thumbRepairMax, setThumbRepairMax] = useState(100);
  const [thumbRepairRunning, setThumbRepairRunning] = useState(false);
  const [thumbRepairError, setThumbRepairError] = useState<string | null>(null);
  const [thumbRepairResult, setThumbRepairResult] =
    useState<AdminThumbnailRepairResponse | null>(null);

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

  return (
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
    </div>
  );
}
