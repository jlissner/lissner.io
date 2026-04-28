import { useState } from "react";
import { useMediaViewerUrlSync } from "../hooks/use-media-viewer-url-sync";
import { MediaViewer } from "./media-viewer";
import { MediaItemCell } from "./media-viewer/media-item-cell";
import { groupItemsByDay, type MediaItem } from "./media-viewer/media-utils";

interface MediaListProps {
  items: MediaItem[];
  loading: boolean;
  sortBy?: "uploaded" | "taken";
  selected: Set<string>;
  setSelected: React.Dispatch<React.SetStateAction<Set<string>>>;
  selectionMode: boolean;
  onCheckboxToggle: (id: string) => void;
  onToggleSelectAllForDay: (groupItems: MediaItem[]) => void;
  onUpdate?: () => void;
}

export function MediaList({
  items,
  loading,
  sortBy = "taken",
  selected,
  setSelected,
  selectionMode,
  onCheckboxToggle,
  onToggleSelectAllForDay,
  onUpdate,
}: MediaListProps) {
  const [viewing, setViewing] = useState<MediaItem | null>(null);
  const { dismissViewing } = useMediaViewerUrlSync({
    viewing,
    setViewing,
    items,
  });

  if (loading && !viewing) {
    return <p className="empty">Loading…</p>;
  }

  if (items.length === 0 && !viewing) {
    return <p className="empty">No files yet. Upload some to get started.</p>;
  }

  const groups = groupItemsByDay(items, sortBy);

  return (
    <>
      <MediaViewer
        item={viewing}
        items={items}
        onSelectItem={setViewing}
        onClose={dismissViewing}
        onUpdate={onUpdate}
      />
      {groups.map(({ dateKey, dateLabel, items: groupItems }) => {
        const ids = groupItems.map((i) => i.id);
        const selectedCount = ids.filter((id) => selected.has(id)).length;
        const allSelected = ids.length > 0 && selectedCount === ids.length;
        const someSelected = selectedCount > 0;
        return (
          <section key={dateKey} className="section" data-date-key={dateKey}>
            <label className="section__header">
              <span className="section__title">{dateLabel}</span>
              <input
                type="checkbox"
                className="section__checkbox"
                checked={allSelected}
                ref={(el) => {
                  if (el) el.indeterminate = someSelected && !allSelected;
                }}
                onChange={() => onToggleSelectAllForDay(groupItems)}
                onClick={(e) => e.stopPropagation()}
              />
            </label>
            <ul
              className="media-grid"
              style={{ listStyle: "none", padding: 0, margin: 0 }}
            >
              {groupItems.map((item) => (
                <MediaItemCell
                  key={item.id}
                  item={item}
                  selected={selected.has(item.id)}
                  selectionMode={selectionMode}
                  onCheckboxToggle={onCheckboxToggle}
                  onCellClick={() => {
                    if (selectionMode) {
                      setSelected((prev) => {
                        const next = new Set(prev);
                        if (next.has(item.id)) next.delete(item.id);
                        else next.add(item.id);
                        return next;
                      });
                    } else {
                      setViewing(item);
                    }
                  }}
                />
              ))}
            </ul>
          </section>
        );
      })}
    </>
  );
}
