import { Button } from "@/components/ui/button";
import { isImage, isPixelMotionPhotoBasename } from "@/features/media/components/media-viewer/media-utils";
import { PixelMpOrImageVideoPreview } from "@/features/media/components/media-viewer/pixel-mp-preview";
import type { MergeSuggestion } from "./people-types";

interface MediaPreview {
  id: string;
  originalName?: string;
  mimeType: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  backedUp?: boolean;
}

interface PeopleDetailProps {
  selectedId: number | null;
  selectedName: string;
  photoCount: number;
  previewMedia: MediaPreview[];
  previewLoading: boolean;
  mergeSuggestions: MergeSuggestion[];
  mergeSuggestionsLoading: boolean;
  onMergeIntoSuggestion: (mergeIntoPersonId: number) => void;
  onViewAllPhotos?: (personId: number) => void;
  onPhotoClick: (m: MediaPreview) => void;
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
}: PeopleDetailProps) {
  if (!selectedId) {
    return (
      <main className="detail detail--empty">
        <div>Select a person to view their photos</div>
      </main>
    );
  }

  const images = previewMedia.filter((m) => isImage(m.mimeType, m.originalName));
  const showMergeHints =
    selectedName.trim().startsWith("Person") &&
    (mergeSuggestionsLoading || mergeSuggestions.length > 0);

  return (
    <main className="detail">
      <div className="detail__header">
        <div>
          <h2 className="detail__title">{selectedName}</h2>
          <p className="detail__meta">
            {photoCount} {photoCount === 1 ? "photo" : "photos"}
          </p>
        </div>
        {onViewAllPhotos && (
          <Button onClick={() => onViewAllPhotos(selectedId)}>View all in gallery</Button>
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
        <p className="u-text-muted u-text-sm">Loading photos…</p>
      ) : (
        <div className="detail__grid">
          {images.map((m) => {
            const hasBox = selectedId && m.x != null && m.width != null && m.width > 0;
            const thumbSrc = hasBox
              ? `/api/media/${m.id}/face/${selectedId}`
              : `/api/media/${m.id}/preview`;
            const usePixelHybrid =
              !hasBox && isPixelMotionPhotoBasename(m.originalName ?? "");
            return (
              <button
                key={m.id}
                type="button"
                className={`detail__thumb ${m.backedUp ? "detail__thumb--backed-up" : ""}`}
                onClick={() => onPhotoClick(m)}
                title={m.backedUp ? "Backed up to cloud" : "Not backed up yet"}
              >
                {usePixelHybrid ? (
                  <PixelMpOrImageVideoPreview src={thumbSrc} alt="" />
                ) : (
                  <img src={thumbSrc} alt="" />
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
      )}
    </main>
  );
}
