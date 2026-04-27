import { useCallback, useMemo, useState } from "react";
import { ApiError } from "@/api";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  bulkDeleteMediaByIds,
  getAllDuplicates,
  type DuplicateMatch,
} from "../api";
import {
  type DuplicateDecision,
  mediaIdsToDeleteFromDecisions,
} from "../lib/duplicates";

function rowKey(dup: DuplicateMatch): string {
  return `${dup.mediaId}:${dup.duplicateOfId}`;
}

function decisionLabel(decision: DuplicateDecision | undefined): string {
  if (decision === "keep_left") return "Delete right";
  if (decision === "keep_right") return "Delete left";
  if (decision === "skip") return "Skip";
  return "No decision";
}

function willDeleteId(
  dup: DuplicateMatch,
  decision: DuplicateDecision | undefined,
): string | null {
  if (decision === "keep_left") return dup.duplicateOfId;
  if (decision === "keep_right") return dup.mediaId;
  return null;
}

export function DuplicateReviewer() {
  const [duplicates, setDuplicates] = useState<DuplicateMatch[]>([]);
  const [findingDuplicates, setFindingDuplicates] = useState(false);
  const [deletingSelected, setDeletingSelected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteSummary, setDeleteSummary] = useState<{
    deleted: number;
    failed: Array<{
      mediaId: string;
      reason: "not_found" | "forbidden" | "delete_failed";
    }>;
  } | null>(null);
  const [decisionsByKey, setDecisionsByKey] = useState<
    Record<string, DuplicateDecision | undefined>
  >({});

  const controlsDisabled = findingDuplicates || deletingSelected;

  const handleFindDuplicates = useCallback(async () => {
    setFindingDuplicates(true);
    setError(null);
    setDeleteSummary(null);
    setDuplicates([]);
    try {
      const result = await getAllDuplicates();
      setDuplicates(result.duplicates);
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Failed to find duplicates";
      setError(message);
    } finally {
      setFindingDuplicates(false);
    }
  }, []);

  const mediaIdsToDelete = useMemo(
    () => mediaIdsToDeleteFromDecisions(duplicates, decisionsByKey),
    [duplicates, decisionsByKey],
  );

  const handleDeleteSelected = useCallback(async () => {
    if (mediaIdsToDelete.length === 0) return;

    const ok = window.confirm(
      `Delete selected (${mediaIdsToDelete.length})? This cannot be undone.`,
    );
    if (!ok) return;

    setDeletingSelected(true);
    setError(null);
    setDeleteSummary(null);
    try {
      const res = await bulkDeleteMediaByIds(mediaIdsToDelete);
      const deletedIds = new Set(
        res.results.filter((r) => r.ok).map((r) => r.mediaId),
      );
      const failed = res.results
        .filter((r) => !r.ok)
        .map((r) => ({ mediaId: r.mediaId, reason: r.reason }));

      setDeleteSummary({ deleted: deletedIds.size, failed });

      setDuplicates((prev) =>
        prev.filter(
          (dup) =>
            !deletedIds.has(dup.mediaId) && !deletedIds.has(dup.duplicateOfId),
        ),
      );
      setDecisionsByKey((prev) =>
        Object.fromEntries(
          Object.entries(prev).filter(([key]) => {
            const [left, right] = key.split(":");
            return (
              left != null &&
              right != null &&
              !deletedIds.has(left) &&
              !deletedIds.has(right)
            );
          }),
        ),
      );
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Failed to delete selected";
      setError(message);
    } finally {
      setDeletingSelected(false);
    }
  }, [mediaIdsToDelete]);

  const setDecisionForRow = useCallback(
    (dup: DuplicateMatch, decision: DuplicateDecision) => {
      const key = rowKey(dup);
      setDecisionsByKey((prev) => ({ ...prev, [key]: decision }));
    },
    [],
  );

  const applyBulkDecision = useCallback(
    (decision: DuplicateDecision) => {
      const nextEntries = duplicates.map(
        (dup) => [rowKey(dup), decision] as const,
      );
      setDecisionsByKey((prev) => ({
        ...prev,
        ...Object.fromEntries(nextEntries),
      }));
    },
    [duplicates],
  );

  const hasDuplicates = duplicates.length > 0;

  const decisionSummary = useMemo(() => {
    const keys = duplicates.map(rowKey);
    const decided = keys.filter((k) => decisionsByKey[k] != null).length;
    return { decided, total: keys.length };
  }, [duplicates, decisionsByKey]);

  return (
    <div>
      <div className="admin-page__form" style={{ marginTop: "1rem" }}>
        <Button onClick={handleFindDuplicates} disabled={controlsDisabled}>
          {findingDuplicates ? "Finding..." : "Find Duplicates"}
        </Button>
        {hasDuplicates && (
          <p className="admin-page__meta">
            {duplicates.length} candidate{duplicates.length === 1 ? "" : "s"} ·{" "}
            {decisionSummary.decided}/{decisionSummary.total} decided
          </p>
        )}
      </div>

      {error && (
        <Alert variant="danger" role="alert">
          <p>{error}</p>
        </Alert>
      )}

      {deletingSelected && (
        <Alert variant="info" role="status">
          <p>Deleting {mediaIdsToDelete.length} selected…</p>
        </Alert>
      )}

      {deleteSummary && (
        <Alert
          variant={deleteSummary.failed.length === 0 ? "success" : "warning"}
          role="status"
        >
          <p>
            Deleted <strong>{deleteSummary.deleted}</strong> /{" "}
            <strong>
              {deleteSummary.deleted + deleteSummary.failed.length}
            </strong>{" "}
            · Failed <strong>{deleteSummary.failed.length}</strong>
          </p>
          {deleteSummary.failed.length > 0 && (
            <ul style={{ marginTop: 8 }}>
              {deleteSummary.failed.map((f) => (
                <li key={f.mediaId}>
                  <code>{f.mediaId}</code> — <strong>{f.reason}</strong>
                </li>
              ))}
            </ul>
          )}
        </Alert>
      )}

      {hasDuplicates && (
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <Button
            variant="secondary"
            size="sm"
            disabled={controlsDisabled}
            onClick={() => applyBulkDecision("keep_left")}
          >
            Keep left for all
          </Button>
          <Button
            variant="secondary"
            size="sm"
            disabled={controlsDisabled}
            onClick={() => applyBulkDecision("keep_right")}
          >
            Keep right for all
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={controlsDisabled}
            onClick={() => applyBulkDecision("skip")}
          >
            Skip all
          </Button>
          {mediaIdsToDelete.length > 0 && (
            <Button
              size="sm"
              disabled={controlsDisabled}
              onClick={handleDeleteSelected}
            >
              Delete selected ({mediaIdsToDelete.length})
            </Button>
          )}
        </div>
      )}

      {hasDuplicates && (
        <ul className="admin-page__list" style={{ marginTop: "0.75rem" }}>
          {duplicates.map((dup) => {
            const key = rowKey(dup);
            const decision = decisionsByKey[key];
            const willDelete = willDeleteId(dup, decision);
            return (
              <li
                key={key}
                className="admin-page__list-item admin-page__list-item--stacked"
              >
                <div
                  style={{
                    display: "flex",
                    gap: "0.75rem",
                    flexWrap: "wrap",
                    alignItems: "flex-start",
                    width: "100%",
                  }}
                >
                  <div style={{ flex: "1 1 240px", minWidth: 220 }}>
                    <img
                      src={`/api/media/${dup.mediaId}/preview`}
                      alt={dup.mediaId}
                      style={{
                        width: "100%",
                        height: "auto",
                        display: "block",
                        borderRadius: 6,
                      }}
                      loading="lazy"
                    />
                    <div className="admin-page__meta" style={{ marginTop: 6 }}>
                      <code>{dup.mediaId}</code>
                    </div>
                  </div>

                  <div style={{ flex: "1 1 240px", minWidth: 220 }}>
                    <img
                      src={`/api/media/${dup.duplicateOfId}/preview`}
                      alt={dup.duplicateOfId}
                      style={{
                        width: "100%",
                        height: "auto",
                        display: "block",
                        borderRadius: 6,
                      }}
                      loading="lazy"
                    />
                    <div className="admin-page__meta" style={{ marginTop: 6 }}>
                      <code>{dup.duplicateOfId}</code>
                    </div>
                  </div>

                  <div style={{ flex: "2 1 260px", minWidth: 240 }}>
                    <div className="admin-page__meta">
                      Distance: <strong>{dup.hammingDistance}</strong>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        gap: "0.5rem",
                        flexWrap: "wrap",
                        marginTop: "0.5rem",
                      }}
                    >
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={controlsDisabled}
                        onClick={() => setDecisionForRow(dup, "keep_left")}
                      >
                        Keep left
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={controlsDisabled}
                        onClick={() => setDecisionForRow(dup, "keep_right")}
                      >
                        Keep right
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={controlsDisabled}
                        onClick={() => setDecisionForRow(dup, "skip")}
                      >
                        Skip
                      </Button>
                    </div>

                    <div className="admin-page__meta" style={{ marginTop: 8 }}>
                      Decision: <strong>{decisionLabel(decision)}</strong>
                      {willDelete && (
                        <>
                          {" "}
                          · Will delete: <code>{willDelete}</code>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
