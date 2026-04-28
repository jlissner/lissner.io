import { useState } from "react";
import {
  isImage,
  isPixelMotionPhotoBasename,
  isVideo,
  mediaThumbnailUrl,
} from "./media-utils";
import type { MediaItem } from "./media-utils";

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
    return (
      <span
        className={className.replace("media-cell__img", "media-cell__icon")}
      >
        {fallbackIcon}
      </span>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setFailed(true)}
      onLoad={onLoad}
    />
  );
}

function VideoThumbnail({
  item,
}: {
  item: { id: string; originalName: string; size: number };
}) {
  const [thumbLoaded, setThumbLoaded] = useState(false);
  return (
    <div className="media-cell__video-wrap">
      <FallbackImage
        src={mediaThumbnailUrl(item)}
        alt={item.originalName}
        fallbackIcon="🎬"
        className="media-cell__img"
        onLoad={() => setThumbLoaded(true)}
      />
      {thumbLoaded && (
        <span className="media-cell__play-overlay" aria-hidden>
          <svg
            viewBox="0 0 24 24"
            fill="currentColor"
            className="media-cell__play-icon"
          >
            <path d="M8 5v14l11-7z" />
          </svg>
        </span>
      )}
    </div>
  );
}

/** Still thumbnail with motion clip: show the still as the image and a play affordance. */
function MotionPairThumbnail({
  item,
}: {
  item: { id: string; originalName: string; size: number };
}) {
  const [loaded, setLoaded] = useState(false);
  return (
    <div className="media-cell__video-wrap">
      <FallbackImage
        src={mediaThumbnailUrl(item)}
        alt={item.originalName}
        fallbackIcon="📷"
        className="media-cell__img"
        onLoad={() => setLoaded(true)}
      />
      {loaded && (
        <span className="media-cell__play-overlay" aria-hidden>
          <svg
            viewBox="0 0 24 24"
            fill="currentColor"
            className="media-cell__play-icon"
          >
            <path d="M8 5v14l11-7z" />
          </svg>
        </span>
      )}
      <span className="media-cell__motion-badge">Motion</span>
    </div>
  );
}

interface MediaItemCellProps {
  item: MediaItem;
  selected: boolean;
  selectionMode: boolean;
  onCheckboxToggle: (id: string) => void;
  onCellClick: () => void;
}

/** Shown when not indexed and/or not backed up; hover lists what’s missing. */
function indexingBackupWarningTitle(item: MediaItem): string | null {
  const issues = [
    !item.indexed ? "Not indexed for AI search" : null,
    !item.backedUp ? "Not backed up to cloud" : null,
  ].filter((issue): issue is string => issue !== null);
  return issues.length ? issues.join(" · ") : null;
}

export function MediaItemCell({
  item,
  selected,
  selectionMode,
  onCheckboxToggle,
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
        style={{
          cursor: selectionMode ? "default" : "pointer",
        }}
      >
        <div className="media-cell__inner">
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
                onChange={() => onCheckboxToggle(item.id)}
                onClick={(e) => e.stopPropagation()}
                className="media-cell__checkbox"
              />
            </div>
          )}
          {needsIndexingBackupAttention && warningTitle && (
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
          {item.motionCompanionId ? (
            <MotionPairThumbnail item={item} />
          ) : isVideo(item.mimeType) ||
            isPixelMotionPhotoBasename(item.originalName) ? (
            <VideoThumbnail item={item} />
          ) : isImage(item.mimeType, item.originalName) ? (
            <FallbackImage
              src={mediaThumbnailUrl(item)}
              alt={item.originalName}
              fallbackIcon="📷"
              className="media-cell__img"
            />
          ) : (
            <span className="media-cell__icon">📄</span>
          )}
        </div>
      </button>
    </li>
  );
}
