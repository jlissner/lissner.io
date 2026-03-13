import { peopleStyles as s } from "./peopleStyles";

interface MediaPreview {
  id: string;
  mimeType: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

interface PeopleDetailProps {
  selectedId: number | null;
  selectedName: string;
  photoCount: number;
  previewMedia: MediaPreview[];
  previewLoading: boolean;
  onViewAllPhotos?: (personId: number) => void;
  onPhotoClick: (m: MediaPreview) => void;
}

export function PeopleDetail({
  selectedId,
  selectedName,
  photoCount,
  previewMedia,
  previewLoading,
  onViewAllPhotos,
  onPhotoClick,
}: PeopleDetailProps) {
  if (!selectedId) {
    return (
      <main style={s.detail}>
        <div style={s.detailEmpty}>Select a person to view their photos</div>
      </main>
    );
  }

  const images = previewMedia.filter((m) => m.mimeType.startsWith("image/"));

  return (
    <main style={s.detail}>
      <div style={s.detailHeader}>
        <div>
          <h2 style={s.detailTitle}>{selectedName}</h2>
          <p style={s.detailMeta}>
            {photoCount} {photoCount === 1 ? "photo" : "photos"}
          </p>
        </div>
        {onViewAllPhotos && (
          <button type="button" style={s.primaryButton} onClick={() => onViewAllPhotos(selectedId)}>
            View all in gallery
          </button>
        )}
      </div>
      {previewLoading ? (
        <p style={{ color: "#64748b", fontSize: "0.875rem" }}>Loading photos…</p>
      ) : (
        <div style={s.photoGrid}>
          {images.map((m) => {
            const hasBox = selectedId && m.x != null && m.width != null && m.width > 0;
            const thumbSrc = hasBox ? `/api/media/${m.id}/face/${selectedId}` : `/api/media/${m.id}/preview`;
            return (
              <button key={m.id} type="button" style={s.photoThumb} onClick={() => onPhotoClick(m)}>
                <img src={thumbSrc} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </button>
            );
          })}
          {images.length === 0 && (
            <p style={{ gridColumn: "1 / -1", color: "#64748b", fontSize: "0.875rem" }}>No photos</p>
          )}
        </div>
      )}
    </main>
  );
}
