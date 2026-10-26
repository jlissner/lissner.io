import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  onDelete?: (id: string) => Promise<void>;
  hasMoreItems?: boolean;
  onLoadMore?: () => Promise<void>;
}

export function MediaViewer({
  item,
  items,
  onSelectItem,
  onClose,
  onUpdate,
  onDelete,
  hasMoreItems = false,
  onLoadMore,
}: MediaViewerProps) {
  const [textContent, setTextContent] = useState<string | null>(null);
  const [textError, setTextError] = useState<string | null>(null);
  const [taggingMode, setTaggingMode] = useState(false);
  const pendingNextRef = useRef(false);
  const loadingMoreRef = useRef(false);

  const itemId = item?.id ?? "";
  const index = useMemo(
    () => (itemId ? items.findIndex((x) => x.id === itemId) : -1),
    [items, itemId],
  );
  const prevItem = index > 0 ? items[index - 1] : null;
  const nextItem =
    index >= 0 && index < items.length - 1 ? items[index + 1] : null;
  const hasNext = nextItem != null || hasMoreItems;

  const loadMoreIfNeeded = useCallback(async () => {
    if (!hasMoreItems || !onLoadMore || loadingMoreRef.current) return;
    loadingMoreRef.current = true;
    try {
      await onLoadMore();
    } finally {
      loadingMoreRef.current = false;
    }
  }, [hasMoreItems, onLoadMore]);

  const goPrev = useCallback(() => {
    if (!prevItem) return;
    onSelectItem(prevItem);
  }, [onSelectItem, prevItem]);

  const goNext = useCallback(() => {
    if (nextItem) {
      onSelectItem(nextItem);
      return;
    }
    if (!hasMoreItems || !onLoadMore) return;
    pendingNextRef.current = true;
    void loadMoreIfNeeded();
  }, [nextItem, hasMoreItems, onLoadMore, onSelectItem, loadMoreIfNeeded]);

  useEffect(() => {
    if (index < 0 || index !== items.length - 1 || !hasMoreItems) return;
    void loadMoreIfNeeded();
  }, [index, items.length, hasMoreItems, loadMoreIfNeeded]);

  useEffect(() => {
    if (!pendingNextRef.current || index < 0) return;
    if (!hasMoreItems) {
      pendingNextRef.current = false;
      return;
    }
    if (index < items.length - 1) {
      pendingNextRef.current = false;
      onSelectItem(items[index + 1]!);
    }
  }, [items, index, onSelectItem, hasMoreItems]);

  useEffect(() => {
    if (!item) return;
    if (isText(item.mimeType, item.originalName)) {
      apiFetch(`/media/${item.id}/content`)
        .then((res) =>
          res.ok ? res.text() : Promise.reject(new Error("Failed to load")),
        )
        .then(setTextContent)
        .catch((err) => {
          console.error(
            { err, mediaId: item.id },
            "Media viewer text content load failed",
          );
          setTextError("Could not load content");
        });
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
          hasNext={hasNext}
          goPrev={goPrev}
          goNext={goNext}
          textContent={textContent}
          textError={textError}
          taggingMode={taggingMode}
          setTaggingMode={setTaggingMode}
          onClose={onClose}
          onUpdate={onUpdate}
          onDelete={onDelete}
        />
      </ModalPanel>
    </ModalRoot>
  );
}
