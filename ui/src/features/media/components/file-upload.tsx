import { useCallback, useEffect, useState } from "react";

interface FileUploadProps {
  onUpload: () => void;
  disabled?: boolean;
}

export function FileUpload({ onUpload, disabled }: FileUploadProps) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadFiles = useCallback(
    async (files: FileList | null) => {
      if (!files?.length || disabled || uploading) return;
      setError(null);
      setUploading(true);
      try {
        for (const file of Array.from(files)) {
          const formData = new FormData();
          formData.append("file", file);
          const res = await fetch("/api/media/upload", {
            method: "POST",
            body: formData,
          });
          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.error || `Upload failed: ${file.name}`);
          }
        }
        onUpload();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Upload failed");
      } finally {
        setUploading(false);
      }
    },
    [onUpload, disabled, uploading]
  );

  useEffect(() => {
    const onDragOver = (e: DragEvent) => {
      if (!e.dataTransfer?.types?.includes("Files") || disabled || uploading) return;
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = "copy";
      e.dataTransfer.effectAllowed = "copy";
      setDragging(true);
    };
    const onDrop = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragging(false);
      if (e.dataTransfer?.files?.length && !disabled && !uploading) {
        uploadFiles(e.dataTransfer.files);
      }
    };
    const onDragEnd = () => setDragging(false);
    window.addEventListener("dragover", onDragOver, false);
    window.addEventListener("drop", onDrop, false);
    document.addEventListener("dragleave", onDragEnd, false);
    return () => {
      window.removeEventListener("dragover", onDragOver);
      window.removeEventListener("drop", onDrop);
      document.removeEventListener("dragleave", onDragEnd);
    };
  }, [uploadFiles, disabled, uploading]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      uploadFiles(e.target.files);
      e.target.value = "";
    },
    [uploadFiles]
  );

  return (
    <>
      {dragging && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            backgroundColor: "var(--color-primary-bg)",
            border: "4px dashed var(--color-primary)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "1.25rem",
            fontWeight: 500,
            color: "var(--color-primary)",
            pointerEvents: "none",
          }}
        >
          Drop files anywhere to upload
        </div>
      )}
      <div
        style={{
          border: `2px dashed ${dragging ? "var(--color-primary)" : "var(--color-border-subtle)"}`,
          borderRadius: 8,
          padding: "2rem",
          textAlign: "center",
          backgroundColor: dragging ? "var(--color-primary-bg)" : "var(--color-bg-subtle)",
          cursor: disabled || uploading ? "not-allowed" : "pointer",
          opacity: disabled || uploading ? 0.7 : 1,
        }}
      >
        <input
          type="file"
          multiple
          onChange={handleChange}
          disabled={disabled || uploading}
          style={{ display: "none" }}
          id="file-upload"
        />
        <label htmlFor="file-upload" style={{ cursor: "inherit" }}>
          {uploading ? (
            <span>Uploading…</span>
          ) : (
            <>
              <span style={{ display: "block", marginBottom: 4 }}>
                Drop files here or <strong>click to browse</strong>
              </span>
              <span style={{ fontSize: "0.875rem", color: "var(--color-text-muted)" }}>
                Images, videos, documents
              </span>
            </>
          )}
        </label>
        {error && (
          <p style={{ color: "var(--color-danger)", marginTop: 8, fontSize: "0.875rem" }}>{error}</p>
        )}
      </div>
    </>
  );
}
