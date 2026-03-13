import type { FaceBox, TaggedFace } from "./mediaViewerTypes";

interface MediaViewerFaceOverlayProps {
  imgRef: React.RefObject<HTMLImageElement | null>;
  faces: { detected: FaceBox[]; tagged: TaggedFace[] };
}

export function MediaViewerFaceOverlay({ imgRef, faces }: MediaViewerFaceOverlayProps) {
  const img = imgRef.current;
  if (!img) return null;

  const rect = img.getBoundingClientRect();
  const scaleX = rect.width / img.naturalWidth;
  const scaleY = rect.height / img.naturalHeight;

  return (
    <>
      {faces.tagged.map((t, i) => (
        <div
          key={`t-${i}`}
          style={{
            position: "absolute",
            left: t.x * scaleX,
            top: t.y * scaleY,
            width: t.width * scaleX,
            height: t.height * scaleY,
            border: "2px solid #22c55e",
            borderRadius: 4,
            color: "#22c55e",
            fontSize: "clamp(12px, 2.5vw, 18px)",
            fontWeight: 700,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            backgroundColor: "rgba(34, 197, 94, 0.25)",
            display: "flex",
            alignItems: "center",
            padding: "0 4px",
            textShadow: "0 0 2px #000, 0 1px 3px rgba(0,0,0,0.8)",
          }}
        >
          {t.name}
        </div>
      ))}
      {faces.detected.map((d, i) => (
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
          }}
        />
      ))}
    </>
  );
}
