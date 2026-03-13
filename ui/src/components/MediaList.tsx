import { useState, useCallback, useEffect } from "react";
import { MediaViewer } from "./MediaViewer";
import { MediaItemCell } from "./media/MediaItemCell";
import { MediaListBulkActions } from "./media/MediaListBulkActions";
import {
  groupItemsByDay,
  isViewable,
  type MediaItem,
} from "./media/mediaUtils";

interface MediaListProps {
  items: MediaItem[];
  loading: boolean;
  columnsPerRow?: number;
  onDelete?: (id: string) => Promise<void>;
  onBulkDelete?: (ids: string[]) => Promise<void>;
  onBulkIndex?: (ids: string[]) => Promise<void>;
  onUpdate?: () => void;
}

export function MediaList({
  items,
  loading,
  columnsPerRow = 8,
  onDelete,
  onBulkDelete,
  onBulkIndex,
  onUpdate,
}: MediaListProps) {
  const [viewing, setViewing] = useState<MediaItem | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<"idle" | "deleting" | "indexing">("idle");

  useEffect(() => {
    if (selected.size === 0) setSelectionMode(false);
  }, [selected.size]);

  const toggleSelect = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleCheckboxClick = useCallback(
    (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      if (!selectionMode) setSelectionMode(true);
      toggleSelect(id, e);
    },
    [selectionMode, toggleSelect]
  );

  const clearSelection = useCallback(() => {
    setSelected(new Set());
    setSelectionMode(false);
  }, []);

  const handleBulkDownload = useCallback(() => {
    const ids = Array.from(selected);
    ids.forEach((id) => {
      const item = items.find((i) => i.id === id);
      if (item) {
        const a = document.createElement("a");
        a.href = `/api/media/${id}`;
        a.download = item.originalName;
        a.click();
      }
    });
  }, [selected, items]);

  const handleBulkDelete = useCallback(async () => {
    const ids = Array.from(selected);
    if (!ids.length || !confirm(`Delete ${ids.length} file(s)?`)) return;
    setBulkAction("deleting");
    try {
      if (onBulkDelete) await onBulkDelete(ids);
      else if (onDelete) for (const id of ids) await onDelete(id);
      clearSelection();
    } finally {
      setBulkAction("idle");
    }
  }, [selected, onBulkDelete, onDelete, clearSelection]);

  const handleBulkIndex = useCallback(async () => {
    const ids = Array.from(selected);
    if (!ids.length) return;
    setBulkAction("indexing");
    try {
      if (onBulkIndex) await onBulkIndex(ids);
      clearSelection();
    } finally {
      setBulkAction("idle");
    }
  }, [selected, onBulkIndex, clearSelection]);

  if (loading) {
    return (
      <p style={{ color: "#64748b", textAlign: "center", padding: "2rem" }}>
        Loading…
      </p>
    );
  }

  if (items.length === 0) {
    return (
      <p style={{ color: "#64748b", textAlign: "center", padding: "2rem" }}>
        No files yet. Upload some to get started.
      </p>
    );
  }

  const groups = groupItemsByDay(items);

  return (
    <>
      <MediaViewer item={viewing} onClose={() => setViewing(null)} onUpdate={onUpdate} />
      {selected.size > 0 && (
        <MediaListBulkActions
          count={selected.size}
          onDownload={handleBulkDownload}
          onDelete={onDelete ? handleBulkDelete : undefined}
          onIndex={onBulkIndex ? handleBulkIndex : undefined}
          onCancel={clearSelection}
          deleting={bulkAction === "deleting"}
          indexing={bulkAction === "indexing"}
        />
      )}
      {groups.map(({ dateKey, dateLabel, items: groupItems }) => (
        <section key={dateKey} style={{ marginBottom: 32 }}>
          <h3 style={{ margin: "0 0 12px", fontSize: "0.9375rem", fontWeight: 600, color: "#475569" }}>
            {dateLabel}
          </h3>
          <ul
            style={{
              listStyle: "none",
              padding: 0,
              margin: 0,
              display: "grid",
              gridTemplateColumns: `repeat(${columnsPerRow}, 1fr)`,
              gap: 12,
            }}
          >
            {groupItems.map((item) => (
              <MediaItemCell
                key={item.id}
                item={item}
                selected={selected.has(item.id)}
                selectionMode={selectionMode}
                onCheckboxClick={handleCheckboxClick}
                onCellClick={() => {
                  if (selectionMode) {
                    setSelected((prev) => {
                      const next = new Set(prev);
                      if (next.has(item.id)) next.delete(item.id);
                      else next.add(item.id);
                      return next;
                    });
                  } else if (isViewable(item.mimeType)) {
                    setViewing(item);
                  }
                }}
              />
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}
