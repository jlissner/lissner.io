import { Button } from "@/components/ui/button";
import { ModalActions } from "@/components/ui/modal";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface UploadModalConfirmProps {
  fileCount: number;
  totalBytes: number;
  uploading: boolean;
  error: string | null;
  onChooseDifferent: () => void;
  onCancel: () => void;
  onConfirm: () => void;
}

export function UploadModalConfirm({
  fileCount,
  totalBytes,
  uploading,
  error,
  onChooseDifferent,
  onCancel,
  onConfirm,
}: UploadModalConfirmProps) {
  return (
    <>
      <p className="modal__body u-mb-4 u-text-muted">
        You are about to upload <strong>{fileCount}</strong> {fileCount === 1 ? "file" : "files"} (
        {formatBytes(totalBytes)} total).
      </p>
      <p className="u-mb-5 u-text-muted u-text-sm">Would you like to continue?</p>
      {error && <p className="u-text-danger u-mb-4 u-text-sm">{error}</p>}
      <ModalActions>
        <Button variant="secondary" onClick={onChooseDifferent} disabled={uploading}>
          Choose different files
        </Button>
        <Button variant="secondary" onClick={onCancel} disabled={uploading}>
          Cancel
        </Button>
        <Button onClick={onConfirm} disabled={uploading}>
          {uploading ? "Uploading…" : "Continue"}
        </Button>
      </ModalActions>
    </>
  );
}
