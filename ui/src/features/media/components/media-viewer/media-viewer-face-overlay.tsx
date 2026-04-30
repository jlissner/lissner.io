import { Button } from "@/components/ui/button";
import type { FaceBox, TaggedFace } from "./media-viewer-types";
import { isLowConfidenceAutoTag } from "./face-confidence";
import { ResizableFaceBox } from "./resizable-face-box";

interface MediaViewerFaceOverlayProps {
  imgRef: React.RefObject<HTMLImageElement | null>;
  faces: { detected: FaceBox[]; tagged: TaggedFace[] } | null;
  assigningFace?: FaceBox | null;
  onAssigningFaceChange?: (box: FaceBox) => void;
  /** When false, dashed detection boxes are hidden (manual tagging only). */
  showDetected?: boolean;
  onDismissAutoTagged?: (personId: number) => void;
}

export function MediaViewerFaceOverlay({
  imgRef,
  faces,
  assigningFace,
  onAssigningFaceChange,
  showDetected = true,
  onDismissAutoTagged,
}: MediaViewerFaceOverlayProps) {
  const img = imgRef.current;
  if (!img) return null;

  const rect = img.getBoundingClientRect();
  const naturalWidth = img.naturalWidth || 1;
  const naturalHeight = img.naturalHeight || 1;
  const scaleX = rect.width / naturalWidth;
  const scaleY = rect.height / naturalHeight;

  return (
    <>
      {assigningFace && onAssigningFaceChange && (
        <ResizableFaceBox
          box={assigningFace}
          imgRef={imgRef}
          onBoxChange={onAssigningFaceChange}
        >
          <div
            style={{
              position: "absolute",
              left: assigningFace.x * scaleX,
              top: assigningFace.y * scaleY,
              width: assigningFace.width * scaleX,
              height: assigningFace.height * scaleY,
              border: "2px solid #f59e0b",
              borderRadius: 4,
              backgroundColor: "rgba(245, 158, 11, 0.2)",
              pointerEvents: "none",
            }}
          />
        </ResizableFaceBox>
      )}
      {(faces?.tagged ?? []).map((t, i) => {
        const isManual = t.source === "manual";
        const isAuto = !isManual;
        const low = isLowConfidenceAutoTag(t.source, t.confidence);
        const borderColor = isManual ? "#22c55e" : low ? "#f59e0b" : "#22c55e";
        const bg = isManual
          ? "rgba(34, 197, 94, 0.25)"
          : low
            ? "rgba(245, 158, 11, 0.22)"
            : "rgba(34, 197, 94, 0.25)";
        return (
          <div
            key={`t-${i}-${t.personId}`}
            style={{
              position: "absolute",
              left: t.x * scaleX,
              top: t.y * scaleY,
              width: t.width * scaleX,
              minHeight: t.height * scaleY,
              border: `2px solid ${borderColor}`,
              borderRadius: 4,
              color: borderColor,
              fontSize: "clamp(11px, 2.2vw, 15px)",
              fontWeight: 700,
              backgroundColor: bg,
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-start",
              gap: 4,
              padding: 4,
              pointerEvents: "auto",
              boxSizing: "border-box",
            }}
          >
            <span
              style={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                textShadow: "0 0 2px #000, 0 1px 3px rgba(0,0,0,0.8)",
              }}
            >
              {t.name}
              {isAuto && low ? " · low confidence" : ""}
            </span>
            {isAuto && onDismissAutoTagged && (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="u-self-start"
                style={{ fontSize: "0.75rem", padding: "2px 8px" }}
                aria-label={`Dismiss auto tag for ${t.name}`}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  onDismissAutoTagged(t.personId);
                }}
              >
                Dismiss
              </Button>
            )}
          </div>
        );
      })}
      {showDetected &&
        (faces?.detected ?? []).map((d, i) => (
          <div
            key={`d-${i}`}
            style={{
              position: "absolute",
              left: d.x * scaleX,
              top: d.y * scaleY,
              width: d.width * scaleX,
              height: d.height * scaleY,
              border: "2px dashed rgba(255,255,255,0.6)",
              borderRadius: 4,
              pointerEvents: "none",
            }}
          />
        ))}
    </>
  );
}
