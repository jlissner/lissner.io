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

  const overlayStyle = {
    position: "fixed" as const,
    inset: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    zIndex: 1100,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  };

  const modalStyle = {
    background: "#fff",
    borderRadius: 12,
    padding: 24,
    minWidth: 360,
    maxWidth: "100%",
    maxHeight: "90vh",
    overflow: "auto" as const,
    boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
  };

  return (
    <div style={overlayStyle} onClick={handleCancel}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <h2 style={{ margin: "0 0 16px", fontSize: "1.25rem", fontWeight: 600, color: "#1e293b" }}>Upload files</h2>
        {!hasFiles ? (
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            style={{ border: "2px dashed #cbd5e1", borderRadius: 8, padding: "2rem", textAlign: "center", backgroundColor: "#f8fafc", cursor: "pointer" }}
          >
            <input type="file" multiple onChange={handleInputChange} style={{ display: "none" }} id="upload-modal-input" />
            <label htmlFor="upload-modal-input" style={{ cursor: "pointer" }}>
              <span style={{ display: "block", marginBottom: 4 }}>Drop files here or <strong>click to browse</strong></span>
              <span style={{ fontSize: "0.875rem", color: "#64748b" }}>Images, videos, documents</span>
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
