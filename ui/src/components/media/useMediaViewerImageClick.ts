import { useCallback } from "react";
import type { FaceBox, TaggedFace } from "./mediaViewerTypes";

function overlaps(a: FaceBox, b: FaceBox): boolean {
  const interLeft = Math.max(a.x, b.x);
  const interTop = Math.max(a.y, b.y);
  const interRight = Math.min(a.x + a.width, b.x + b.width);
  const interBottom = Math.min(a.y + a.height, b.y + b.height);
  if (interRight <= interLeft || interBottom <= interTop) return false;
  const interArea = (interRight - interLeft) * (interBottom - interTop);
  const aArea = a.width * a.height;
  return interArea / aArea > 0.3;
}

export function useMediaViewerImageClick(
  imgRef: React.RefObject<HTMLImageElement | null>,
  faces: { detected: FaceBox[]; tagged: TaggedFace[] } | null,
  taggingMode: boolean,
  setAssigningFace: (f: FaceBox | null) => void,
  setReassigningFace: (f: TaggedFace | null) => void
) {
  const getImageCoords = useCallback((e: React.MouseEvent) => {
    const img = imgRef.current;
    if (!img) return null;
    const rect = img.getBoundingClientRect();
    const scaleX = img.naturalWidth / rect.width;
    const scaleY = img.naturalHeight / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    return { x, y };
  }, [imgRef]);

  return useCallback(
    (e: React.MouseEvent) => {
      if (!taggingMode || !faces) return;
      const coords = getImageCoords(e);
      if (!coords) return;
      const tagged = faces.tagged.find(
        (t) =>
          coords.x >= t.x &&
          coords.x <= t.x + t.width &&
          coords.y >= t.y &&
          coords.y <= t.y + t.height
      );
      if (tagged) {
        setReassigningFace(tagged);
        return;
      }
      const face = faces.detected.find((box) => {
        const alreadyTagged = faces.tagged.some((t) => overlaps(box, t));
        return (
          !alreadyTagged &&
          coords.x >= box.x &&
          coords.x <= box.x + box.width &&
          coords.y >= box.y &&
          coords.y <= box.y + box.height
        );
      });
      if (face) setAssigningFace(face);
    },
    [taggingMode, faces, getImageCoords, setAssigningFace, setReassigningFace]
  );
}
