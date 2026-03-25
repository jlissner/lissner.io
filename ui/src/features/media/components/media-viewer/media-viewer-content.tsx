import { useCallback, useEffect, useRef, useState } from "react";
import { isImage, isPixelMotionPhotoBasename, isText, isVideo } from "./media-utils";
import { PixelMpOrImageVideoPreview } from "./pixel-mp-preview";
import { MediaViewerFaceOverlay } from "./media-viewer-face-overlay";
import { MediaViewerAssignModal } from "./media-viewer-assign-modal";
import { MediaViewerReassignModal } from "./media-viewer-reassign-modal";
import { MediaViewerDetails } from "./media-viewer-details";
import { useMediaViewerFaces } from "./use-media-viewer-faces";
import { useMediaViewerImageClick } from "./use-media-viewer-image-click";
import type { MediaItem } from "./media-utils";

interface MediaViewerContentProps {
  item: MediaItem;
  textContent: string | null;
  textError: string | null;
  taggingMode: boolean;
  setTaggingMode: (fn: (prev: boolean) => boolean) => void;
  onClose: () => void;
  onUpdate?: () => void;
}

export function MediaViewerContent({
  item,
  textContent,
  textError,
  taggingMode,
  setTaggingMode,
  onClose,
  onUpdate,
}: MediaViewerContentProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const previewUrl = `/api/media/${item.id}/preview`;
  const pixelMp = isPixelMotionPhotoBasename(item.originalName);
  const hasMotionPair = item.motionCompanionId != null && item.motionCompanionId !== "";
  const motionVideoUrl = hasMotionPair
    ? `/api/media/${item.motionCompanionId}/preview`
    : "";
  const [pixelIsVideo, setPixelIsVideo] = useState(false);
  /** Paired `*.mp.jpg` + `*.mp`: default to motion video; user can switch to still only. */
  const [motionPairView, setMotionPairView] = useState<"video" | "still">("video");
  const [detailsRefreshKey, setDetailsRefreshKey] = useState(0);

  useEffect(() => {
    setPixelIsVideo(false);
    setMotionPairView("video");
  }, [item.id]);
  const handleTagChange = useCallback(() => setDetailsRefreshKey((k) => k + 1), []);
  const {
    faces,
    facesLoading,
    assigningFace,
    setAssigningFace,
    reassigningFace,
    setReassigningFace,
    people,
    handleAssignFace,
    handleReassignFace,
  } = useMediaViewerFaces({
    mediaId: item.id,
    taggingMode,
    onUpdate,
    onTagChange: handleTagChange,
  });
  const handleImageClick = useMediaViewerImageClick(
    imgRef,
    faces,
    taggingMode,
    setAssigningFace,
    setReassigningFace
  );

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (assigningFace) setAssigningFace(null);
        else if (reassigningFace) setReassigningFace(null);
        else onClose();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose, assigningFace, reassigningFace, setAssigningFace, setReassigningFace]);

  const btnStyle = {
    background: "rgba(255, 255, 255, 0.12)",
    border: "none",
    borderRadius: 8,
    color: "var(--color-text-inverse)",
    padding: "8px 16px",
    cursor: "pointer",
    fontSize: "0.875rem",
  } as const;

  return (
    <div onClick={(e) => e.stopPropagation()} className="viewer-content">
      <div className="viewer-content__actions">
        {hasMotionPair && motionPairView === "video" && (
          <button onClick={() => setMotionPairView("still")} style={btnStyle} type="button">
            View still image
          </button>
        )}
        {hasMotionPair && motionPairView === "still" && (
          <button
            onClick={() => {
              setMotionPairView("video");
              setTaggingMode(() => false);
            }}
            style={btnStyle}
            type="button"
          >
            View motion
          </button>
        )}
        {isImage(item.mimeType, item.originalName) &&
          (!pixelMp || !pixelIsVideo) &&
          (!hasMotionPair || motionPairView === "still") && (
          <button
            onClick={() => setTaggingMode((p) => !p)}
            style={{
              ...btnStyle,
              background: taggingMode ? "var(--color-primary)" : btnStyle.background,
            }}
          >
            {taggingMode ? "Exit tagging" : "Tagging mode"}
          </button>
        )}
        <button onClick={onClose} style={btnStyle}>
          Close
        </button>
      </div>
      <div className="viewer-content__body">
        <div className="viewer-content__media">
          <p className="viewer-content__filename">{item.originalName}</p>
          {hasMotionPair && motionPairView === "video" && (
            <video
              src={motionVideoUrl}
              controls
              autoPlay
              playsInline
              style={{ maxWidth: "100%", maxHeight: "85vh" }}
            />
          )}
          {isImage(item.mimeType, item.originalName) &&
            !pixelMp &&
            (!hasMotionPair || motionPairView === "still") && (
            <div style={{ position: "relative", display: "inline-block" }}>
              <img
                ref={imgRef}
                src={previewUrl}
                alt={item.originalName}
                onClick={handleImageClick}
                style={{
                  maxWidth: "100%",
                  maxHeight: "85vh",
                  objectFit: "contain",
                  cursor: taggingMode ? "crosshair" : "default",
                }}
              />
              {taggingMode && (
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    pointerEvents: "none",
                  }}
                >
                  <MediaViewerFaceOverlay
                    imgRef={imgRef}
                    faces={faces}
                    assigningFace={assigningFace}
                  />
                </div>
              )}
            </div>
          )}
          {pixelMp && !isVideo(item.mimeType) && (!hasMotionPair || motionPairView === "still") && (
            <div style={{ position: "relative", display: "inline-block" }}>
              <PixelMpOrImageVideoPreview
                src={previewUrl}
                alt={item.originalName}
                imgRef={imgRef}
                onImgClick={handleImageClick}
                onSwitchToVideo={() => {
                  setPixelIsVideo(true);
                  setTaggingMode(() => false);
                }}
                imgStyle={{
                  maxWidth: "100%",
                  maxHeight: "85vh",
                  objectFit: "contain",
                  cursor: taggingMode ? "crosshair" : "default",
                }}
                videoStyle={{ maxWidth: "100%", maxHeight: "85vh" }}
              />
              {taggingMode && !pixelIsVideo && (
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    pointerEvents: "none",
                  }}
                >
                  <MediaViewerFaceOverlay
                    imgRef={imgRef}
                    faces={faces}
                    assigningFace={assigningFace}
                  />
                </div>
              )}
            </div>
          )}
          {taggingMode && facesLoading && (
            <p style={{ color: "var(--color-text-muted)", marginTop: 8, fontSize: "0.875rem" }}>
              Detecting faces…
            </p>
          )}
          {assigningFace && (
            <MediaViewerAssignModal
              people={people}
              onAssign={handleAssignFace}
              onCancel={() => setAssigningFace(null)}
            />
          )}
          {reassigningFace && (
            <MediaViewerReassignModal
              reassigningFace={reassigningFace}
              people={people}
              onReassign={handleReassignFace}
              onCancel={() => setReassigningFace(null)}
            />
          )}
          {isVideo(item.mimeType) && (
            <video
              src={previewUrl}
              controls
              autoPlay
              style={{ maxWidth: "100%", maxHeight: "85vh" }}
            />
          )}
          {isText(item.mimeType) && (
            <pre
              style={{
                backgroundColor: "var(--color-bg-elevated)",
                color: "var(--color-text)",
                border: "1px solid var(--color-border)",
                padding: 24,
                borderRadius: 8,
                maxWidth: "90vw",
                maxHeight: "80vh",
                overflow: "auto",
                textAlign: "left",
                fontSize: "0.875rem",
                lineHeight: 1.5,
              }}
            >
              {textError ?? textContent ?? "Loading…"}
            </pre>
          )}
          {!isImage(item.mimeType, item.originalName) &&
            !isVideo(item.mimeType) &&
            !pixelMp &&
            !isText(item.mimeType) && (
            <p style={{ color: "var(--color-text-muted)" }}>
              Preview not available.{" "}
              <a
                href={`/api/media/${item.id}`}
                download={item.originalName}
                style={{ color: "var(--color-primary)" }}
              >
                Download
              </a>
            </p>
          )}
        </div>
        <aside className="viewer-content__details">
          <MediaViewerDetails item={item} refreshTrigger={detailsRefreshKey} />
        </aside>
      </div>
    </div>
  );
}
