import { useCallback, useEffect, useRef, useState } from "react";
import { isImage, isPixelMotionPhotoBasename, isText, isVideo } from "./media-utils";
import { PixelMpOrImageVideoPreview } from "./pixel-mp-preview";
import { MediaViewerFaceOverlay } from "./media-viewer-face-overlay";
import { MediaViewerReassignModal } from "./media-viewer-reassign-modal";
import { MediaViewerDetails } from "./media-viewer-details";
import { InlineAssignBar } from "./inline-assign-bar";
import { useMediaViewerFaces } from "./use-media-viewer-faces";
import { useMediaViewerImageClick } from "./use-media-viewer-image-click";
import { useSwipeNav } from "./use-swipe-nav";
import { useTapNav } from "./use-tap-nav";
import { FullscreenImage } from "./fullscreen-image";
import type { MediaItem } from "./media-utils";
import { Button } from "@/components/ui/button";

interface MediaViewerContentProps {
  item: MediaItem;
  prevItem: MediaItem | null;
  nextItem: MediaItem | null;
  goPrev: () => void;
  goNext: () => void;
  textContent: string | null;
  textError: string | null;
  taggingMode: boolean;
  setTaggingMode: (fn: (prev: boolean) => boolean) => void;
  onClose: () => void;
  onUpdate?: () => void;
}

function useIsMobile(): boolean {
  const [mobile, setMobile] = useState(() => window.innerWidth < 640);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const handler = (e: MediaQueryListEvent) => setMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return mobile;
}

export function MediaViewerContent({
  item,
  prevItem,
  nextItem,
  goPrev,
  goNext,
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
  const motionVideoUrl = hasMotionPair ? `/api/media/${item.motionCompanionId}/preview` : "";
  const [pixelIsVideo, setPixelIsVideo] = useState(false);
  const [motionPairView, setMotionPairView] = useState<"video" | "still">("video");
  const [detailsRefreshKey, setDetailsRefreshKey] = useState(0);
  const [showDetectedFaces, setShowDetectedFaces] = useState(true);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  const isMobile = useIsMobile();

  useEffect(() => {
    setPixelIsVideo(false);
    setMotionPairView("video");
    setShowDetectedFaces(true);
    setDetailsOpen(false);
    setFullscreen(false);
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
    showDetectedFaces,
    setAssigningFace,
    setReassigningFace
  );

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const active = document.activeElement as HTMLElement | null;
      const activeTag = active?.tagName?.toLowerCase();
      const typing =
        activeTag === "input" ||
        activeTag === "textarea" ||
        active?.getAttribute("contenteditable") === "true";
      if (e.key === "Escape") {
        if (fullscreen) setFullscreen(false);
        else if (assigningFace) setAssigningFace(null);
        else if (reassigningFace) setReassigningFace(null);
        else onClose();
      }
      if (typing) return;
      if (e.key === "ArrowLeft" && !assigningFace && !reassigningFace && !fullscreen) {
        if (prevItem) goPrev();
      }
      if (e.key === "ArrowRight" && !assigningFace && !reassigningFace && !fullscreen) {
        if (nextItem) goNext();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [
    onClose,
    fullscreen,
    assigningFace,
    reassigningFace,
    setAssigningFace,
    setReassigningFace,
    prevItem,
    nextItem,
    goPrev,
    goNext,
  ]);

  const swipeRef = useRef<HTMLDivElement>(null);
  useSwipeNav(
    swipeRef,
    nextItem && !fullscreen ? goNext : null,
    prevItem && !fullscreen ? goPrev : null
  );

  const isItemImage =
    isImage(item.mimeType, item.originalName) &&
    !pixelIsVideo &&
    (!hasMotionPair || motionPairView === "still");

  const tapNav = useTapNav(
    isMobile && prevItem && !taggingMode && !fullscreen ? goPrev : null,
    isMobile && nextItem && !taggingMode && !fullscreen ? goNext : null,
    isMobile && isItemImage && !taggingMode && !fullscreen ? () => setFullscreen(true) : null
  );

  const showDetails = !isMobile || detailsOpen;

  return (
    <div ref={swipeRef} onClick={(e) => e.stopPropagation()} className="viewer-content">
      {fullscreen && (
        <FullscreenImage
          src={previewUrl}
          alt={item.originalName}
          onClose={() => setFullscreen(false)}
        />
      )}
      {prevItem && (
        <button
          type="button"
          className="viewer-nav viewer-nav--prev"
          onClick={goPrev}
          aria-label="Previous"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
      )}
      {nextItem && (
        <button
          type="button"
          className="viewer-nav viewer-nav--next"
          onClick={goNext}
          aria-label="Next"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      )}
      <div className="viewer-content__actions">
        {hasMotionPair && motionPairView === "video" && (
          <Button onClick={() => setMotionPairView("still")} variant="secondary" size="sm">
            Still
          </Button>
        )}
        {hasMotionPair && motionPairView === "still" && (
          <Button
            onClick={() => {
              setMotionPairView("video");
              setTaggingMode(() => false);
            }}
            variant="secondary"
            size="sm"
          >
            Motion
          </Button>
        )}
        {isImage(item.mimeType, item.originalName) &&
          (!pixelMp || !pixelIsVideo) &&
          (!hasMotionPair || motionPairView === "still") && (
            <Button
              onClick={() => setTaggingMode((p) => !p)}
              variant={taggingMode ? "primary" : "secondary"}
              size="sm"
            >
              {taggingMode ? "Exit tagging" : "Tag faces"}
            </Button>
          )}
        {taggingMode &&
          isImage(item.mimeType, item.originalName) &&
          (!pixelMp || !pixelIsVideo) &&
          (!hasMotionPair || motionPairView === "still") && (
            <label className="viewer-content__toggle">
              <input
                type="checkbox"
                checked={showDetectedFaces}
                onChange={(e) => setShowDetectedFaces(e.target.checked)}
              />
              <span>Detections</span>
            </label>
          )}
        <Button onClick={onClose} variant="secondary" size="sm">
          Close
        </Button>
      </div>
      <div className="viewer-content__body" {...(isMobile && !taggingMode ? tapNav : {})}>
        <div className="viewer-content__media">
          <p className="viewer-content__filename">{item.originalName}</p>
          {hasMotionPair && motionPairView === "video" && (
            <video
              key={motionVideoUrl}
              controls
              autoPlay
              playsInline
              style={{ maxWidth: "100%", maxHeight: "85vh" }}
            >
              <source src={motionVideoUrl} type={item.mimeType} />
            </video>
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
                      onAssigningFaceChange={setAssigningFace}
                      showDetected={showDetectedFaces}
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
                    onAssigningFaceChange={setAssigningFace}
                    showDetected={showDetectedFaces}
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
            <InlineAssignBar
              box={assigningFace}
              imgRef={imgRef}
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
              key={previewUrl}
              controls
              autoPlay
              playsInline
              style={{ maxWidth: "100%", maxHeight: "85vh" }}
            >
              <source src={previewUrl} type={item.mimeType} />
            </video>
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
        {isMobile && (
          <button
            type="button"
            className="viewer-content__details-toggle"
            onClick={() => setDetailsOpen((o) => !o)}
          >
            {detailsOpen ? "Hide details" : "Show details"}
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`viewer-content__details-chevron ${detailsOpen ? "viewer-content__details-chevron--open" : ""}`}
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
        )}
        {showDetails && (
          <aside className="viewer-content__details">
            <MediaViewerDetails
              item={item}
              refreshTrigger={detailsRefreshKey}
              onMetadataUpdated={onUpdate}
            />
          </aside>
        )}
      </div>
    </div>
  );
}
