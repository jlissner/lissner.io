import { useEffect, useState } from "react";
import { isText } from "./media/mediaUtils";
import { MediaViewerContent } from "./media/MediaViewerContent";
import type { MediaItem } from "./media/mediaUtils";

interface MediaViewerProps {
  item: MediaItem | null;
  onClose: () => void;
  onUpdate?: () => void;
}

export function MediaViewer({ item, onClose, onUpdate }: MediaViewerProps) {
  const [textContent, setTextContent] = useState<string | null>(null);
  const [textError, setTextError] = useState<string | null>(null);
  const [taggingMode, setTaggingMode] = useState(false);

  useEffect(() => {
    if (!item) return;
    if (isText(item.mimeType)) {
      fetch(`/api/media/${item.id}/content`)
        .then((res) => (res.ok ? res.text() : Promise.reject(new Error("Failed to load"))))
        .then(setTextContent)
        .catch(() => setTextError("Could not load content"));
    } else {
      setTextContent(null);
      setTextError(null);
    }
  }, [item]);

  if (!item) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.9)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <MediaViewerContent
        item={item}
        textContent={textContent}
        textError={textError}
        taggingMode={taggingMode}
        setTaggingMode={setTaggingMode}
        onClose={onClose}
        onUpdate={onUpdate}
      />
    </div>
  );
}
