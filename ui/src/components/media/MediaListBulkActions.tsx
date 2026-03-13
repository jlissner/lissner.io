interface MediaListBulkActionsProps {
  count: number;
  onDownload: () => void;
  onDelete?: () => void;
  onIndex?: () => void;
  onCancel: () => void;
  deleting: boolean;
  indexing: boolean;
}

export function MediaListBulkActions({
  count,
  onDownload,
  onDelete,
  onIndex,
  onCancel,
  deleting,
  indexing,
}: MediaListBulkActionsProps) {
  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        zIndex: 10,
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "12px 16px",
        marginBottom: 16,
        backgroundColor: "#eef2ff",
        borderRadius: 8,
        flexWrap: "wrap",
      }}
    >
      <span style={{ fontWeight: 500 }}>{count} selected</span>
      <button
        type="button"
        onClick={onDownload}
        style={{
          padding: "6px 12px",
          borderRadius: 6,
          border: "1px solid #c7d2fe",
          background: "#fff",
          cursor: "pointer",
          fontSize: "0.875rem",
        }}
      >
        Download
      </button>
      {onDelete && (
        <button
          type="button"
          onClick={onDelete}
          disabled={deleting}
          style={{
            padding: "6px 12px",
            borderRadius: 6,
            border: "1px solid #fecaca",
            background: "#fff",
            color: "#dc2626",
            cursor: deleting ? "not-allowed" : "pointer",
            fontSize: "0.875rem",
          }}
        >
          {deleting ? "Deleting…" : "Delete"}
        </button>
      )}
      {onIndex && (
        <button
          type="button"
          onClick={onIndex}
          disabled={indexing}
          style={{
            padding: "6px 12px",
            borderRadius: 6,
            border: "1px solid #c7d2fe",
            background: "#fff",
            cursor: indexing ? "not-allowed" : "pointer",
            fontSize: "0.875rem",
          }}
        >
          {indexing ? "Indexing…" : "Index for AI"}
        </button>
      )}
      <button
        type="button"
        onClick={onCancel}
        style={{
          padding: "6px 12px",
          borderRadius: 6,
          border: "none",
          background: "transparent",
          cursor: "pointer",
          fontSize: "0.875rem",
          color: "#64748b",
        }}
      >
        Cancel
      </button>
    </div>
  );
}
