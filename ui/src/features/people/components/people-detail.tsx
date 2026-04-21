import { useMemo, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  isImage,
  isPixelMotionPhotoBasename,
  type MediaItem,
} from "@/features/media/components/media-viewer/media-utils";
import { PixelMpOrImageVideoPreview } from "@/features/media/components/media-viewer/pixel-mp-preview";
import type { MergeSuggestion } from "./people-types";
import type { PersonMediaItem } from "./use-people-preview";

const INITIAL_GRID_SIZE = 50;
const GRID_PAGE_SIZE = 50;

interface PeopleDetailProps {
  selectedId: number | null;
  selectedName: string;
  photoCount: number;
  previewMedia: PersonMediaItem[];
  previewLoading: boolean;
  mergeSuggestions: MergeSuggestion[];
  mergeSuggestionsLoading: boolean;
  onMergeIntoSuggestion: (mergeIntoPersonId: number) => void;
  onViewAllPhotos?: (personId: number) => void;
  onPhotoClick: (m: MediaItem) => void;
  onBack?: () => void;
}

export function PeopleDetail({
  selectedId,
  selectedName,
  photoCount,
  previewMedia,
  previewLoading,
  mergeSuggestions,
  mergeSuggestionsLoading,
  onMergeIntoSuggestion,
  onViewAllPhotos,
  onPhotoClick,
  onBack,
}: PeopleDetailProps) {
  const [visibleCount, setVisibleCount] = useState(INITIAL_GRID_SIZE);

  const images = useMemo(
    () => previewMedia.filter((m) => isImage(m.mimeType, m.originalName)),
    [previewMedia]
  );

  const visibleImages = useMemo(() => images.slice(0, visibleCount), [images, visibleCount]);
  const hasMore = images.length > visibleCount;

  const handleLoadMore = useCallback(() => {
    setVisibleCount((n) => n + GRID_PAGE_SIZE);
  }, []);

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
        {onViewAllPhotos && (
          <Button size="sm" onClick={() => onViewAllPhotos(selectedId)}>
            View in gallery
          </Button>
        )}
      </div>
      {showMergeHints && (
        <section className="detail__merge-hints" aria-label="Possible duplicate people">
          <h3 className="detail__merge-hints-title">Possible same person as</h3>
          {mergeSuggestionsLoading ? (
            <p className="u-text-muted u-text-sm">Comparing faces to named people…</p>
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
              const hasBox = selectedId && pm.x != null && pm.width != null && pm.width > 0;
              const thumbSrc = hasBox
                ? `/api/media/${m.id}/face/${selectedId}`
                : `/api/media/${m.id}/thumbnail`;
              const usePixelHybrid = !hasBox && isPixelMotionPhotoBasename(m.originalName ?? "");
              return (
                <button
                  key={m.id}
                  type="button"
                  className={`detail__thumb ${m.backedUp ? "detail__thumb--backed-up" : ""}`}
                  onClick={() => onPhotoClick(m)}
                  title={m.backedUp ? "Backed up to cloud" : "Not backed up yet"}
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
              );
            })}
            {images.length === 0 && (
              <p className="u-text-muted u-text-sm" style={{ gridColumn: "1 / -1" }}>
                No photos
              </p>
            )}
          </div>
          {hasMore && (
            <div className="detail__load-more">
              <Button variant="ghost" size="sm" onClick={handleLoadMore}>
                Show more photos ({images.length - visibleCount} remaining)
              </Button>
            </div>
          )}
        </>
      )}
    </main>
  );
}
