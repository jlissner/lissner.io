import { useState, useCallback, useEffect } from "react";
import { MediaViewer } from "./MediaViewer";

interface MediaItem {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
  dateTaken?: string | null;
  indexed?: boolean;
  people?: string[];
}

function getItemDateKey(item: MediaItem): string {
  const dateStr = item.dateTaken ?? item.uploadedAt;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? "unknown" : d.toISOString().slice(0, 10);
}

function formatDateLabel(dateKey: string): string {
  if (dateKey === "unknown") return "Unknown date";
  const d = new Date(dateKey + "T12:00:00");
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function groupItemsByDay(items: MediaItem[]): Array<{ dateKey: string; dateLabel: string; items: MediaItem[] }> {
  const map = new Map<string, MediaItem[]>();
  for (const item of items) {
    const key = getItemDateKey(item);
    const list = map.get(key) ?? [];
    list.push(item);
    map.set(key, list);
  }
  const keys = [...map.keys()].sort((a, b) => {
    if (a === "unknown") return 1;
    if (b === "unknown") return -1;
    return b.localeCompare(a);
  });
  return keys.map((dateKey) => ({
    dateKey,
    dateLabel: formatDateLabel(dateKey),
    items: map.get(dateKey)!,
  }));
}

interface MediaListProps {
  items: MediaItem[];
  loading: boolean;
  columnsPerRow?: number;
  onDelete?: (id: string) => Promise<void>;
  onBulkDelete?: (ids: string[]) => Promise<void>;
  onBulkIndex?: (ids: string[]) => Promise<void>;
  onUpdate?: () => void;
}

function isImage(mimeType: string): boolean {
  return mimeType.startsWith("image/");
}

function isVideo(mimeType: string): boolean {
  return mimeType.startsWith("video/");
}

function isText(mimeType: string): boolean {
  return (
    mimeType.startsWith("text/") ||
    mimeType === "application/json" ||
    mimeType === "application/xml"
  );
}

function isViewable(mimeType: string): boolean {
  return isImage(mimeType) || isVideo(mimeType) || isText(mimeType);
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
      if (onBulkDelete) {
        await onBulkDelete(ids);
      } else if (onDelete) {
        for (const id of ids) await onDelete(id);
      }
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

  const selectedCount = selected.size;
  const groups = groupItemsByDay(items);

  return (
    <>
      <MediaViewer
        item={viewing}
        onClose={() => setViewing(null)}
        onUpdate={onUpdate}
      />

      {selectedCount > 0 && (
        <div
          style={{
            position: "sticky",
            top: 0,
            zIndex: 10,
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "12px 16px",
            marginBottom: 16,
            backgroundColor: "#eef2ff",
            borderRadius: 8,
            flexWrap: "wrap",
          }}
        >
          <span style={{ fontWeight: 500 }}>
            {selectedCount} selected
          </span>
          <button
            type="button"
            onClick={handleBulkDownload}
            style={{
              padding: "6px 12px",
              borderRadius: 6,
              border: "1px solid #c7d2fe",
              background: "#fff",
              cursor: "pointer",
              fontSize: "0.875rem",
            }}
          >
            Download
          </button>
          {onDelete && (
            <button
              type="button"
              onClick={handleBulkDelete}
              disabled={bulkAction === "deleting"}
              style={{
                padding: "6px 12px",
                borderRadius: 6,
                border: "1px solid #fecaca",
                background: "#fff",
                color: "#dc2626",
                cursor: bulkAction === "deleting" ? "not-allowed" : "pointer",
                fontSize: "0.875rem",
              }}
            >
              {bulkAction === "deleting" ? "Deleting…" : "Delete"}
            </button>
          )}
          {onBulkIndex && (
            <button
              type="button"
              onClick={handleBulkIndex}
              disabled={bulkAction === "indexing"}
              style={{
                padding: "6px 12px",
                borderRadius: 6,
                border: "1px solid #c7d2fe",
                background: "#fff",
                cursor: bulkAction === "indexing" ? "not-allowed" : "pointer",
                fontSize: "0.875rem",
              }}
            >
              {bulkAction === "indexing" ? "Indexing…" : "Index for AI"}
            </button>
          )}
          <button
            type="button"
            onClick={clearSelection}
            style={{
              padding: "6px 12px",
              borderRadius: 6,
              border: "none",
              background: "transparent",
              cursor: "pointer",
              fontSize: "0.875rem",
              color: "#64748b",
            }}
          >
            Cancel
          </button>
        </div>
      )}

      {groups.map(({ dateKey, dateLabel, items: groupItems }) => (
        <section key={dateKey} style={{ marginBottom: 32 }}>
          <h3
            style={{
              margin: "0 0 12px",
              fontSize: "0.9375rem",
              fontWeight: 600,
              color: "#475569",
            }}
          >
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

function MediaItemCell({
  item,
  selected,
  selectionMode,
  onCheckboxClick,
  onCellClick,
}: {
  item: MediaItem;
  selected: boolean;
  selectionMode: boolean;
  onCheckboxClick: (id: string, e: React.MouseEvent) => void;
  onCellClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const showCheckbox = selectionMode || hovered;

  return (
    <li
      style={{
        aspectRatio: "1",
        borderRadius: 8,
        overflow: "hidden",
        backgroundColor: "#f1f5f9",
        position: "relative",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        type="button"
        onClick={onCellClick}
        style={{
          display: "block",
          width: "100%",
          height: "100%",
          border: "none",
          padding: 0,
          background: "none",
          cursor: selectionMode ? "default" : isViewable(item.mimeType) ? "pointer" : "default",
          textAlign: "left",
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            position: "relative",
          }}
        >
          {showCheckbox && (
            <div
              style={{
                position: "absolute",
                top: 8,
                right: 8,
                zIndex: 2,
                opacity: selectionMode ? 1 : 0.6,
              }}
            >
              <input
                type="checkbox"
                checked={selected}
                onChange={() => {}}
                onClick={(e) => onCheckboxClick(item.id, e)}
                style={{
                  width: 20,
                  height: 20,
                  cursor: "pointer",
                  accentColor: "#4f46e5",
                }}
              />
            </div>
          )}
          {!selectionMode && item.indexed && (
            <span
              style={{
                position: "absolute",
                top: 8,
                left: 8,
                zIndex: 1,
                fontSize: "0.875rem",
              }}
              title="Indexed for AI search"
            >
              ✨
            </span>
          )}
          {isImage(item.mimeType) ? (
            <img
              src={`/api/media/${item.id}/preview`}
              alt={item.originalName}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
          ) : isVideo(item.mimeType) ? (
            <span style={{ fontSize: "2rem", color: "#94a3b8" }}>🎬</span>
          ) : (
            <span style={{ fontSize: "2rem", color: "#94a3b8" }}>📄</span>
          )}
        </div>
      </button>
    </li>
  );
}
