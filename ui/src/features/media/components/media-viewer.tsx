import { useCallback, useEffect, useMemo, useState } from "react";
import { isText } from "./media-viewer/media-utils";
import { MediaViewerContent } from "./media-viewer/media-viewer-content";
import type { MediaItem } from "./media-viewer/media-utils";
import { apiFetch } from "@/api/client";

interface MediaViewerProps {
  item: MediaItem | null;
  items: MediaItem[];
  onSelectItem: (item: MediaItem) => void;
  onClose: () => void;
  onUpdate?: () => void;
}

export function MediaViewer({ item, items, onSelectItem, onClose, onUpdate }: MediaViewerProps) {
  const [textContent, setTextContent] = useState<string | null>(null);
  const [textError, setTextError] = useState<string | null>(null);
  const [taggingMode, setTaggingMode] = useState(false);

  const itemId = item?.id ?? "";
  const index = useMemo(() => (itemId ? items.findIndex((x) => x.id === itemId) : -1), [items, itemId]);
  const prevItem = index > 0 ? items[index - 1] : null;
  const nextItem = index >= 0 && index < items.length - 1 ? items[index + 1] : null;

  const goPrev = useCallback(() => {
    if (!prevItem) return;
    onSelectItem(prevItem);
  }, [onSelectItem, prevItem]);

  const goNext = useCallback(() => {
    if (!nextItem) return;
    onSelectItem(nextItem);
  }, [onSelectItem, nextItem]);

  useEffect(() => {
    if (!item) return;
    if (isText(item.mimeType)) {
      apiFetch(`/media/${item.id}/content`)
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
        prevItem={prevItem}
        nextItem={nextItem}
        goPrev={goPrev}
        goNext={goNext}
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
