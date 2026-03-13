function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const btnSecondary = {
  padding: "8px 16px",
  fontSize: "0.875rem",
  borderRadius: 8,
  border: "1px solid #e2e8f0",
  background: "#fff",
  color: "#475569",
  cursor: "pointer",
} as const;

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
  const disabled = uploading ? { ...btnSecondary, cursor: "not-allowed" as const } : btnSecondary;
  return (
    <>
      <p style={{ margin: "0 0 16px", fontSize: "0.9375rem", color: "#475569" }}>
        You are about to upload <strong>{fileCount}</strong> {fileCount === 1 ? "file" : "files"} ({formatBytes(totalBytes)} total).
      </p>
      <p style={{ margin: "0 0 20px", fontSize: "0.875rem", color: "#64748b" }}>Would you like to continue?</p>
      {error && <p style={{ color: "#dc2626", marginBottom: 16, fontSize: "0.875rem" }}>{error}</p>}
      <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
        <button type="button" onClick={onChooseDifferent} disabled={uploading} style={disabled}>
          Choose different files
        </button>
        <button type="button" onClick={onCancel} disabled={uploading} style={disabled}>
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={uploading}
          style={{
            padding: "8px 16px",
            fontSize: "0.875rem",
            fontWeight: 500,
            borderRadius: 8,
            border: "none",
            background: "#4f46e5",
            color: "#fff",
            cursor: uploading ? "not-allowed" : "pointer",
          }}
        >
          {uploading ? "Uploading…" : "Continue"}
        </button>
      </div>
    </>
  );
}
