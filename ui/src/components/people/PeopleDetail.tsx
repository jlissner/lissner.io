interface MediaPreview {
  id: string;
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
      <main className="detail detail--empty">
        <div>Select a person to view their photos</div>
      </main>
    );
  }

  const images = previewMedia.filter((m) => m.mimeType.startsWith("image/"));

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
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => onViewAllPhotos(selectedId)}
          >
            View all in gallery
          </button>
        )}
      </div>
      {previewLoading ? (
        <p className="u-text-muted u-text-sm">Loading photos…</p>
      ) : (
        <div className="detail__grid">
          {images.map((m) => {
            const hasBox = selectedId && m.x != null && m.width != null && m.width > 0;
            const thumbSrc = hasBox
              ? `/api/media/${m.id}/face/${selectedId}`
              : `/api/media/${m.id}/preview`;
            return (
              <button
                key={m.id}
                type="button"
                className={`detail__thumb ${m.backedUp ? "detail__thumb--backed-up" : ""}`}
                onClick={() => onPhotoClick(m)}
                title={m.backedUp ? "Backed up to cloud" : "Not backed up yet"}
              >
                <img src={thumbSrc} alt="" />
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
