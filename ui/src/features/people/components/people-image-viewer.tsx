import { Button } from "@/components/ui/button";
import { isPixelMotionPhotoBasename } from "@/features/media/components/media-viewer/media-utils";
import { PixelMpOrImageVideoPreview } from "@/features/media/components/media-viewer/pixel-mp-preview";

interface MediaPreview {
  id: string;
  mimeType: string;
  originalName?: string;
}

interface PeopleImageViewerProps {
  media: MediaPreview;
  people: Array<{ id: number; name: string }>;
  selectedId: number;
  onClose: () => void;
  onReassign: (mediaId: string, assignTo: number | "new") => void;
  onRemove: (mediaId: string) => void;
}

export function PeopleImageViewer({
  media,
  people,
  selectedId,
  onClose,
  onReassign,
  onRemove,
}: PeopleImageViewerProps) {
  return (
    <div className="viewer-overlay" onClick={onClose}>
      <div className="viewer-overlay__content">
        {isPixelMotionPhotoBasename(media.originalName ?? "") ? (
          <PixelMpOrImageVideoPreview
            src={`/api/media/${media.id}/preview`}
            alt=""
            className="viewer-overlay__img"
            videoStyle={{ maxWidth: "100%", maxHeight: "85vh" }}
            onImgClick={(e) => e.stopPropagation()}
          />
        ) : (
          <img
            src={`/api/media/${media.id}/preview`}
            alt=""
            className="viewer-overlay__img"
            onClick={(e) => e.stopPropagation()}
          />
        )}
      </div>
      <div className="viewer-overlay__actions" onClick={(e) => e.stopPropagation()}>
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
        <div className="u-flex u-items-center u-gap-2">
          <label className="u-text-sm u-text-subtle">Reassign to:</label>
          <select
            value=""
            onChange={(e) => {
              const v = e.target.value;
              if (v === "new") onReassign(media.id, "new");
              else if (v) onReassign(media.id, parseInt(v, 10));
              e.target.value = "";
            }}
            className="form__select"
          >
            <option value="">Select person</option>
            {people
              .filter((p) => p.id !== selectedId)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            <option value="new">Create new person</option>
          </select>
        </div>
        <Button variant="danger" onClick={() => onRemove(media.id)}>
          Remove from photo
        </Button>
      </div>
    </div>
  );
}
