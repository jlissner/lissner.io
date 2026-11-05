import { prependApiUrl } from "@/api";
import { useMemo, useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  isImage,
  isPixelMotionPhotoBasename,
  type MediaItem,
} from "@/features/media/components/media-viewer/media-utils";
import { PixelMpOrImageVideoPreview } from "@/features/media/components/media-viewer/pixel-mp-preview";
import type { MergeSuggestion } from "./people-types";
import type { PersonMediaItem } from "./use-people-preview";
import {
  PERSON_PREVIEW_PAGE_SIZE,
  hasMorePersonPhotos,
  remainingPersonPhotos,
} from "./person-preview-paging";

interface PeopleDetailProps {
  selectedId: number | null;
  selectedName: string;
  photoCount: number;
  previewMedia: PersonMediaItem[];
  previewLoading: boolean;
  previewLoadingMore: boolean;
  previewExhausted: boolean;
  mergeSuggestions: MergeSuggestion[];
  mergeSuggestionsLoading: boolean;
  onMergeIntoSuggestion: (mergeIntoPersonId: number) => void;
  onViewAllPhotos?: (personId: number) => void;
  onPhotoClick: (m: MediaItem) => void;
  onBulkRemoveTags: (mediaIds: string[]) => boolean | Promise<boolean>;
  onLoadMorePreview: () => void | Promise<void>;
  onBack?: () => void;
}

