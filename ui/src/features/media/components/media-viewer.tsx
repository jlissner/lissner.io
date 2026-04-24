import { useCallback, useEffect, useMemo, useState } from "react";
import { isText } from "./media-viewer/media-utils";
import { MediaViewerContent } from "./media-viewer/media-viewer-content";
import type { MediaItem } from "./media-viewer/media-utils";
import { apiFetch } from "@/api";
import { ModalPanel, ModalRoot } from "@/components/ui/modal";

interface MediaViewerProps {
  item: MediaItem | null;
  items: MediaItem[];
  onSelectItem: (item: MediaItem) => void;
  onClose: () => void;
  onUpdate?: () => void;
}

export function MediaViewer({
  item,
  items,
  onSelectItem,
  onClose,
  onUpdate,
}: MediaViewerProps) {
  const [textContent, setTextContent] = useState<string | null>(null);
  const [textError, setTextError] = useState<string | null>(null);
  const [taggingMode, setTaggingMode] = useState(false);

  const itemId = item?.id ?? "";
  const index = useMemo(
    () => (itemId ? items.findIndex((x) => x.id === itemId) : -1),
    [items, itemId],
  );
  const prevItem = index > 0 ? items[index - 1] : null;
  const nextItem =
    index >= 0 && index < items.length - 1 ? items[index + 1] : null;

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
        .then((res) =>
          res.ok ? res.text() : Promise.reject(new Error("Failed to load")),
        )
        .then(setTextContent)
        .catch(() => setTextError("Could not load content"));
    } else {
      setTextContent(null);
      setTextError(null);
    }
  }, [item]);

  if (!item) return null;

  return (
    <ModalRoot onBackdropClick={onClose} className="viewer-overlay">
      <ModalPanel
        onEscape={onClose}
        aria-label={`Media viewer: ${item.originalName}`}
        className="viewer-overlay__panel"
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
      </ModalPanel>
    </ModalRoot>
  );
}
