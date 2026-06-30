import { useCallback, useEffect, useRef, useState } from "react";
import {
  isImage,
  isPdf,
  isPixelMotionPhotoBasename,
  isText,
  isVideo,
} from "./media-utils";
import { PixelMpOrImageVideoPreview } from "./pixel-mp-preview";
import { MediaViewerFaceOverlay } from "./media-viewer-face-overlay";
import { MediaViewerReassignModal } from "./media-viewer-reassign-modal";
import { MediaViewerDetails } from "./media-viewer-details";
import { MediaViewerActions } from "./media-viewer-actions";
import { MediaViewerVideoTaggingModal } from "./media-viewer-video-tagging-modal";
import { InlineAssignBar } from "./inline-assign-bar";
import { useMediaViewerFaces } from "./use-media-viewer-faces";
import { useMediaViewerImageClick } from "./use-media-viewer-image-click";
import { useMediaViewerKeyboard } from "./use-media-viewer-keyboard";
import { useViewerGestures } from "./use-viewer-gestures";
import { FullscreenImage } from "./fullscreen-image";
import type { MediaItem } from "./media-utils";
import { errorMessage, prependApiUrl } from "@/api";
import { postRotateMedia90 } from "@/features/media/api";
import { useIsMobile } from "@/hooks/use-is-mobile";

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
  const pixelMp = isPixelMotionPhotoBasename(item.originalName);
  const hasMotionPair =
    item.motionCompanionId != null && item.motionCompanionId !== "";
  const motionVideoUrl = hasMotionPair
    ? prependApiUrl(`/media/${item.motionCompanionId}/preview`)
    : "";
  const [pixelIsVideo, setPixelIsVideo] = useState(false);
  const [motionPairView, setMotionPairView] = useState<"video" | "still">(
    "video",
  );
  const [detailsRefreshKey, setDetailsRefreshKey] = useState(0);
  const [showDetectedFaces, setShowDetectedFaces] = useState(true);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [previewRev, setPreviewRev] = useState(0);
  const [rotating, setRotating] = useState(false);
  const [rotateError, setRotateError] = useState<string | null>(null);
  const [videoTaggingOpen, setVideoTaggingOpen] = useState(false);

  const isMobile = useIsMobile();

  const previewUrl =
    previewRev > 0
      ? prependApiUrl(`/media/${item.id}/preview?r=${previewRev}`)
      : prependApiUrl(`/media/${item.id}/preview`);

  useEffect(() => {
    setPixelIsVideo(false);
    setMotionPairView("video");
    setShowDetectedFaces(true);
    setDetailsOpen(false);
    setFullscreen(false);
    setPreviewRev(0);
    setRotateError(null);
    setVideoTaggingOpen(false);
  }, [item.id]);

  const handleTagChange = useCallback(
    () => setDetailsRefreshKey((k) => k + 1),
    [],
  );

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
    handleDismissAutoTagged,
  } = useMediaViewerFaces({
    mediaId: item.id,
    taggingMode,
    mimeType: item.mimeType,
    onUpdate,
    onTagChange: handleTagChange,
  });

  const handleVideoTaggingChanged = useCallback(() => {
    setDetailsRefreshKey((k) => k + 1);
    onUpdate?.();
  }, [onUpdate]);

  const handleRotate90 = useCallback(async () => {
    setRotateError(null);
    setRotating(true);
    try {
      await postRotateMedia90(item.id);
      setPreviewRev((n) => n + 1);
      setDetailsRefreshKey((k) => k + 1);
      onUpdate?.();
    } catch (err) {
      setRotateError(errorMessage(err, "Could not rotate image"));
    } finally {
      setRotating(false);
    }
  }, [item.id, onUpdate]);

  const handleImageClick = useMediaViewerImageClick(
    imgRef,
    faces,
    taggingMode,
    showDetectedFaces,
    setAssigningFace,
    setReassigningFace,
  );

  useMediaViewerKeyboard({
    fullscreen,
    assigningFace,
    reassigningFace,
    hasPrev: prevItem != null,
    hasNext: nextItem != null,
    goPrev,
    goNext,
    onClose,
    onClearFullscreen: () => setFullscreen(false),
    onClearAssigning: () => setAssigningFace(null),
    onClearReassigning: () => setReassigningFace(null),
  });

  const swipeRef = useRef<HTMLDivElement>(null);
  const gesturesEnabled =
    isMobile &&
    !taggingMode &&
    !fullscreen &&
    !assigningFace &&
    !reassigningFace &&
    !videoTaggingOpen;

  useViewerGestures(swipeRef, {
    enabled: gesturesEnabled,
    onPrev: prevItem && !fullscreen ? goPrev : null,
    onNext: nextItem && !fullscreen ? goNext : null,
  });

  const isItemImage =
    isImage(item.mimeType, item.originalName) &&
    !pixelIsVideo &&
    (!hasMotionPair || motionPairView === "still");

  const motionPairBlocksRotate =
    item.motionCompanionId != null && item.motionCompanionId !== "";

  const canRotateImage =
    isItemImage &&
    !motionPairBlocksRotate &&
    !taggingMode &&
    !assigningFace &&
    !reassigningFace;

  const showDetails = !isMobile || detailsOpen;

  const canTagFaces =
    isImage(item.mimeType, item.originalName) &&
    (!pixelMp || !pixelIsVideo) &&
    (!hasMotionPair || motionPairView === "still");

  return (
    <div onClick={(e) => e.stopPropagation()} className="viewer-content">
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
      <MediaViewerActions
        hasMotionPair={hasMotionPair}
        motionPairView={motionPairView}
        onShowStill={() => setMotionPairView("still")}
        onShowMotion={() => {
          setMotionPairView("video");
          setTaggingMode(() => false);
        }}
        canTagFaces={canTagFaces}
        taggingMode={taggingMode}
        onToggleTagging={() => setTaggingMode((p) => !p)}
        canRotateImage={canRotateImage}
        rotating={rotating}
        onRotate={() => void handleRotate90()}
        showDetectedFaces={showDetectedFaces}
        onToggleDetections={setShowDetectedFaces}
        isVideoType={isVideo(item.mimeType)}
        onOpenVideoTagging={() => setVideoTaggingOpen(true)}
        onClose={onClose}
        rotateError={rotateError}
        showDetailsToggle={isMobile}
        detailsOpen={detailsOpen}
        onToggleDetails={() => setDetailsOpen((o) => !o)}
      />
      {videoTaggingOpen && (
        <MediaViewerVideoTaggingModal
          mediaId={item.id}
          people={people}
          onClose={() => setVideoTaggingOpen(false)}
          onChanged={handleVideoTaggingChanged}
        />
      )}
      <div
        className={`viewer-content__body${detailsOpen && isMobile ? " viewer-content__body--details-open" : ""}`}
      >
        <div ref={swipeRef} className="viewer-content__media">
          <p className="viewer-content__filename">{item.originalName}</p>
          {hasMotionPair && motionPairView === "video" && (
            <video
              key={motionVideoUrl}
              controls
              autoPlay
              playsInline
              style={{ maxWidth: "100%", maxHeight: "85vh" }}
            >
              <source src={motionVideoUrl} />
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
                      onDismissAutoTagged={(pid) => {
                        void handleDismissAutoTagged(pid);
                      }}
                    />
                  </div>
                )}
              </div>
            )}
          {pixelMp &&
            !isVideo(item.mimeType) &&
            (!hasMotionPair || motionPairView === "still") && (
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
                      onDismissAutoTagged={(pid) => {
                        void handleDismissAutoTagged(pid);
                      }}
                    />
                  </div>
                )}
              </div>
            )}
          {taggingMode && facesLoading && (
            <p
              style={{
                color: "var(--color-text-muted)",
                marginTop: 8,
                fontSize: "0.875rem",
              }}
            >
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
          {isPdf(item.mimeType) && (
            <iframe
              src={prependApiUrl(`/media/${item.id}/preview`)}
              title={item.originalName}
              style={{
                width: "min(90vw, 900px)",
                height: "85vh",
                border: "1px solid var(--color-border)",
                borderRadius: 8,
                background: "var(--color-bg-elevated)",
              }}
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
            !isText(item.mimeType) &&
            !isPdf(item.mimeType) && (
              <p style={{ color: "var(--color-text-muted)" }}>
                Preview not available.{" "}
                <a
                  href={prependApiUrl(`/media/${item.id}`)}
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
            data-viewer-gesture-ignore
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
          <aside className="viewer-content__details" data-viewer-gesture-ignore>
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