export function PeopleDetail({
  selectedId,
  selectedName,
  photoCount,
  previewMedia,
  previewLoading,
  previewLoadingMore,
  previewExhausted,
  mergeSuggestions,
  mergeSuggestionsLoading,
  onMergeIntoSuggestion,
  onViewAllPhotos,
  onPhotoClick,
  onBulkRemoveTags,
  onLoadMorePreview,
  onBack,
}: PeopleDetailProps) {
  const [visibleCount, setVisibleCount] = useState(PERSON_PREVIEW_PAGE_SIZE);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    setSelected(new Set());
    setVisibleCount(PERSON_PREVIEW_PAGE_SIZE);
  }, [selectedId]);

  const images = useMemo(
    () => previewMedia.filter((m) => isImage(m.mimeType, m.originalName)),
    [previewMedia],
  );

  const visibleImages = useMemo(
    () => images.slice(0, visibleCount),
    [images, visibleCount],
  );
  const totalForPaging = previewExhausted ? images.length : photoCount;
  const hasMore = hasMorePersonPhotos(totalForPaging, visibleCount);
  const remaining = remainingPersonPhotos(totalForPaging, visibleCount);
  const selectionMode = selected.size > 0;

  useEffect(() => {
    if (
      visibleCount <= images.length ||
      previewExhausted ||
      previewLoadingMore ||
      previewLoading
    ) {
      return;
    }
    void onLoadMorePreview();
  }, [
    visibleCount,
    images.length,
    previewExhausted,
    previewLoadingMore,
    previewLoading,
    onLoadMorePreview,
  ]);

  const handleLoadMore = useCallback(() => {
    setVisibleCount((n) => n + PERSON_PREVIEW_PAGE_SIZE);
  }, []);

  const toggleSelect = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelected(new Set());
  }, []);

  const visibleIds = useMemo(
    () => visibleImages.map((m) => m.id),
    [visibleImages],
  );
  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selected.has(id));

  const toggleSelectAllVisible = useCallback(() => {
    setSelected((prev) => {
      const allSelected =
        visibleIds.length > 0 && visibleIds.every((id) => prev.has(id));
      if (allSelected) return new Set();
      return new Set(visibleIds);
    });
  }, [visibleIds]);

  const handleRemoveTags = useCallback(() => {
    const ids = [...selected];
    void Promise.resolve(onBulkRemoveTags(ids)).then((removed) => {
      if (removed) clearSelection();
    });
  }, [selected, onBulkRemoveTags, clearSelection]);

  const handleThumbClick = useCallback(
    (m: PersonMediaItem) => {
      if (selectionMode) {
        toggleSelect(m.id);
        return;
      }
      onPhotoClick(m);
    },
    [selectionMode, toggleSelect, onPhotoClick],
  );

  if (!selectedId) {
    return (
      <main className="detail detail--empty">
        <div className="detail__empty-text">
          <p>Select a person to view their photos</p>
        </div>
      </main>
    );
  }

  const showMergeHints =
    selectedName.trim().startsWith("Person") &&
    (mergeSuggestionsLoading || mergeSuggestions.length > 0);

  return (
    <main className="detail">
      <div className="detail__header">
        <div className="detail__header-left">
          {onBack && (
            <button
              type="button"
              className="detail__back"
              onClick={onBack}
              aria-label="Back to list"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
          )}
          <div>
            <h2 className="detail__title">{selectedName}</h2>
            <p className="detail__meta">
              {photoCount} {photoCount === 1 ? "photo" : "photos"}
            </p>
          </div>
        </div>
        <div className="detail__header-actions">
          {!selectionMode && images.length > 0 && (
            <Button
              size="sm"
              variant="secondary"
              onClick={toggleSelectAllVisible}
            >
              Select
            </Button>
          )}
          {onViewAllPhotos && (
            <Button size="sm" onClick={() => onViewAllPhotos(selectedId)}>
              View in gallery
            </Button>
          )}
        </div>
      </div>
      {selectionMode && (
        <div className="bulk-actions bulk-actions--sticky detail__bulk">
          <span className="bulk-actions__count">{selected.size} selected</span>
          <div className="bulk-actions__buttons">
            <Button
              variant="secondary"
              size="sm"
              onClick={toggleSelectAllVisible}
            >
              {allVisibleSelected ? "Select none" : "Select all visible"}
            </Button>
            <Button variant="danger" size="sm" onClick={handleRemoveTags}>
              Remove tags
            </Button>
            <Button variant="ghost" size="sm" onClick={clearSelection}>
              Cancel
            </Button>
          </div>
        </div>
      )}
      {showMergeHints && (
        <section
          className="detail__merge-hints"
          aria-label="Possible duplicate people"
        >
          <h3 className="detail__merge-hints-title">Possible same person as</h3>
          {mergeSuggestionsLoading ? (
            <p className="u-text-muted u-text-sm">
              Comparing faces to named people…
            </p>
          ) : (
            <ul className="detail__merge-hints-list">
              {mergeSuggestions.map((s) => (
                <li key={s.personId} className="detail__merge-hints-item">
                  <span className="detail__merge-hints-label">
                    <strong>{s.name}</strong>
                    <span className="u-text-muted u-text-sm">
                      {" "}
                      ({Math.round(s.score * 100)}% match)
                    </span>
                  </span>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => onMergeIntoSuggestion(s.personId)}
                  >
                    Merge into {s.name}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
      {previewLoading ? (
        <p className="u-text-muted u-text-sm u-p-3">Loading photos…</p>
      ) : (
        <>
          <div className="detail__grid">
            {visibleImages.map((m) => {
              const pm = m as PersonMediaItem;
              const isSelected = selected.has(m.id);
              const hasBox =
                selectedId && pm.x != null && pm.width != null && pm.width > 0;
              const thumbSrc = hasBox
                ? prependApiUrl(
                    `/media/${m.id}/face/${selectedId}?v=${encodeURIComponent(String(m.size))}`,
                  )
                : prependApiUrl(
                    `/media/${m.id}/thumbnail?v=${encodeURIComponent(String(m.size))}`,
                  );
              const usePixelHybrid =
                !hasBox && isPixelMotionPhotoBasename(m.originalName ?? "");
              return (
                <div
                  key={m.id}
                  className={[
                    "detail__thumb-wrap",
                    selectionMode && "detail__thumb-wrap--selection-mode",
                    isSelected && "detail__thumb-wrap--selected",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <div className="detail__thumb-checkbox-wrap">
                    <input
                      type="checkbox"
                      className="detail__thumb-checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(m.id)}
                      onClick={(e) => e.stopPropagation()}
                      aria-label={`Select photo ${m.originalName ?? m.id}`}
                    />
                  </div>
                  <button
                    type="button"
                    className={`detail__thumb ${m.backedUp ? "detail__thumb--backed-up" : ""}`}
                    onClick={() => handleThumbClick(m)}
                    title={
                      m.backedUp ? "Backed up to cloud" : "Not backed up yet"
                    }
                  >
                    {usePixelHybrid ? (
                      <PixelMpOrImageVideoPreview
                        src={thumbSrc}
                        alt={m.originalName ?? `Photo of ${selectedName}`}
                      />
                    ) : (
                      <img
                        src={thumbSrc}
                        alt={m.originalName ?? `Photo of ${selectedName}`}
                        loading="lazy"
                      />
                    )}
                    {m.backedUp && (
                      <span className="detail__thumb-backup" aria-hidden>
                        ☁
                      </span>
                    )}
                  </button>
                </div>
              );
            })}
            {images.length === 0 && (
              <p
                className="u-text-muted u-text-sm"
                style={{ gridColumn: "1 / -1" }}
              >
                No photos
              </p>
            )}
          </div>
          {hasMore && (
            <div className="detail__load-more">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLoadMore}
                disabled={previewLoadingMore}
              >
                {previewLoadingMore
                  ? "Loading…"
                  : `Show more photos (${remaining} remaining)`}
              </Button>
            </div>
          )}
        </>
      )}
    </main>
  );
}
