import { useCallback, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { AdminRecycleBinItem } from "@lissner/shared";
import { errorMessage, prependApiUrl } from "@/api";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import {
  bulkPermanentlyDeleteMedia,
  emptyRecycleBin,
  listRecycleBin,
  permanentlyDeleteMedia,
  restoreRecycleBinItem,
} from "../../api";
import { formatBytes } from "../../lib/format";
import { RecycleBinDetailModal } from "../recycle-bin-detail-modal";

const RECYCLE_KEY = ["admin", "recycleBin"];

const summarizeBulkResults = (
  results: Array<{ mediaId: string; ok: boolean }>,
): { okCount: number; failCount: number } => ({
  okCount: results.filter((r) => r.ok).length,
  failCount: results.filter((r) => !r.ok).length,
});

export function RecycleBinTab() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [detailItem, setDetailItem] = useState<AdminRecycleBinItem | null>(
    null,
  );
  const [busy, setBusy] = useState(false);

  const recycleQuery = useQuery({
    queryKey: RECYCLE_KEY,
    queryFn: () => listRecycleBin({ limit: 200, offset: 0 }),
  });
  const items = recycleQuery.data?.items ?? null;
  const total = recycleQuery.data?.total ?? 0;
  const loading = recycleQuery.isFetching;
  const error = recycleQuery.isError
    ? errorMessage(recycleQuery.error, "Failed to load recycle bin")
    : null;

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: RECYCLE_KEY });
  };

  const clearSelection = useCallback(() => {
    setSelected(new Set());
  }, []);

  const toggleSelect = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAllVisible = useCallback(() => {
    if (!items || items.length === 0) return;
    setSelected((prev) => {
      const allSelected = items.every((row) => prev.has(row.id));
      if (allSelected) return new Set();
      return new Set(items.map((row) => row.id));
    });
  }, [items]);

  const handleRestore = async (row: AdminRecycleBinItem) => {
    try {
      await restoreRecycleBinItem(row.id);
      showToast(`Restored “${row.originalName}”`, "success");
      if (detailItem?.id === row.id) setDetailItem(null);
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(row.id);
        return next;
      });
      await invalidate();
    } catch (err) {
      showToast(errorMessage(err, "Restore failed"));
    }
  };

  const handlePermanentDelete = async (row: AdminRecycleBinItem) => {
    if (
      !confirm(
        `Permanently delete “${row.originalName}”? This cannot be undone.`,
      )
    ) {
      return;
    }
    try {
      await permanentlyDeleteMedia(row.id);
      showToast(`Permanently deleted “${row.originalName}”`, "success");
      if (detailItem?.id === row.id) setDetailItem(null);
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(row.id);
        return next;
      });
      await invalidate();
    } catch (err) {
      showToast(errorMessage(err, "Permanent delete failed"));
    }
  };

  const handleDeleteSelected = async () => {
    const ids = [...selected];
    if (ids.length === 0) return;
    if (
      !confirm(
        `Permanently delete ${ids.length} selected item(s)? This cannot be undone.`,
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      const { results } = await bulkPermanentlyDeleteMedia(ids);
      const { okCount, failCount } = summarizeBulkResults(results);
      if (failCount === 0) {
        showToast(`Permanently deleted ${okCount} item(s)`, "success");
      } else {
        showToast(
          `Deleted ${okCount}; ${failCount} failed`,
          okCount > 0 ? "info" : "danger",
        );
      }
      if (detailItem && ids.includes(detailItem.id)) setDetailItem(null);
      clearSelection();
      await invalidate();
    } catch (err) {
      showToast(errorMessage(err, "Bulk delete failed"));
    } finally {
      setBusy(false);
    }
  };

  const handleEmptyBin = async () => {
    if (total === 0) return;
    if (
      !confirm(
        `Empty the recycle bin? Permanently delete all ${total} item(s)? This cannot be undone.`,
      )
    ) {
      return;
    }
    setBusy(true);
    try {
      const { results } = await emptyRecycleBin();
      const { okCount, failCount } = summarizeBulkResults(results);
      if (failCount === 0) {
        showToast(`Emptied recycle bin (${okCount} deleted)`, "success");
      } else {
        showToast(
          `Deleted ${okCount}; ${failCount} failed`,
          okCount > 0 ? "info" : "danger",
        );
      }
      setDetailItem(null);
      clearSelection();
      await invalidate();
    } catch (err) {
      showToast(errorMessage(err, "Empty recycle bin failed"));
    } finally {
      setBusy(false);
    }
  };

  const allVisibleSelected =
    items != null &&
    items.length > 0 &&
    items.every((row) => selected.has(row.id));

  return (
    <div
      id="admin-panel-recycle"
      role="tabpanel"
      aria-labelledby="admin-tab-recycle"
      className="admin-page__panel"
    >
      <section className="admin-page__section">
        <h3>Recycle bin</h3>
        <p className="admin-page__desc">
          Media removed from the gallery stays here until you restore it or
          delete it permanently. Files and face tags are kept until permanent
          delete. Click an item for a detailed preview.
        </p>
        <div className="admin-page__form">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={loading || busy}
            onClick={() => void invalidate()}
          >
            {loading ? "Loading…" : "Refresh"}
          </Button>
          {items !== null && items.length > 0 && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={busy}
              onClick={toggleSelectAllVisible}
            >
              {allVisibleSelected ? "Clear selection" : "Select all"}
            </Button>
          )}
          {selected.size > 0 && (
            <Button
              type="button"
              variant="danger"
              size="sm"
              disabled={busy}
              onClick={() => void handleDeleteSelected()}
            >
              Delete selected ({selected.size})
            </Button>
          )}
          {total > 0 && (
            <Button
              type="button"
              variant="danger"
              size="sm"
              disabled={busy || loading}
              onClick={() => void handleEmptyBin()}
            >
              Empty recycle bin
            </Button>
          )}
          {items !== null && (
            <span className="admin-page__meta">{total} item(s)</span>
          )}
        </div>
        {error && (
          <Alert variant="danger" role="alert">
            <p>{error}</p>
          </Alert>
        )}
        {!loading && items !== null && items.length === 0 && !error && (
          <p className="admin-page__meta">Recycle bin is empty.</p>
        )}
        {items !== null && items.length > 0 && (
          <ul className="admin-page__list">
            {items.map((row) => (
              <li
                key={row.id}
                className="admin-page__list-item admin-page__list-item--stacked"
              >
                <div className="admin-page__form recycle-bin-row">
                  <label className="recycle-bin-row__check">
                    <input
                      type="checkbox"
                      checked={selected.has(row.id)}
                      onChange={() => toggleSelect(row.id)}
                      aria-label={`Select ${row.originalName}`}
                    />
                  </label>
                  <button
                    type="button"
                    className="recycle-bin-row__open"
                    onClick={() => setDetailItem(row)}
                  >
                    <img
                      className="admin-page__thumb"
                      src={prependApiUrl(
                        `/media/${row.id}/thumbnail?v=${encodeURIComponent(String(row.size))}`,
                      )}
                      alt=""
                      width={64}
                      height={64}
                    />
                    <span className="recycle-bin-row__text">
                      <strong>{row.originalName}</strong>
                      <span className="admin-page__meta">
                        {" "}
                        · {row.mimeType} · {formatBytes(row.size)}
                      </span>
                      <span className="admin-page__meta u-mb-1">
                        Deleted:{" "}
                        {new Date(row.deletedAt).toLocaleString(undefined, {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </span>
                    </span>
                  </button>
                </div>
                <div className="admin-page__form">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={busy}
                    onClick={() => void handleRestore(row)}
                  >
                    Restore
                  </Button>
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    disabled={busy}
                    onClick={() => void handlePermanentDelete(row)}
                  >
                    Delete permanently
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
      {detailItem && (
        <RecycleBinDetailModal
          item={detailItem}
          onClose={() => setDetailItem(null)}
          onRestore={() => void handleRestore(detailItem)}
          onPermanentDelete={() => void handlePermanentDelete(detailItem)}
        />
      )}
    </div>
  );
}
