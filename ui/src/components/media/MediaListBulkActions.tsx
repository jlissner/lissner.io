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
    <div className="bulk-actions bulk-actions--sticky">
      <span className="bulk-actions__count">{count} selected</span>
      <div className="bulk-actions__buttons">
        <button type="button" className="btn btn--secondary btn--sm" onClick={onDownload}>
          Download
        </button>
        {onDelete && (
          <button
            type="button"
            className="btn btn--danger btn--sm"
            onClick={onDelete}
            disabled={deleting}
          >
            {deleting ? "Deleting…" : "Delete"}
          </button>
        )}
        {onIndex && (
          <button
            type="button"
            className="btn btn--secondary btn--sm"
            onClick={onIndex}
            disabled={indexing}
          >
            {indexing ? "Indexing…" : "Index for AI"}
          </button>
        )}
        <button type="button" className="btn btn--ghost btn--sm" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}
