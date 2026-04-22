import { Button } from "@/components/ui/button";
import { isPixelMotionPhotoBasename } from "@/features/media/components/media-viewer/media-utils";
import { PixelMpOrImageVideoPreview } from "@/features/media/components/media-viewer/pixel-mp-preview";
import { ModalPanel, ModalRoot } from "@/components/ui/modal";
import { PersonSelect } from "./PersonSelect";

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
    <ModalRoot onBackdropClick={onClose} className="viewer-overlay">
      <ModalPanel
        onEscape={onClose}
        aria-label={`People image viewer: ${media.originalName ?? "Media item"}`}
        className="viewer-overlay__panel"
      >
        <div className="viewer-overlay__content">
          {isPixelMotionPhotoBasename(media.originalName ?? "") ? (
            <PixelMpOrImageVideoPreview
              src={`/api/media/${media.id}/preview`}
              alt={media.originalName ?? "Selected photo"}
              className="viewer-overlay__img"
              videoStyle={{ maxWidth: "100%", maxHeight: "85vh" }}
              onImgClick={(e) => e.stopPropagation()}
            />
          ) : (
            <img
              src={`/api/media/${media.id}/preview`}
              alt={media.originalName ?? "Selected photo"}
              className="viewer-overlay__img"
              onClick={(e) => e.stopPropagation()}
            />
          )}
        </div>
        <div
          className="viewer-overlay__actions"
          onClick={(e) => e.stopPropagation()}
        >
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          <div className="u-flex u-items-center u-gap-2">
            <label
              className="u-text-sm u-text-subtle"
              htmlFor="people-image-viewer-reassign-select"
            >
              Reassign to:
            </label>
            <PersonSelect
              id="people-image-viewer-reassign-select"
              people={people}
              excludeIds={[selectedId]}
              placeholder="Select person"
              extraOptions={[{ value: "new", label: "Create new person" }]}
              value=""
              onChange={(e) => {
                const v = e.target.value;
                if (v === "new") onReassign(media.id, "new");
                else if (v) onReassign(media.id, parseInt(v, 10));
                e.target.value = "";
              }}
              className="form__select"
            />
          </div>
          <Button variant="danger" onClick={() => onRemove(media.id)}>
            Remove from photo
          </Button>
        </div>
      </ModalPanel>
    </ModalRoot>
  );
}
