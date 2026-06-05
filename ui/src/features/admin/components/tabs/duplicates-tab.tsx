import { useState } from "react";
import { ApiError } from "@/api";
import { Button } from "@/components/ui/button";
import { computeAllHashes } from "../../api";
import { DuplicateReviewer } from "../duplicate-reviewer";

export function DuplicatesTab() {
  const [computingHashes, setComputingHashes] = useState(false);
  const [hashResult, setHashResult] = useState<{
    computed: number;
    failed: number;
    total: number;
  } | null>(null);

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

  return (
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
          Hashes are computed automatically for new uploads, but you can compute
          them for existing images here.
        </p>
        <div className="admin-page__form">
          <Button onClick={handleComputeAllHashes} disabled={computingHashes}>
            {computingHashes ? "Computing..." : "Compute All Hashes"}
          </Button>
          {hashResult && (
            <p className="admin-page__meta">
              Computed {hashResult.computed} of {hashResult.total} images (
              {hashResult.failed} failed)
            </p>
          )}
        </div>
        <DuplicateReviewer />
      </section>
    </div>
  );
}
