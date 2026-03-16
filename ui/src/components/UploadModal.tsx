import { useCallback, useEffect, useState } from "react";
import { UploadModalConfirm } from "./UploadModalConfirm";

interface UploadModalProps {
  onClose: () => void;
  onUploadComplete: () => void;
}

export function UploadModal({ onClose, onUploadComplete }: UploadModalProps) {
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFilesSelected = useCallback((files: FileList | null) => {
    if (!files?.length) return;
    setPendingFiles(Array.from(files));
    setError(null);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      handleFilesSelected(e.dataTransfer?.files ?? null);
    },
    [handleFilesSelected]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleFilesSelected(e.target.files);
      e.target.value = "";
    },
    [handleFilesSelected]
  );

  const handleConfirm = useCallback(async () => {
    if (!pendingFiles.length || uploading) return;
    setError(null);
    setUploading(true);
    try {
      for (const file of pendingFiles) {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/media/upload", { method: "POST", body: formData });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `Upload failed: ${file.name}`);
        }
      }
      onUploadComplete();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }, [pendingFiles, uploading, onUploadComplete, onClose]);

  const handleCancel = useCallback(() => {
    setPendingFiles([]);
    setError(null);
    onClose();
  }, [onClose]);

  const hasFiles = pendingFiles.length > 0;
  const totalBytes = pendingFiles.reduce((sum, f) => sum + f.size, 0);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === "Escape") handleCancel(); };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [handleCancel]);

  return (
    <div className="modal" onClick={handleCancel} role="presentation">
      <div className="modal__content" style={{ minWidth: 360, maxHeight: "90vh", overflow: "auto" }} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="upload-title">
        <h2 id="upload-title" className="modal__title">Upload files</h2>
        {!hasFiles ? (
          <div
            className="upload-zone"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            <input type="file" multiple onChange={handleInputChange} className="u-sr-only" id="upload-modal-input" />
            <label htmlFor="upload-modal-input" style={{ cursor: "pointer" }}>
              <span className="upload-zone__title">Drop files here or <strong>click to browse</strong></span>
              <span className="upload-zone__hint">Images, videos, documents</span>
            </label>
          </div>
        ) : (
          <UploadModalConfirm
            fileCount={pendingFiles.length}
            totalBytes={totalBytes}
            uploading={uploading}
            error={error}
            onChooseDifferent={() => setPendingFiles([])}
            onCancel={handleCancel}
            onConfirm={handleConfirm}
          />
        )}
      </div>
    </div>
  );
}
