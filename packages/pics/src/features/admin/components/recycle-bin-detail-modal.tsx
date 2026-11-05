import type { AdminRecycleBinItem } from "@lissner/shared";
import { prependApiUrl } from "@/api";
import { Button } from "@/components/ui/button";
import {
  ModalActions,
  ModalBody,
  ModalPanel,
  ModalRoot,
  ModalTitle,
} from "@/components/ui/modal";
import { formatBytes } from "../lib/format";

const isVideoMime = (mimeType: string): boolean =>
  mimeType.startsWith("video/");

const isImageMime = (mimeType: string): boolean =>
  mimeType.startsWith("image/");

export function RecycleBinDetailModal({
  item,
  onClose,
  onRestore,
  onPermanentDelete,
}: {
  item: AdminRecycleBinItem;
  onClose: () => void;
  onRestore: () => void;
  onPermanentDelete: () => void;
}) {
  const previewUrl = prependApiUrl(`/media/${item.id}/preview`);
  const downloadUrl = prependApiUrl(`/media/${item.id}`);

  return (
    <ModalRoot onBackdropClick={onClose}>
      <ModalPanel
        className="recycle-detail-modal"
        aria-labelledby="recycle-detail-title"
        onEscape={onClose}
      >
        <ModalTitle id="recycle-detail-title">{item.originalName}</ModalTitle>
        <ModalBody className="recycle-detail-modal__body">
          <div className="recycle-detail-modal__preview">
            {isVideoMime(item.mimeType) ? (
              <video
                className="recycle-detail-modal__media"
                src={previewUrl}
                controls
                playsInline
              />
            ) : isImageMime(item.mimeType) ? (
              <img
                className="recycle-detail-modal__media"
                src={previewUrl}
                alt={item.originalName}
              />
            ) : (
              <p className="admin-page__meta">
                Preview not available for this file type.{" "}
                <a href={downloadUrl} target="_blank" rel="noreferrer">
                  Download
                </a>
              </p>
            )}
          </div>
          <dl className="recycle-detail-modal__meta">
            <div>
              <dt>Type</dt>
              <dd>{item.mimeType}</dd>
            </div>
            <div>
              <dt>Size</dt>
              <dd>{formatBytes(item.size)}</dd>
            </div>
            <div>
              <dt>Uploaded</dt>
              <dd>
                {new Date(item.uploadedAt).toLocaleString(undefined, {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </dd>
            </div>
            <div>
              <dt>Deleted</dt>
              <dd>
                {new Date(item.deletedAt).toLocaleString(undefined, {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </dd>
            </div>
          </dl>
        </ModalBody>
        <ModalActions>
          <Button type="button" variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Button type="button" variant="secondary" onClick={onRestore}>
            Restore
          </Button>
          <Button type="button" variant="danger" onClick={onPermanentDelete}>
            Delete permanently
          </Button>
        </ModalActions>
      </ModalPanel>
    </ModalRoot>
  );
}
