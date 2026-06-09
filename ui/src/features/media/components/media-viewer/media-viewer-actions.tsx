import { Button } from "@/components/ui/button";

interface MediaViewerActionsProps {
  hasMotionPair: boolean;
  motionPairView: "video" | "still";
  onShowStill: () => void;
  onShowMotion: () => void;
  canTagFaces: boolean;
  taggingMode: boolean;
  onToggleTagging: () => void;
  canRotateImage: boolean;
  rotating: boolean;
  onRotate: () => void;
  showDetectedFaces: boolean;
  onToggleDetections: (checked: boolean) => void;
  isVideoType: boolean;
  onOpenVideoTagging: () => void;
  onClose: () => void;
  rotateError: string | null;
}

export function MediaViewerActions({
  hasMotionPair,
  motionPairView,
  onShowStill,
  onShowMotion,
  canTagFaces,
  taggingMode,
  onToggleTagging,
  canRotateImage,
  rotating,
  onRotate,
  showDetectedFaces,
  onToggleDetections,
  isVideoType,
  onOpenVideoTagging,
  onClose,
  rotateError,
}: MediaViewerActionsProps) {
  return (
    <div className="viewer-content__actions">
      {hasMotionPair && motionPairView === "video" && (
        <Button onClick={onShowStill} variant="secondary" size="sm">
          Still
        </Button>
      )}
      {hasMotionPair && motionPairView === "still" && (
        <Button onClick={onShowMotion} variant="secondary" size="sm">
          Motion
        </Button>
      )}
      {canTagFaces && (
        <Button
          onClick={onToggleTagging}
          variant={taggingMode ? "primary" : "secondary"}
          size="sm"
        >
          {taggingMode ? "Exit tagging" : "Tag faces"}
        </Button>
      )}
      {canRotateImage && (
        <Button
          type="button"
          onClick={onRotate}
          variant="secondary"
          size="sm"
          disabled={rotating}
        >
          {rotating ? "Rotating…" : "Rotate 90°"}
        </Button>
      )}
      {taggingMode && canTagFaces && (
        <label className="viewer-content__toggle">
          <input
            type="checkbox"
            checked={showDetectedFaces}
            onChange={(e) => onToggleDetections(e.target.checked)}
          />
          <span>Detections</span>
        </label>
      )}
      {isVideoType && (
        <Button onClick={onOpenVideoTagging} variant="secondary" size="sm">
          Tag people
        </Button>
      )}
      <Button onClick={onClose} variant="secondary" size="sm">
        Close
      </Button>
      {rotateError != null && (
        <p role="alert" className="viewer-content__rotate-error u-text-danger">
          {rotateError}
        </p>
      )}
    </div>
  );
}
