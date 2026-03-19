import { useState } from "react";
import { isViewable, isImage, isVideo } from "./mediaUtils";
import type { MediaItem } from "./mediaUtils";

function FallbackImage({
  src,
  alt,
  fallbackIcon,
  className,
  onLoad,
}: {
  src: string;
  alt: string;
  fallbackIcon: string;
  className: string;
  onLoad?: () => void;
}) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return <span className={className.replace("media-cell__img", "media-cell__icon")}>{fallbackIcon}</span>;
  }
  return <img src={src} alt={alt} className={className} onError={() => setFailed(true)} onLoad={onLoad} />;
}

function VideoThumbnail({ item }: { item: { id: string; originalName: string } }) {
  const [thumbLoaded, setThumbLoaded] = useState(false);
  return (
    <div className="media-cell__video-wrap">
      <FallbackImage
        src={`/api/media/${item.id}/thumbnail`}
        alt={item.originalName}
        fallbackIcon="🎬"
        className="media-cell__img"
        onLoad={() => setThumbLoaded(true)}
      />
      {thumbLoaded && (
        <span className="media-cell__play-overlay" aria-hidden>
          <svg viewBox="0 0 24 24" fill="currentColor" className="media-cell__play-icon">
            <path d="M8 5v14l11-7z" />
          </svg>
        </span>
      )}
    </div>
  );
}

interface MediaItemCellProps {
  item: MediaItem;
  selected: boolean;
  selectionMode: boolean;
  onCheckboxClick: (id: string, e: React.MouseEvent) => void;
  onCellClick: () => void;
}

/** Shown when not indexed and/or not backed up; hover lists what’s missing. */
function indexingBackupWarningTitle(item: MediaItem): string | null {
  const issues: string[] = [];
  if (!item.indexed) issues.push("Not indexed for AI search");
  if (!item.backedUp) issues.push("Not backed up to cloud");
  return issues.length ? issues.join(" · ") : null;
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
  const needsIndexingBackupAttention = !item.indexed || !item.backedUp;
  const warningTitle = indexingBackupWarningTitle(item);

  return (
    <li
      className="media-cell"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        type="button"
        onClick={onCellClick}
        className={`media-cell__btn ${selectionMode ? "media-cell__btn--default" : ""}`}
        style={{ cursor: selectionMode ? "default" : isViewable(item.mimeType) ? "pointer" : "default" }}
      >
        <div className="media-cell__inner">
          {showCheckbox && (
            <div style={{ position: "absolute", top: 8, right: 8, zIndex: 2, opacity: selectionMode ? 1 : 0.6 }}>
              <input
                type="checkbox"
                checked={selected}
                onChange={() => {}}
                onClick={(e) => onCheckboxClick(item.id, e)}
                className="media-cell__checkbox"
              />
            </div>
          )}
          {!selectionMode && needsIndexingBackupAttention && warningTitle && (
            <div
              className="media-cell__badges media-cell__badges--warning"
              title={warningTitle}
              aria-label={warningTitle}
              role="img"
            >
              <span className="media-cell__badges-item" aria-hidden>
                ⚠️
              </span>
            </div>
          )}
          {isImage(item.mimeType) ? (
            <FallbackImage
              src={`/api/media/${item.id}/preview`}
              alt={item.originalName}
              fallbackIcon="📷"
              className="media-cell__img"
            />
          ) : isVideo(item.mimeType) ? (
            <VideoThumbnail item={item} />
          ) : (
            <span className="media-cell__icon">📄</span>
          )}
        </div>
      </button>
    </li>
  );
}
