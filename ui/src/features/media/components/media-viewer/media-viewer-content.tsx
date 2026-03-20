import { useCallback, useEffect, useRef, useState } from "react";
import { isImage, isText, isVideo } from "./media-utils";
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
  const [detailsRefreshKey, setDetailsRefreshKey] = useState(0);
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
    background: "rgba(255,255,255,0.2)",
    border: "none",
    borderRadius: 8,
    color: "#fff",
    padding: "8px 16px",
    cursor: "pointer",
    fontSize: "0.875rem",
  } as const;

  return (
    <div onClick={(e) => e.stopPropagation()} className="viewer-content">
      <div className="viewer-content__actions">
        {isImage(item.mimeType) && (
          <button
            onClick={() => setTaggingMode((p) => !p)}
            style={{ ...btnStyle, background: taggingMode ? "#4f46e5" : "rgba(255,255,255,0.2)" }}
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
          {isImage(item.mimeType) && (
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
          {taggingMode && facesLoading && (
            <p style={{ color: "#94a3b8", marginTop: 8, fontSize: "0.875rem" }}>Detecting faces…</p>
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
                backgroundColor: "#1e293b",
                color: "#e2e8f0",
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
          {!isImage(item.mimeType) && !isVideo(item.mimeType) && !isText(item.mimeType) && (
            <p style={{ color: "#94a3b8" }}>
              Preview not available.{" "}
              <a
                href={`/api/media/${item.id}`}
                download={item.originalName}
                style={{ color: "#60a5fa" }}
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
