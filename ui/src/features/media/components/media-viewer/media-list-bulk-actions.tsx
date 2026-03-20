import { Button } from "@/components/ui/button";

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
        <Button variant="secondary" size="sm" onClick={onDownload}>
          Download
        </Button>
        {onDelete && (
          <Button variant="danger" size="sm" onClick={onDelete} disabled={deleting}>
            {deleting ? "Deleting…" : "Delete"}
          </Button>
        )}
        {onIndex && (
          <Button variant="secondary" size="sm" onClick={onIndex} disabled={indexing}>
            {indexing ? "Indexing…" : "Index for AI"}
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
