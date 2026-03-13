import { useState } from "react";
import { isViewable, isImage, isVideo } from "./mediaUtils";
import type { MediaItem } from "./mediaUtils";

interface MediaItemCellProps {
  item: MediaItem;
  selected: boolean;
  selectionMode: boolean;
  onCheckboxClick: (id: string, e: React.MouseEvent) => void;
  onCellClick: () => void;
}

export function MediaItemCell({
  item,
  selected,
  selectionMode,
  onCheckboxClick,
  onCellClick,
}: MediaItemCellProps) {
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
            <div style={{ position: "absolute", top: 8, right: 8, zIndex: 2, opacity: selectionMode ? 1 : 0.6 }}>
              <input
                type="checkbox"
                checked={selected}
                onChange={() => {}}
                onClick={(e) => onCheckboxClick(item.id, e)}
                style={{ width: 20, height: 20, cursor: "pointer", accentColor: "#4f46e5" }}
              />
            </div>
          )}
          {!selectionMode && item.indexed && (
            <span style={{ position: "absolute", top: 8, left: 8, zIndex: 1, fontSize: "0.875rem" }} title="Indexed for AI search">
              ✨
            </span>
          )}
          {isImage(item.mimeType) ? (
            <img
              src={`/api/media/${item.id}/preview`}
              alt={item.originalName}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
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
